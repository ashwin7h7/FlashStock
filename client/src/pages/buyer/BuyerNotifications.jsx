import { useState, useEffect } from "react";
import API from "../../api/axios";

const BuyerNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await API.get("/notifications");
        if (data.success) setNotifications(data.notifications);
      } catch (err) {
        console.error(err);
        setError("Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
      setError("Failed to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const markRead = async (id) => {
    setMarkingId(id);
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error(err);
      setError("Failed to mark notification as read.");
    } finally {
      setMarkingId("");
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-sm text-indigo-600 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {markingAll ? "Marking..." : `Mark all as read (${unreadCount})`}
          </button>
        )}
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">No notifications yet.</div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && markRead(n._id)}
              className={`p-4 rounded-lg shadow cursor-pointer ${n.isRead ? "bg-white" : "bg-indigo-50 border-l-4 border-indigo-500"} ${markingId === n._id ? "opacity-60" : ""}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-gray-600 text-sm mt-1">{n.message}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerNotifications;
