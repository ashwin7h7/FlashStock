import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const BuyerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [activeBids, setActiveBids] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch won auctions
        const ordersRes = await API.get("/order/my-orders");
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.orders);
        }

        // Fetch active bids
        const bidsRes = await API.get("/auction/my-bids");
        if (bidsRes.data.success) {
          setActiveBids(bidsRes.data.items);
        }

        // Fetch notifications
        const notifRes = await API.get("/notifications");
        if (notifRes.data.success) {
          setNotifications(notifRes.data.notifications);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setError("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Buyer Dashboard</h1>
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {/* Active Bids */}
        <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-indigo-600">{activeBids.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Active Bids</p>
          <p className="text-xs text-gray-500 mt-1">Auctions you\'re bidding on</p>
        </div>

        {/* Won Auctions */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-green-600">{orders.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Won Auctions</p>
          <p className="text-xs text-gray-500 mt-1">Auctions you\'ve won</p>
        </div>

        {/* Unread Notifications */}
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-orange-600">{unreadNotifications.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Unread</p>
          <p className="text-xs text-gray-500 mt-1">Notifications</p>
        </div>

        {/* Browse Auctions */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer">
          <p className="text-2xl font-bold text-blue-600">🔍</p>
          <p className="text-gray-600 mt-2 font-medium">Browse All</p>
          <p className="text-xs text-gray-500 mt-1">
            <Link to="/auctions" className="text-blue-600 hover:underline">View Auctions →</Link>
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/auctions" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">🏬</p>
            <p className="text-sm font-medium text-gray-700">Browse Auctions</p>
          </Link>
          <Link to="/buyer/bids" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm font-medium text-gray-700">My Bids</p>
          </Link>
          <Link to="/buyer/won" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">🏆</p>
            <p className="text-sm font-medium text-gray-700">Won Auctions</p>
          </Link>
          <Link to="/buyer/pickups" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">📦</p>
            <p className="text-sm font-medium text-gray-700">Pickups</p>
          </Link>
          <Link to="/buyer/negotiations" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm font-medium text-gray-700">Negotiations</p>
          </Link>
          <Link to="/buyer/notifications" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center relative">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm font-medium text-gray-700">Notifications</p>
            {unreadNotifications.length > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadNotifications.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Recent Won Auctions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Won Auctions</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500 bg-gray-50 p-4 rounded-lg">You haven't won any auctions yet. Start bidding!</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Product</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Winning Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Won Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order._id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium">{order.productId?.name || "N/A"}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">Rs. {order.price}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        order.pickup?.pickupStatus === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {order.pickup?.pickupStatus === "completed" ? "Pickup Done" : "Pending Pickup"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.purchasedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length > 5 && (
              <div className="px-4 py-3 text-center border-t">
                <Link to="/buyer/won" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">View All Won Auctions →</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
