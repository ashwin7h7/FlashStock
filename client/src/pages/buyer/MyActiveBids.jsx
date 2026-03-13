import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const MyActiveBids = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyBids = async () => {
      try {
        const { data } = await API.get("/auction/my-bids");
        if (data.success) setItems(data.items);
      } catch (err) {
        console.error("Failed to load my bids:", err);
        setError("Failed to load your bids.");
      } finally {
        setLoading(false);
      }
    };
    fetchMyBids();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  // Determine bid status for each auction
  const getBidStatus = (item) => {
    // Ended
    if (item.auctionStatus === "ended") {
      return { label: "Ended", color: "bg-gray-100 text-gray-700" };
    }
    
    // Still active
    if (new Date(item.auctionEndTime) <= new Date()) {
      return { label: "Ended", color: "bg-gray-100 text-gray-700" };
    }

    // Active: check if user is winning or outbid
    const currentHighest = Number(item.offerPrice) || 0;
    const userBid = Number(item.myHighestBid) || 0;

    if (userBid === currentHighest) {
      // User has the highest bid
      return { label: "Winning", color: "bg-green-100 text-green-700" };
    } else if (userBid < currentHighest) {
      // User has been outbid
      return { label: "Outbid", color: "bg-red-100 text-red-700" };
    }
    
    return { label: "Active", color: "bg-blue-100 text-blue-700" };
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Active Bids</h1>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {items.length === 0 ? (
        <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-lg text-center">
          <p className="text-gray-600 text-lg">You haven't placed any bids yet.</p>
          <Link to="/auctions" className="text-indigo-600 hover:text-indigo-700 font-medium inline-block mt-3">
            Browse Auctions →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const status = getBidStatus(item);
            const isActive = new Date(item.auctionEndTime) > new Date();
            const timeLeft = isActive
              ? new Date(item.auctionEndTime).toLocaleString()
              : `Ended ${new Date(item.auctionEndTime).toLocaleString()}`;

            return (
              <div
                key={item._id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col overflow-hidden border border-gray-100"
              >
                {/* Image */}
                <img
                  src={item.image?.[0] || "/placeholder.png"}
                  alt={item.name}
                  className="w-full h-40 object-cover rounded mb-3"
                />

                {/* Title */}
                <h3 className="font-semibold text-lg mb-2 truncate">{item.name}</h3>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Bid Information */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Highest Bid</p>
                    <p className="font-semibold text-indigo-600">Rs. {item.offerPrice}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Your Bid</p>
                    <p className="font-semibold text-emerald-600">Rs. {item.myHighestBid}</p>
                  </div>
                </div>

                {/* End Time */}
                <p className="text-xs text-gray-400 mb-3">
                  {isActive ? "⏱️ " : "🏁 "}{timeLeft}
                </p>

                {/* View Details Button */}
                <Link
                  to={`/buyer/auctions/${item._id}`}
                  className="mt-auto block text-center bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm transition"
                >
                  View Auction
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyActiveBids;
