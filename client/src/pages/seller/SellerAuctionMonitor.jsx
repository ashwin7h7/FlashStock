import { useState, useEffect, useRef, useEffectEvent } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket } from "../../services/socket";
import { getEndedAuctionState, isAuctionClosedByNegotiation, isAuctionFinalized } from "../../utils/auctionState";

const FINAL_STATE_RETRY_DELAY_MS = 2000;
const FINAL_STATE_RETRY_LIMIT = 6;

const SellerAuctionMonitor = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const finalStateRetryRef = useRef(null);

  const applyAuctionSnapshot = (nextProduct, nextBids) => {
    if (nextProduct) {
      setProduct(nextProduct);
      setEnded(
        isAuctionFinalized(nextProduct) ||
          new Date(nextProduct.auctionEndTime) <= new Date()
      );
    }

    if (nextBids) {
      setBids(nextBids);
    }

    return {
      product: nextProduct ?? product,
      bids: nextBids ?? bids,
    };
  };

  const fetchAuctionSnapshot = useEffectEvent(async () => {
    const [productRes, bidRes] = await Promise.allSettled([
      API.get(`/product/${id}`),
      API.get(`/auction/${id}/bids`),
    ]);

    let nextProduct = null;
    let nextBids = null;
    let nextError = "";

    if (productRes.status === "fulfilled" && productRes.value.data.success) {
      nextProduct = productRes.value.data.product;
    } else if (productRes.status === "rejected") {
      console.error("Failed to load product:", productRes.reason.response?.data || productRes.reason.message);
      nextError = "Failed to load auction details.";
    }

    if (bidRes.status === "fulfilled" && bidRes.value.data.success) {
      nextBids = bidRes.value.data.bids;
    } else if (bidRes.status === "rejected") {
      console.error("Failed to load bid history:", bidRes.reason.response?.data || bidRes.reason.message);
      nextError = nextError || "Failed to load bid history.";
    }

    const snapshot = applyAuctionSnapshot(nextProduct, nextBids);
    setError(nextError);

    return snapshot;
  });

  const clearFinalStateRetry = () => {
    if (finalStateRetryRef.current) {
      window.clearTimeout(finalStateRetryRef.current);
      finalStateRetryRef.current = null;
    }
  };

  const refreshFinalAuctionState = useEffectEvent(async function refreshFinalAuctionStateImpl(attempt = 0) {
    clearFinalStateRetry();

    try {
      const snapshot = await fetchAuctionSnapshot();
      const latestProduct = snapshot.product;

      if (!latestProduct?.isAuction) return;

      const isExpired = latestProduct.auctionEndTime && new Date(latestProduct.auctionEndTime) <= new Date();
      const isBackendFinal = isAuctionFinalized(latestProduct);

      if (!isBackendFinal && isExpired && attempt < FINAL_STATE_RETRY_LIMIT) {
        finalStateRetryRef.current = window.setTimeout(() => {
          void refreshFinalAuctionStateImpl(attempt + 1);
        }, FINAL_STATE_RETRY_DELAY_MS);
      }
    } catch (err) {
      console.error("Failed to refresh final auction state:", err.response?.data || err.message);
    }
  });

  // ───── Fetch product + bid history ─────
  useEffect(() => {
    const fetchData = async () => {
      await fetchAuctionSnapshot();
      setLoading(false);
    };
    fetchData();

    return () => clearFinalStateRetry();
  }, [id]);

  const { endedWithWinner, endedWithNoBids } = getEndedAuctionState(product, bids);

  // ───── Countdown timer ─────
  useEffect(() => {
    if (!product?.auctionEndTime || ended) return;

    const tick = () => {
      const diff = new Date(product.auctionEndTime) - new Date();
      if (diff <= 0) {
        setTimeLeft("Ended");
        setEnded(true);
        void refreshFinalAuctionState();
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        d > 0 ? `${d}d ${h}h ${m}m ${s}s` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [product?.auctionEndTime, ended]);

  // ───── Socket.IO — join room, listen for live updates ─────
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit("joinAuction", id);

    socket.on("bidUpdate", ({ auctionId, amount, bidderId, bidderName }) => {
      if (auctionId !== id) return;
      setProduct((prev) =>
        prev ? { ...prev, offerPrice: amount, highestBidderId: bidderId } : prev
      );
      setBids((prev) => [
        {
          bidderId: { _id: bidderId, name: bidderName || "Anonymous" },
          amount,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    socket.on("auctionEnded", ({ auctionId, winnerId, highestBidderId, finalBid }) => {
      if (auctionId !== id) return;

      const resolvedSocketWinnerId = winnerId || highestBidderId || null;

      setEnded(true);
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              auctionStatus: "ended",
              offerPrice: finalBid ?? prev.offerPrice,
              highestBidderId: resolvedSocketWinnerId ?? prev.highestBidderId,
              winnerId: resolvedSocketWinnerId ?? prev.winnerId,
            }
          : prev
      );
      void refreshFinalAuctionState();
    });

    return () => {
      socket.off("bidUpdate");
      socket.off("auctionEnded");
      disconnectSocket();
    };
  }, [id]);

  // ───── Render ─────
  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!product)
    return <div className="text-center py-20 text-gray-500">Auction not found.</div>;

  const isOwner = user && String(product.sellerId) === String(user._id);
  const closedByNegotiationState = isAuctionClosedByNegotiation(product);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link to="/seller/auctions" className="text-indigo-600 text-sm hover:underline mb-4 inline-block">
        &larr; Back to My Auctions
      </Link>

      <h1 className="text-2xl font-bold mb-6">Auction Monitor</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isOwner && (
        <p className="text-amber-600 bg-amber-50 p-3 rounded-lg mb-4 text-sm">
          This auction does not belong to you.
        </p>
      )}

      {/* ── Product info + live stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Image */}
        <div>
          <img
            src={product.image?.[0] || "/placeholder.png"}
            alt={product.name}
            className="w-full rounded-xl shadow-lg"
          />
          {product.image?.length > 1 && (
            <div className="flex gap-2 mt-3">
              {product.image.slice(1).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${product.name} ${i + 2}`}
                  className="w-16 h-16 rounded object-cover border"
                />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h2 className="text-xl font-bold mb-1">{product.name}</h2>
          <p className="text-sm text-gray-400 mb-2">Category: {product.category}</p>
          <p className="text-gray-600 text-sm mb-4">{product.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Original Price</p>
              <p className="text-lg font-semibold">Rs. {product.price}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Starting Bid</p>
              <p className="text-lg font-semibold">Rs. {product.startingBid ?? "—"}</p>
            </div>
          </div>

          {/* Live highest bid */}
          <div className="bg-indigo-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-500">
              {bids.length === 0 && !ended ? "Starting Bid" : "Current Highest Bid"}
            </p>
            <p className="text-3xl font-bold text-indigo-600">Rs. {product.offerPrice}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Total Bids</p>
              <p className="text-lg font-semibold">{bids.length}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Highest Bidder</p>
              <p className="text-sm font-semibold truncate">
                {bids.length > 0
                  ? bids[0].bidderId?.name || "Anonymous"
                  : "No bids yet"}
              </p>
            </div>
          </div>

          {/* Status badge + countdown */}
          <div className="flex items-center gap-3 mb-4">
            {closedByNegotiationState ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                Closed by Negotiation
              </span>
            ) : ended ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                Ended
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 animate-pulse">
                Live
              </span>
            )}
            {!ended && timeLeft && (
              <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {timeLeft}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400">
            {closedByNegotiationState ? "Closed" : ended ? "Ended" : "Ends"}:{" "}
            {new Date(product.auctionEndTime).toLocaleString()}
          </p>

          {closedByNegotiationState && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-4">
              <p className="text-amber-800 font-semibold text-sm">
                This auction has been closed by negotiation.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Final negotiated amount: Rs. {product.offerPrice}
              </p>
            </div>
          )}

          {/* Winner banner (after ended) */}
          {ended && !closedByNegotiationState && endedWithWinner && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
              <p className="text-green-700 font-semibold text-sm">
                Winner selected — final bid Rs. {product.offerPrice}
              </p>
            </div>
          )}
          {ended && !closedByNegotiationState && endedWithNoBids && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mt-4">
              <p className="text-gray-600 text-sm">
                Auction ended with no bids.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bid History ── */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Bid History ({bids.length} bid{bids.length !== 1 ? "s" : ""})
        </h2>
        {bids.length === 0 ? (
          <p className="text-gray-500">No bids placed yet.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">#</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Bidder</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid, i) => (
                  <tr key={i} className={`border-t ${i === 0 ? "bg-indigo-50" : ""}`}>
                    <td className="px-4 py-3 text-sm text-gray-400">{bids.length - i}</td>
                    <td className="px-4 py-3 text-sm">
                      {bid.bidderId?.name || "Anonymous"}
                    </td>
                    <td className="px-4 py-3 font-semibold">Rs. {bid.amount}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(bid.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerAuctionMonitor;
