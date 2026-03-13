import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import { getEndedAuctionState } from "../../utils/auctionState";

const SellerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const fetch = async () => {
      try {
        const [productRes, notificationRes, pickupRes] = await Promise.all([
          API.get("/product/my-products"),
          API.get("/notifications"),
          API.get("/pickups"),
        ]);

        if (productRes.data.success) setProducts(productRes.data.products);
        if (notificationRes.data.success) setNotifications(notificationRes.data.notifications);
        if (pickupRes.data.success) setPickups(pickupRes.data.pickups);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const hasCompletedPickup = (productId) =>
    pickups.some((pk) => (pk.productId?._id || pk.productId) === productId && pk.status === "completed");

  const activeAuctions = products.filter((p) => p.isAuction && p.auctionStatus === "active");
  const endedAuctions = products.filter((p) => p.isAuction && p.auctionStatus === "ended");
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const productsReadyForAuction = products.filter((p) => {
    const { hasAcceptedBids } = getEndedAuctionState(p);
    if (!p.isAuction) return true;
    if (p.auctionStatus === "active") return false;
    if (hasAcceptedBids) return false;
    if (hasCompletedPickup(p._id)) return false;
    return true;
  });

  const pendingPickups = pickups.filter((p) => p.status === "pending");

  const getEndedStatus = (product) => {
    const { hasAcceptedBids } = getEndedAuctionState(product);
    if (hasCompletedPickup(product._id)) {
      return { text: "Pickup Completed", color: "bg-purple-100 text-purple-700" };
    }
    if (hasAcceptedBids) {
      return { text: "Winner Selected", color: "bg-amber-100 text-amber-700" };
    }
    return { text: "Ended (No Bids)", color: "bg-gray-100 text-gray-700" };
  };

  const getTimeRemaining = (endTime) => {
    if (!endTime) return "No end time";
    const diffMs = new Date(endTime).getTime() - now;
    if (diffMs <= 0) return "Ending soon";
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const recentActiveAuctions = [...activeAuctions]
    .sort((a, b) => new Date(a.auctionEndTime) - new Date(b.auctionEndTime))
    .slice(0, 4);

  const recentEndedAuctions = [...endedAuctions]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 4);

  const recentNotifications = [...notifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Seller Dashboard</h1>
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-indigo-600">{products.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Total Products</p>
          <p className="text-xs text-gray-500 mt-1">All listed products</p>
        </div>
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-green-600">{activeAuctions.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Active Auctions</p>
          <p className="text-xs text-gray-500 mt-1">Running right now</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-gray-700">{endedAuctions.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Ended Auctions</p>
          <p className="text-xs text-gray-500 mt-1">Completed rounds</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-orange-600">{unreadNotifications.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Unread Notifications</p>
          <p className="text-xs text-gray-500 mt-1">Needs your attention</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-blue-600">{productsReadyForAuction.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Ready for Auction</p>
          <p className="text-xs text-gray-500 mt-1">Can be started or restarted</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 p-6 rounded-lg shadow-sm">
          <p className="text-3xl font-bold text-teal-600">{pendingPickups.length}</p>
          <p className="text-gray-600 mt-2 font-medium">Pending Pickups</p>
          <p className="text-xs text-gray-500 mt-1">Waiting for confirmations</p>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link to="/seller/add-product" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">➕</p>
            <p className="text-sm font-medium text-gray-700">Add Product</p>
          </Link>
          <Link to="/seller/products" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">📦</p>
            <p className="text-sm font-medium text-gray-700">My Products</p>
          </Link>
          <Link to="/seller/auctions" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">📈</p>
            <p className="text-sm font-medium text-gray-700">My Auctions</p>
          </Link>
          <Link to="/seller/negotiations" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm font-medium text-gray-700">Negotiations</p>
          </Link>
          <Link to="/seller/notifications" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center relative">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm font-medium text-gray-700">Notifications</p>
            {unreadNotifications.length > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadNotifications.length}
              </span>
            )}
          </Link>
          <Link to="/seller/pickups" className="bg-white border border-gray-200 p-4 rounded-lg hover:shadow-md transition text-center">
            <p className="text-2xl mb-2">🚚</p>
            <p className="text-sm font-medium text-gray-700">Pickups</p>
          </Link>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Active Auctions</h2>
            <Link to="/seller/auctions" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View all auctions →
            </Link>
          </div>
          {recentActiveAuctions.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-6 text-sm text-gray-500">
              No active auctions right now. Start one from My Auctions or Add Product.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentActiveAuctions.map((product) => (
                <div key={product._id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{product.name}</h3>
                      <p className="text-sm text-indigo-600 font-semibold mt-1">Current highest: Rs. {product.offerPrice}</p>
                      <p className="text-xs text-gray-500 mt-1">Ends {new Date(product.auctionEndTime).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{getTimeRemaining(product.auctionEndTime)}</p>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">Live</span>
                  </div>
                  <div className="mt-3">
                    <Link
                      to={`/seller/auctions/${product._id}`}
                      className="inline-flex items-center text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
                    >
                      Monitor Auction
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recently Ended Auctions</h2>
            <Link to="/seller/auctions" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View results →
            </Link>
          </div>
          {recentEndedAuctions.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-6 text-sm text-gray-500">
              No ended auctions yet. Ended auctions and outcomes will appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentEndedAuctions.map((product) => {
                const endedStatus = getEndedStatus(product);
                return (
                  <div key={product._id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{product.name}</h3>
                        <p className="text-sm text-gray-700 mt-1">Final bid: Rs. {product.offerPrice}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${endedStatus.color}`}>
                        {endedStatus.text}
                      </span>
                    </div>
                    <div className="mt-3">
                      <Link
                        to={`/seller/auctions/${product._id}`}
                        className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200"
                      >
                        View Auction
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Notifications</h2>
            <Link to="/seller/notifications" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Open notifications →
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-6 text-sm text-gray-500">
              No notifications yet. Updates on bids, winners, and pickups will appear here.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {recentNotifications.map((notification, index) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 ${index !== recentNotifications.length - 1 ? "border-b border-gray-100" : ""} ${notification.isRead ? "bg-white" : "bg-indigo-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                    </div>
                    {!notification.isRead && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Unread</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
