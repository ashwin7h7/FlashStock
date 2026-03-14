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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
      {/* ── Product info ── */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:gap-8 xl:gap-10">
        {/* Image gallery */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_34px_rgba(15,23,42,0.08)] sm:p-4">
            <div
              className="flex h-[18rem] w-full cursor-pointer items-center justify-center rounded-xl bg-slate-50 shadow-sm sm:h-[22rem]"
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={product.image?.[selectedImg] || product.image?.[0] || "/placeholder.png"}
                alt={product.name}
                className="max-h-full max-w-full rounded-xl object-contain transition duration-300 hover:opacity-95"
              />
            </div>
            {product.image?.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-2.5 sm:gap-3">
                {product.image.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    className={`h-14 w-full rounded-lg border-2 object-cover transition duration-200 sm:h-16 ${
                      i === selectedImg
                        ? "border-indigo-500 ring-2 ring-indigo-200"
                        : "border-slate-200 hover:-translate-y-0.5 hover:border-slate-300"
                    }`}
                    onClick={() => setSelectedImg(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Seller Info Card ── */}
          {sellerInfo && (
            <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)] sm:p-5">
              <div className="flex items-center gap-3.5 sm:gap-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm sm:h-14 sm:w-14">
                  {sellerInfo.profileImage ? (
                    <img
                      src={sellerInfo.profileImage}
                      alt={sellerInfo.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="select-none text-lg font-bold text-slate-500 sm:text-xl">
                      {sellerInfo.name?.[0]?.toUpperCase() || "S"}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Seller</p>
                  <p className="truncate text-base font-semibold text-slate-800 sm:text-lg">{sellerInfo.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {sellerRating && sellerRating.totalReviews > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-medium text-amber-700">
                        ⭐ {sellerRating.avgRating.toFixed(1)}
                        <span className="ml-1 text-amber-600/80">({sellerRating.totalReviews} review{sellerRating.totalReviews !== 1 ? "s" : ""})</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                        New Seller
                      </span>
                    )}
                    {sellerInfo.location && (
                      <span className="text-sm text-slate-500">📍 {sellerInfo.location}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Bid History ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.07)] sm:p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 sm:text-xl">
              Bid History
              <span className="ml-2 text-sm font-medium text-slate-500">({bids.length} bid{bids.length !== 1 ? "s" : ""})</span>
            </h2>
            {bids.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center">
                <p className="text-sm text-slate-500">No bids yet. Be the first bidder on this item.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="max-h-[22rem] overflow-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-50/95 backdrop-blur">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Bidder</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
                            className={`transition-colors hover:bg-slate-50 ${i === 0 ? "bg-indigo-50/70" : "bg-white"}`}
                          >
                            <td className="px-4 py-3 text-sm text-slate-400">{bids.length - i}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {bid.bidderId?._id === user?._id ? (
                                <span className="font-semibold text-indigo-600">You</span>
                              ) : (
                                bid.bidderId?.name || "Anonymous"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">Rs. {bid.amount}</td>
                            <td className="px-4 py-3 text-sm text-slate-500" title={new Date(bid.createdAt).toLocaleString()}>
                              {timeAgo}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details + bid form */}
        <div className="space-y-5 lg:col-span-7">
          {pageError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {pageError}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-6">
            <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{product.name}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Category: {product.category}</p>
            {product.location && (
              <p className="mt-2 text-sm text-slate-500">📍 Seller Location: {product.location} &mdash; Pickup Area: {product.location}</p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">{product.description}</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Original Price</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">Rs. {product.price}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Starting Bid</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">Rs. {product.startingBid ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/50 p-5 shadow-[0_16px_34px_rgba(79,70,229,0.14)] sm:p-6">
            {/* Current highest bid */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 sm:p-5">
              <p className="text-sm font-medium text-slate-500">
                {bids.length === 0 && !ended ? "Starting Bid" : "Current Highest Bid"}
              </p>
              <p className="mt-1 text-3xl font-bold text-indigo-600 sm:text-4xl">Rs. {product.offerPrice}</p>
            </div>

            {/* Status badge + countdown */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3">
              {closedByNegotiationState ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                  Closed by Negotiation
                </span>
              ) : ended ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                  Auction Ended
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Live Auction
                </span>
              )}
              {!ended && timeLeft && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-mono text-slate-600">
                  {timeLeft}
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {closedByNegotiationState ? "Closed" : ended ? "Ended" : "Ends"}:{" "}
              {new Date(product.auctionEndTime).toLocaleString()}
            </p>

            {closedByNegotiationState && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="font-semibold text-amber-800">
                  This auction has been closed by negotiation.
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Final negotiated amount: Rs. {product.offerPrice}
                </p>
              </div>
            )}

            {/* Winner banner */}
            {ended && !closedByNegotiationState && endedWithWinner && isUserWinner && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3.5">
                <p className="font-semibold text-green-700">
                  You won this auction!
                </p>
              </div>
            )}

            {ended && !closedByNegotiationState && endedWithWinner && !isUserWinner && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3.5">
                <p className="font-semibold text-blue-700">
                  Auction ended. Winning bid: Rs. {product.offerPrice}
                </p>
              </div>
            )}

            {ended && !closedByNegotiationState && endedWithNoBids && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-sm text-slate-600">Auction ended with no bids.</p>
              </div>
            )}

            {/* Order / Pickup status — only for the winner */}
            {orderInfo && (
              <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-700">Order &amp; Pickup</h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">Order Status:</span>
                  <span className="font-medium capitalize">{orderInfo.status}</span>
                </div>
                {orderInfo.pickup ? (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-500">Pickup Status:</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        orderInfo.pickup.pickupStatus === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {orderInfo.pickup.pickupStatus === "completed" ? "Completed" : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Seller confirmed: {orderInfo.pickup.sellerConfirmed ? "Yes" : "No"}</span>
                      <span>You confirmed: {orderInfo.pickup.buyerConfirmed ? "Yes" : "No"}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Pickup info not yet available.</p>
                )}
              </div>
            )}

            {/* Message area */}
            {message.text && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  message.error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Bid form — only for logged-in non-seller while auction is live */}
            {!ended && user && !isProductSeller && (
              <form onSubmit={handleBid} className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={`Min bid: Rs. ${(Number(product.offerPrice) || 0) + 1}`}
                  value={bidAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d+$/.test(v)) setBidAmount(v);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm transition duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                {/* Quick increment buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: "+1K", value: 1000 }, { label: "+5K", value: 5000 }, { label: "+10K", value: 10000 }].map(({ label, value }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleIncrement(value)}
                      className="rounded-lg border border-indigo-300 bg-white py-2 text-sm font-semibold text-indigo-600 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-50 active:bg-indigo-100"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={placingBid}
                  className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.26)] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
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
                  className="w-full rounded-xl border border-indigo-300 bg-white px-6 py-3 font-semibold text-indigo-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {startingNegotiation ? "Opening..." : "Make Offer"}
                </button>
              </div>
            )}

            {/* Seller cannot bid */}
            {isProductSeller && !ended && (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-600">
                You cannot bid on your own auction.
              </p>
            )}

            {/* Not logged in */}
            {!user && !ended && (
              <p className="mt-4 text-sm text-slate-500">
                <a href="/login" className="font-medium text-indigo-600 underline">
                  Log in
                </a>{" "}
                to place a bid.
              </p>
            )}
          </div>
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
