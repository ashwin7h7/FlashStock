import { useState, useEffect } from "react";
import API from "../../api/axios";

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

const SellerPickups = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");

  useEffect(() => {
    const fetchPickups = async () => {
      try {
        const { data } = await API.get("/pickups");
        if (data.success) setPickups(data.pickups);
      } catch (err) {
        console.error(err);
        setError("Failed to load pickups.");
      } finally {
        setLoading(false);
      }
    };
    fetchPickups();
  }, []);

  const markReady = async (pickupId) => {
    setActionId(pickupId);
    try {
      const { data } = await API.patch(`/pickups/${pickupId}/confirm-seller`);
      if (data.success) {
        setPickups((prev) => prev.map((p) => (p._id === pickupId ? { ...p, ...data.pickup } : p)));
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update pickup.");
    } finally {
      setActionId("");
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading pickups...</div>;

  const isCompleted = (p) => p.status === "COMPLETED" || p.status === "completed";
  const isSellerPending = (p) => p.status === "WON_AUCTION" || p.status === "pending";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pickup Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage item handoffs for your sold products</p>
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
                    Buyer: <span className="font-medium text-gray-700">{p.buyerId?.name || "—"}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Seller: <span className="font-medium text-gray-700">You</span>
                  </p>
                  {p.productId?.location && (
                    <p className="text-xs text-indigo-600 mt-0.5">📍 Pickup Area: {p.productId.location}</p>
                  )}
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
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-100 rounded-lg px-4 py-2.5 text-sm font-medium">
                    <span>✅</span>
                    <span>Transaction completed successfully</span>
                  </div>
                ) : isSellerPending(p) ? (
                  <button
                    onClick={() => markReady(p._id)}
                    disabled={actionId === p._id}
                    className="w-full sm:w-auto bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {actionId === p._id ? "Updating..." : "Mark Item Ready for Pickup"}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-full font-medium">
                    ⏳ Waiting for buyer to confirm pickup
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerPickups;
