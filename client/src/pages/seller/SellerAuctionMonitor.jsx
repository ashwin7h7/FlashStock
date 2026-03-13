import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket } from "../../services/socket";

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

  // ───── Fetch product + bid history ─────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRes = await API.get(`/product/${id}`);
        if (productRes.data.success) {
          const p = productRes.data.product;
          setProduct(p);
          setEnded(
            !p.isAuction ||
            p.auctionStatus === "ended" ||
            new Date(p.auctionEndTime) <= new Date()
          );
        }
      } catch (err) {
        console.error("Failed to load product:", err.response?.data || err.message);
        setError("Failed to load auction details.");
      }

      try {
        const bidRes = await API.get(`/auction/${id}/bids`);
        if (bidRes.data.success) setBids(bidRes.data.bids);
      } catch (err) {
        console.error("Failed to load bid history:", err.response?.data || err.message);
        setError((prev) => prev || "Failed to load bid history.");
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  // ───── Countdown timer ─────
  useEffect(() => {
    if (!product?.auctionEndTime || ended) return;

    const tick = () => {
      const diff = new Date(product.auctionEndTime) - new Date();
      if (diff <= 0) {
        setTimeLeft("Ended");
        setEnded(true);
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

    socket.on("auctionEnded", ({ auctionId, winner, finalBid }) => {
      if (auctionId !== id) return;
      setEnded(true);
      setProduct((prev) =>
        prev
          ? { ...prev, auctionStatus: "ended", offerPrice: finalBid, winnerId: winner }
          : prev
      );
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
            {ended ? (
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
            {ended ? "Ended" : "Ends"}:{" "}
            {new Date(product.auctionEndTime).toLocaleString()}
          </p>

          {/* Winner banner (after ended) */}
          {ended && product.winnerId && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
              <p className="text-green-700 font-semibold text-sm">
                Winner selected — final bid Rs. {product.offerPrice}
              </p>
            </div>
          )}
          {ended && !product.winnerId && (
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
