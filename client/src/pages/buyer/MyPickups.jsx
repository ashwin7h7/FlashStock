import { useState, useEffect } from "react";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const STAGES = [
  { key: "WON_AUCTION", label: "Won Auction" },
  { key: "READY_FOR_PICKUP", label: "Ready for Pickup" },
  { key: "PICKUP_CONFIRMED", label: "Pickup Confirmed" },
  { key: "COMPLETED", label: "Completed" },
];

const getStageIndex = (status) => {
  if (status === "COMPLETED" || status === "completed") return 3;
  if (status === "PICKUP_CONFIRMED") return 2;
  if (status === "READY_FOR_PICKUP") return 1;
  return 0;
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

const StatusTracker = ({ status }) => {
  const current = getStageIndex(status);
  return (
    <div className="flex items-start w-full mt-3 mb-1">
      {STAGES.map((stage, i) => (
        <div key={stage.key} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                ${i <= current ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-400"}`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`text-xs mt-1.5 text-center leading-tight max-w-[64px] ${i <= current ? "text-indigo-700 font-medium" : "text-gray-400"}`}>
              {stage.label}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < current ? "bg-indigo-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
};

const MyPickups = () => {
  const { user } = useAuth();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [submittingRatingId, setSubmittingRatingId] = useState("");
  const [ratingsByPickup, setRatingsByPickup] = useState({});
  const [ratingDrafts, setRatingDrafts] = useState({});

  useEffect(() => {
    const fetchPickups = async () => {
      try {
        const [pickupRes, ratingRes] = await Promise.all([
          API.get("/pickups?role=buyer"),
          API.get("/ratings/mine"),
        ]);

        if (pickupRes.data.success) setPickups(pickupRes.data.pickups);

        if (ratingRes.data.success) {
          const ratingMap = {};
          for (const r of ratingRes.data.ratings || []) {
            ratingMap[r.pickupId] = r;
          }
          setRatingsByPickup(ratingMap);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load pickups.");
      } finally {
        setLoading(false);
      }
    };
    fetchPickups();
  }, []);

  const confirmPickup = async (pickupId) => {
    setActionId(pickupId);
    try {
      const { data } = await API.patch(`/pickups/${pickupId}/confirm-buyer`);
      if (data.success) {
        setPickups((prev) => prev.map((p) => (p._id === pickupId ? { ...p, ...data.pickup } : p)));
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to confirm pickup.");
    } finally {
      setActionId("");
    }
  };

  const setRatingValue = (pickupId, rating) => {
    setRatingDrafts((prev) => ({
      ...prev,
      [pickupId]: {
        rating,
        comment: prev[pickupId]?.comment || "",
      },
    }));
  };

  const setRatingComment = (pickupId, comment) => {
    setRatingDrafts((prev) => ({
      ...prev,
      [pickupId]: {
        rating: prev[pickupId]?.rating || 0,
        comment,
      },
    }));
  };

  const submitRating = async (pickupId) => {
    const pickup = pickups.find((item) => item._id === pickupId);
    const sellerId = pickup?.sellerId?._id || pickup?.sellerId;
    const buyerId = pickup?.buyerId?._id || pickup?.buyerId;
    const isSelfRating =
      (sellerId && buyerId && String(sellerId) === String(buyerId)) ||
      (sellerId && user?._id && String(sellerId) === String(user._id));

      if (isSelfRating) {
        setError("You cannot rate your own account (self-rating prevention: buyerId === sellerId).");
      return;
    }

    const draft = ratingDrafts[pickupId] || { rating: 0, comment: "" };
    if (!draft.rating) {
      setError("Please select a star rating before submitting.");
      return;
    }

    setSubmittingRatingId(pickupId);
    setError("");
    try {
      const { data } = await API.post("/ratings", {
        pickupId,
        rating: draft.rating,
        comment: draft.comment,
      });

      if (data.success) {
        setRatingsByPickup((prev) => ({
          ...prev,
          [pickupId]: data.rating,
        }));
        setRatingDrafts((prev) => {
          const next = { ...prev };
          delete next[pickupId];
          return next;
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit rating.");
    } finally {
      setSubmittingRatingId("");
    }
  };

  const renderStars = (value = 0) => "★★★★★".split("").map((star, idx) => (
    <span key={`${star}-${idx}`} className={idx < value ? "text-amber-500" : "text-gray-300"}>{star}</span>
  ));

  if (loading) return <div className="text-center py-20 text-gray-500">Loading pickups...</div>;

  const isCompleted = (p) => p.status === "COMPLETED" || p.status === "completed";
  const canConfirm = (p) => p.status === "READY_FOR_PICKUP" && p.buyerConfirmed !== true;
  const shouldShowWaitingForSeller = (p) => p.status === "WON_AUCTION" || p.status === "pending" || !p.sellerConfirmed;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Pickups</h1>
        <p className="text-sm text-gray-500 mt-1">Track and confirm the pickup of your won items</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {pickups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          No pickups yet.
        </div>
      ) : (
        <div className="space-y-5">
          {pickups.map((p) => (
            <div key={p._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {(() => {
                const sellerId = p.sellerId?._id || p.sellerId;
                const buyerId = p.buyerId?._id || p.buyerId;
                const isSelfRatingPickup =
                  (sellerId && buyerId && String(sellerId) === String(buyerId)) ||
                  (sellerId && user?._id && String(sellerId) === String(user._id));
                const sellerPhone = p.sellerId?.phone?.trim() || "Phone not added yet";
                const sellerLocation = p.sellerId?.location?.trim() || p.productId?.location || "Not added yet";
                return (
                  <>
              {/* Card Header */}
              <div className="flex items-center gap-4 p-5 border-b border-gray-50">
                {p.productId?.image ? (
                  <img
                    src={p.productId.image}
                    alt={p.productId?.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-2xl">
                    📦
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.productId?.name || "Product"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Seller: <span className="font-medium text-gray-700">{p.sellerId?.name || "—"}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Buyer: <span className="font-medium text-gray-700">You</span>
                  </p>
                  {p.productId?.location && (
                    <p className="text-xs text-indigo-600 mt-0.5">📍 Pickup Area: {p.productId.location}</p>
                  )}
                </div>
              </div>

              <div className="px-5 pt-3 pb-2 border-b border-gray-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Seller Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{p.sellerId?.name || "Seller"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 break-words">{p.sellerId?.email || "Not added yet"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{sellerPhone}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-[11px] text-gray-500">District / Location</p>
                    <p className="text-sm font-medium text-gray-900">{sellerLocation}</p>
                  </div>
                </div>
              </div>

              {/* Status Tracker */}
              <div className="px-5 pt-3 pb-2">
                <StatusTracker status={p.status} />
              </div>

              {/* Timestamps */}
              {(p.readyAt || p.completedAt) && (
                <div className="px-5 pb-2 space-y-1">
                  {p.readyAt && (
                    <p className="text-xs text-gray-400">
                      📅 Ready at: <span className="text-gray-600">{formatDate(p.readyAt)}</span>
                    </p>
                  )}
                  {p.completedAt && (
                    <p className="text-xs text-gray-400">
                      ✅ Completed at: <span className="text-gray-600">{formatDate(p.completedAt)}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Action Area */}
              <div className="px-5 py-4 border-t border-gray-50">
                {isCompleted(p) ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 text-sm font-medium">
                      <span>✅</span>
                      <span>Transaction completed successfully</span>
                    </div>

                    {ratingsByPickup[p._id] ? (
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                        <p className="text-sm font-semibold text-indigo-700">Thank you for your feedback</p>
                        <div className="mt-1 text-base tracking-wide" aria-label="Your submitted rating">
                          {renderStars(ratingsByPickup[p._id].rating)}
                        </div>
                        {ratingsByPickup[p._id].comment && (
                          <p className="text-xs text-gray-600 mt-1">"{ratingsByPickup[p._id].comment}"</p>
                        )}
                      </div>
                    ) : isSelfRatingPickup ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-amber-800">You cannot rate your own account.</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 p-3">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Rate your seller</p>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((val) => {
                            const selected = (ratingDrafts[p._id]?.rating || 0) >= val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setRatingValue(p._id, val)}
                                className={`text-2xl leading-none ${selected ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}
                                aria-label={`Rate ${val} star${val > 1 ? "s" : ""}`}
                              >
                                ★
                              </button>
                            );
                          })}
                        </div>
                        <textarea
                          value={ratingDrafts[p._id]?.comment || ""}
                          onChange={(e) => setRatingComment(p._id, e.target.value)}
                          placeholder="Optional comment"
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => submitRating(p._id)}
                          disabled={submittingRatingId === p._id}
                          className="mt-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {submittingRatingId === p._id ? "Submitting..." : "Submit Rating"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : canConfirm(p) ? (
                  <button
                    onClick={() => confirmPickup(p._id)}
                    disabled={actionId === p._id}
                    className="w-full sm:w-auto bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {actionId === p._id ? "Confirming..." : "Confirm Pickup"}
                  </button>
                ) : shouldShowWaitingForSeller(p) ? (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
                    ⏳ Waiting for seller to mark item as ready.
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
                    Pickup already confirmed.
                  </span>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPickups;
