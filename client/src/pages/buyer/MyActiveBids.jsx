import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const MyActiveBids = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBids = async () => {
      try {
        const { data } = await API.get("/auction/my-bids");
        if (data.success) setItems(data.items);
      } catch (err) {
        console.error("Failed to load my bids:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyBids();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const statusBadge = (item) => {
    if (item.auctionStatus === "active" && new Date(item.auctionEndTime) > new Date()) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Live</span>;
    }
    if (item.winnerId) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Won</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Ended</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Bids</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">You haven't placed any bids yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col"
            >
              <img
                src={item.image?.[0] || "/placeholder.png"}
                alt={item.name}
                className="w-full h-40 object-cover rounded mb-3"
              />
              <h3 className="font-semibold text-lg">{item.name}</h3>

              <div className="flex items-center gap-2 mt-2">
                {statusBadge(item)}
                <span className="text-xs text-gray-400">
                  {item.auctionStatus === "active" && new Date(item.auctionEndTime) > new Date()
                    ? `Ends ${new Date(item.auctionEndTime).toLocaleString()}`
                    : `Ended ${new Date(item.auctionEndTime).toLocaleString()}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Highest Bid</p>
                  <p className="font-semibold text-indigo-600">Rs. {item.offerPrice}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-500">Your Highest</p>
                  <p className="font-semibold text-emerald-600">Rs. {item.myHighestBid}</p>
                </div>
              </div>

              <Link
                to={`/buyer/auctions/${item._id}`}
                className="mt-auto pt-3 block text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyActiveBids;
