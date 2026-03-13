import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getMyNegotiations,
  getNegotiationMessages,
} from "../../services/negotiationApi";

const statusBadgeClass = {
  open: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  closed: "bg-gray-100 text-gray-700",
};

const BuyerNegotiations = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNegotiations = async () => {
      try {
        setLoading(true);
        setError("");

        const listRes = await getMyNegotiations();
        if (!listRes.success) {
          throw new Error(listRes.message || "Failed to load negotiations");
        }

        const buyerNegotiations = (listRes.negotiations || []).filter(
          (n) => String(n.buyerId?._id || n.buyerId) === String(user?._id || "")
        );

        const withLastMessage = await Promise.all(
          buyerNegotiations.map(async (n) => {
            try {
              const msgRes = await getNegotiationMessages(n._id);
              const messages = msgRes.messages || [];
              const lastMessage = messages[messages.length - 1] || null;
              return { ...n, lastMessage };
            } catch {
              return { ...n, lastMessage: null };
            }
          })
        );

        setItems(withLastMessage);
      } catch (err) {
        setError(err.message || "Failed to load negotiations");
      } finally {
        setLoading(false);
      }
    };

    fetchNegotiations();
  }, [user?._id]);

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, [items]);

  if (loading) return <div className="text-center py-16">Loading negotiations...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Negotiations</h1>
        <Link
          to="/auctions"
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
        >
          Browse Auctions
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-500">
          No negotiations yet. Open an auction and click Make Offer to start one.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const sellerName = item.sellerId?.name || "Seller";
            const preview = item.lastMessage
              ? item.lastMessage.messageType === "offer"
                ? `Offer: Rs. ${item.lastMessage.offerAmount}`
                : item.lastMessage.message || "System update"
              : "No messages yet";

            return (
              <div
                key={item._id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-800 truncate">{item.productId?.name || "Product"}</h2>
                  <p className="text-sm text-gray-500 mt-1">Seller: {sellerName}</p>
                  <p className="text-sm text-gray-600 mt-2 truncate">{preview}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Updated {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass[item.status] || statusBadgeClass.closed}`}
                  >
                    {item.status}
                  </span>
                  <Link
                    to={`/buyer/negotiations/${item._id}`}
                    className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
                  >
                    Open Chat
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BuyerNegotiations;
