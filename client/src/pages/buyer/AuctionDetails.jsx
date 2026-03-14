import { useState, useEffect, useRef, useEffectEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket } from "../../services/socket";
import { getEndedAuctionState, isAuctionClosedByNegotiation, isAuctionFinalized } from "../../utils/auctionState";
import { startNegotiation } from "../../services/negotiationApi";

const FINAL_STATE_RETRY_DELAY_MS = 2000;
const FINAL_STATE_RETRY_LIMIT = 6;

const AuctionDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState({ text: "", error: false });
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");
  const [ended, setEnded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedImg, setSelectedImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  const [pageError, setPageError] = useState("");
  const [placingBid, setPlacingBid] = useState(false);
  const [startingNegotiation, setStartingNegotiation] = useState(false);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [sellerRating, setSellerRating] = useState(null);

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
    setPageError(nextError);

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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const { resolvedWinnerId, endedWithWinner, endedWithNoBids } = getEndedAuctionState(product, bids);
  const isUserWinner = Boolean(resolvedWinnerId && resolvedWinnerId === user?._id);

  // ───── Fetch seller info + rating when product loads ─────
  useEffect(() => {
    if (!product?.sellerId) return;
    const sid = String(product.sellerId);
    Promise.allSettled([
      API.get(`/user/${sid}/profile`),
      API.get(`/ratings/seller/${sid}`),
    ]).then(([profileRes, ratingRes]) => {
      if (profileRes.status === "fulfilled" && profileRes.value?.data?.success) {
        setSellerInfo(profileRes.value.data.seller);
      }
      if (ratingRes.status === "fulfilled" && ratingRes.value?.data?.success) {
        setSellerRating(ratingRes.value.data.summary);
      }
    });
  }, [product?.sellerId]);

  // ───── Fetch order/pickup info if user won ─────
  useEffect(() => {
    if (!ended || !resolvedWinnerId || resolvedWinnerId !== user?._id) return;

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
  }, [ended, resolvedWinnerId, product?.winnerId, user?._id, id]);

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

    // Backend emits: { auctionId, winnerId, highestBidderId, finalBid, hasAcceptedBids }
    socket.on("auctionEnded", ({ auctionId, winnerId, highestBidderId, finalBid, hasAcceptedBids }) => {
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
      setMessage({
        text:
          resolvedSocketWinnerId === user?._id
            ? "You won this auction!"
            : hasAcceptedBids
              ? "Auction has ended. Final state updated."
              : "Auction ended with no bids.",
        error: false,
      });
      void refreshFinalAuctionState();
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

  const handleIncrement = (increment) => {
    const currentHighest = Number(product?.offerPrice) || 0;
    const typed = Number(bidAmount);
    const base = bidAmount !== "" && typed > 0 ? typed : currentHighest;
    setBidAmount(String(base + increment));
  };

  // ───── Render ─────
  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!product)
    return <div className="text-center py-20 text-gray-500">Auction not found.</div>;

  const loggedInUserId = user?._id ? String(user._id) : "";
  const auctionSellerId = product?.sellerId?._id
    ? String(product.sellerId._id)
    : product?.sellerId
      ? String(product.sellerId)
      : "";
  const isProductSeller = Boolean(loggedInUserId && auctionSellerId && loggedInUserId === auctionSellerId);
  const isSellerPanelMode = location.pathname.startsWith("/seller/");
  const isBuyerPanelMode = !isSellerPanelMode;
  const closedByNegotiationState = isAuctionClosedByNegotiation(product);
  const isAuctionActive = Boolean(product?.isAuction && product?.auctionStatus === "active");
  const isNegotiationAllowed = Boolean(isAuctionActive && !closedByNegotiationState);
  const canNegotiate = Boolean(
    isBuyerPanelMode &&
      user &&
      !isProductSeller &&
      isNegotiationAllowed
  );

  const handleStartNegotiation = async () => {
    if (!canNegotiate) return;

    try {
      setStartingNegotiation(true);
      setMessage({ text: "", error: false });

      const data = await startNegotiation(product._id);
      if (!data.success || !data.negotiation?._id) {
        throw new Error(data.message || "Failed to open negotiation");
      }

      navigate(`/buyer/negotiations/${data.negotiation._id}`);
    } catch (err) {
      setMessage({ text: err.message || "Failed to start negotiation", error: true });
    } finally {
      setStartingNegotiation(false);
    }
  };

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

          {/* ── Seller Info Card ── */}
          {sellerInfo && (
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm mt-5">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center border border-gray-200">
                {sellerInfo.profileImage ? (
                  <img
                    src={sellerInfo.profileImage}
                    alt={sellerInfo.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 text-lg font-bold select-none">
                    {sellerInfo.name?.[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Seller</p>
                <p className="font-semibold text-gray-800 truncate">{sellerInfo.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {sellerRating && sellerRating.totalReviews > 0 ? (
                    <span className="text-sm text-gray-600">
                      ⭐ {sellerRating.avgRating.toFixed(1)}
                      <span className="text-gray-400 ml-1">({sellerRating.totalReviews} review{sellerRating.totalReviews !== 1 ? "s" : ""})</span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      New Seller
                    </span>
                  )}
                  {sellerInfo.location && (
                    <span className="text-sm text-gray-500">📍 {sellerInfo.location}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Bid History ── */}
          <div className="mt-6">
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
                      const diff = now - new Date(bid.createdAt).getTime();
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
          {product.location && (
            <p className="text-sm text-gray-400 mb-3">📍 Seller Location: {product.location} &mdash; Pickup Area: {product.location}</p>
          )}
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
            {closedByNegotiationState ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                Closed by Negotiation
              </span>
            ) : ended ? (
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
            {closedByNegotiationState ? "Closed" : ended ? "Ended" : "Ends"}:{" "}
            {new Date(product.auctionEndTime).toLocaleString()}
          </p>

          {closedByNegotiationState && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
              <p className="text-amber-800 font-semibold">
                This auction has been closed by negotiation.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Final negotiated amount: Rs. {product.offerPrice}
              </p>
            </div>
          )}

          {/* Winner banner */}
          {ended && !closedByNegotiationState && endedWithWinner && isUserWinner && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
              <p className="text-green-700 font-semibold">
                You won this auction!
              </p>
            </div>
          )}

          {ended && !closedByNegotiationState && endedWithWinner && !isUserWinner && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
              <p className="text-blue-700 font-semibold">
                Auction ended. Winning bid: Rs. {product.offerPrice}
              </p>
            </div>
          )}

          {ended && !closedByNegotiationState && endedWithNoBids && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mb-4">
              <p className="text-gray-600 text-sm">Auction ended with no bids.</p>
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
          {!ended && user && !isProductSeller && (
            <form onSubmit={handleBid} className="flex flex-col gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder={`Min bid: Rs. ${(Number(product.offerPrice) || 0) + 1}`}
                value={bidAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v)) setBidAmount(v);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              {/* Quick increment buttons */}
              <div className="flex gap-2">
                {[{ label: "+1K", value: 1000 }, { label: "+5K", value: 5000 }, { label: "+10K", value: 10000 }].map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleIncrement(value)}
                    className="flex-1 border border-indigo-300 text-indigo-600 text-sm font-medium py-1.5 rounded-lg hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={placingBid}
                className="w-full bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
              >
                {placingBid ? "Placing..." : "Place Bid"}
              </button>
            </form>
          )}

          {canNegotiate && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleStartNegotiation}
                disabled={startingNegotiation}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60"
              >
                {startingNegotiation ? "Opening..." : "Make Offer"}
              </button>
            </div>
          )}

          {/* Seller cannot bid */}
          {isProductSeller && !ended && (
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
