import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket } from "../../services/socket";

const AuctionDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState({ text: "", error: false });
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");
  const [ended, setEnded] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [pageError, setPageError] = useState("");
  const [placingBid, setPlacingBid] = useState(false);

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
        setPageError("Failed to load auction details.");
      }

      try {
        const bidRes = await API.get(`/auction/${id}/bids`);
        if (bidRes.data.success) setBids(bidRes.data.bids);
      } catch (err) {
        console.error("Failed to load bid history:", err.response?.data || err.message);
        setPageError((prev) => prev || "Failed to load bid history.");
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  // ───── Fetch order/pickup info if user won ─────
  useEffect(() => {
    if (!ended || !product?.winnerId || product.winnerId !== user?._id) return;

    const fetchOrderInfo = async () => {
      try {
        const { data } = await API.get("/order/my-orders");
        if (data.success) {
          const match = data.orders.find(
            (o) => (o.productId?._id || o.productId) === id
          );
          if (match) setOrderInfo(match);
        }
      } catch (err) {
        console.error("Failed to load order info:", err);
      }
    };
    fetchOrderInfo();
  }, [ended, product?.winnerId, user?._id, id]);

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

  // ───── Socket.IO — join room, listen for updates ─────
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit("joinAuction", id);

    // Backend emits: { auctionId, amount, bidderId, bidderName }
    socket.on("bidUpdate", ({ auctionId, amount, bidderId, bidderName }) => {
      if (auctionId !== id) return;
      setPlacingBid(false);
      setProduct((prev) =>
        prev ? { ...prev, offerPrice: amount, highestBidderId: bidderId } : prev
      );
      setBids((prev) => [
        {
          bidderId: {
            _id: bidderId,
            name: bidderId === user?._id ? "You" : (bidderName || "Anonymous"),
          },
          amount,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setMessage({ text: "", error: false });
    });

    // Backend emits: { auctionId, message }
    socket.on("bidError", ({ message: msg }) => {
      setPlacingBid(false);
      setMessage({ text: msg, error: true });
    });

    // Backend emits: { auctionId, winner, finalBid }
    socket.on("auctionEnded", ({ auctionId, winner, finalBid }) => {
      if (auctionId !== id) return;
      setEnded(true);
      setProduct((prev) =>
        prev
          ? { ...prev, auctionStatus: "ended", offerPrice: finalBid, winnerId: winner }
          : prev
      );
      setMessage({
        text: winner === user?._id ? "You won this auction!" : "Auction has ended.",
        error: false,
      });
    });

    return () => {
      socket.off("bidUpdate");
      socket.off("bidError");
      socket.off("auctionEnded");
      disconnectSocket();
    };
  }, [id, user?._id]);

  // ───── Submit bid ─────
  const handleBid = (e) => {
    e.preventDefault();
    setMessage({ text: "", error: false });

    const socket = socketRef.current;
    if (!socket || !user) return;

    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ text: "Enter a valid bid amount.", error: true });
      return;
    }

    const currentHighest = Number(product.offerPrice) || 0;
    if (amount <= currentHighest) {
      setMessage({ text: `Bid must be higher than Rs. ${currentHighest}`, error: true });
      return;
    }

    socket.emit("placeBid", {
      auctionId: id,
      bidderId: user._id,
      amount,
    });
    setPlacingBid(true);
    setBidAmount("");
  };

  // ───── Render ─────
  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!product)
    return <div className="text-center py-20 text-gray-500">Auction not found.</div>;

  const isSeller = user && String(product.sellerId) === String(user._id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ── Product info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image gallery */}
        <div>
          <img
            src={product.image?.[selectedImg] || product.image?.[0] || "/placeholder.png"}
            alt={product.name}
            className="w-full rounded-xl shadow-lg cursor-pointer hover:opacity-90 transition"
            onClick={() => setLightboxOpen(true)}
          />
          {product.image?.length > 1 && (
            <div className="flex gap-2 mt-3">
              {product.image.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`${product.name} ${i + 1}`}
                  className={`w-16 h-16 rounded object-cover border-2 cursor-pointer transition ${
                    i === selectedImg ? "border-indigo-500 ring-2 ring-indigo-300" : "border-gray-200 hover:border-gray-400"
                  }`}
                  onClick={() => setSelectedImg(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details + bid form */}
        <div>
          {pageError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )}
          <h1 className="text-2xl font-bold mb-1">{product.name}</h1>
          <p className="text-sm text-gray-400 mb-3">Category: {product.category}</p>
          <p className="text-gray-600 mb-4">{product.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Original Price</p>
              <p className="text-lg font-semibold">Rs. {product.price}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Starting Bid</p>
              <p className="text-lg font-semibold">
                Rs. {product.startingBid ?? "—"}
              </p>
            </div>
          </div>

          {/* Current highest bid */}
          <div className="bg-indigo-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-500">
              {bids.length === 0 && !ended ? "Starting Bid" : "Current Highest Bid"}
            </p>
            <p className="text-3xl font-bold text-indigo-600">
              Rs. {product.offerPrice}
            </p>
          </div>

          {/* Status badge + countdown */}
          <div className="flex items-center gap-3 mb-4">
            {ended ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                Auction Ended
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                Live Auction
              </span>
            )}
            {!ended && timeLeft && (
              <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {timeLeft}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            {ended ? "Ended" : "Ends"}:{" "}
            {new Date(product.auctionEndTime).toLocaleString()}
          </p>

          {/* Winner banner */}
          {ended && product.winnerId && product.winnerId === user?._id && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
              <p className="text-green-700 font-semibold">
                You won this auction!
              </p>
            </div>
          )}

          {/* Order / Pickup status — only for the winner */}
          {orderInfo && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-4 space-y-2">
              <h3 className="font-semibold text-sm text-gray-700">Order &amp; Pickup</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">Order Status:</span>
                <span className="font-medium capitalize">{orderInfo.status}</span>
              </div>
              {orderInfo.pickup ? (
                <>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">Pickup Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      orderInfo.pickup.pickupStatus === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {orderInfo.pickup.pickupStatus === "completed" ? "Completed" : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Seller confirmed: {orderInfo.pickup.sellerConfirmed ? "Yes" : "No"}</span>
                    <span>You confirmed: {orderInfo.pickup.buyerConfirmed ? "Yes" : "No"}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400">Pickup info not yet available.</p>
              )}
            </div>
          )}

          {/* Message area */}
          {message.text && (
            <div
              className={`p-3 rounded-lg mb-4 text-sm ${
                message.error
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Bid form — only for logged-in non-seller while auction is live */}
          {!ended && user && !isSeller && (
            <form onSubmit={handleBid} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder={`Min bid: Rs. ${(Number(product.offerPrice) || 0) + 1}`}
                value={bidAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v)) setBidAmount(v);
                }}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                disabled={placingBid}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
              >
                {placingBid ? "Placing..." : "Place Bid"}
              </button>
            </form>
          )}

          {/* Seller cannot bid */}
          {isSeller && !ended && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              You cannot bid on your own auction.
            </p>
          )}

          {/* Not logged in */}
          {!user && !ended && (
            <p className="text-sm text-gray-500">
              <a href="/login" className="text-indigo-600 underline">
                Log in
              </a>{" "}
              to place a bid.
            </p>
          )}
        </div>
      </div>

      {/* ── Bid History ── */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">
          Bid History ({bids.length} bid{bids.length !== 1 ? "s" : ""})
        </h2>
        {bids.length === 0 ? (
          <p className="text-gray-500">No bids yet. Be the first!</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">#</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">
                    Bidder
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid, i) => {
                  const diff = Date.now() - new Date(bid.createdAt).getTime();
                  const secs = Math.floor(diff / 1000);
                  const timeAgo =
                    secs < 60 ? "Just now"
                    : secs < 3600 ? `${Math.floor(secs / 60)}m ago`
                    : secs < 86400 ? `${Math.floor(secs / 3600)}h ago`
                    : new Date(bid.createdAt).toLocaleDateString();

                  return (
                    <tr
                      key={i}
                      className={`border-t ${i === 0 ? "bg-indigo-50" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-400">{bids.length - i}</td>
                      <td className="px-4 py-3 text-sm">
                        {bid.bidderId?._id === user?._id ? (
                          <span className="font-semibold text-indigo-600">You</span>
                        ) : (
                          bid.bidderId?.name || "Anonymous"
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        Rs. {bid.amount}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500" title={new Date(bid.createdAt).toLocaleString()}>
                        {timeAgo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Image Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
            >
              &times;
            </button>
            <img
              src={product.image?.[selectedImg] || product.image?.[0]}
              alt={product.name}
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
            {product.image?.length > 1 && (
              <div className="flex gap-2 mt-3 justify-center">
                {product.image.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    className={`w-14 h-14 rounded object-cover border-2 cursor-pointer ${
                      i === selectedImg ? "border-white ring-2 ring-white" : "border-gray-500 opacity-60 hover:opacity-100"
                    }`}
                    onClick={() => setSelectedImg(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionDetails;
