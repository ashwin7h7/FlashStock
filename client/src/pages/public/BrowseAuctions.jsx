import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const BrowseAuctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const { data } = await API.get("/auction/active");
        if (data.success) setAuctions(data.auctions);
      } catch (err) {
        console.error("Failed to fetch auctions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  if (loading) return <div className="text-center py-20">Loading auctions...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Active Auctions</h1>
      {auctions.length === 0 ? (
        <p className="text-gray-500">No active auctions right now.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((item) => (
            <Link
              key={item._id}
              to={`/auctions/${item._id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden"
            >
              <img
                src={item.image?.[0] || "/placeholder.png"}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{item.category}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-indigo-600 font-bold">Rs. {item.offerPrice}</span>
                  <span className="text-xs text-gray-400">
                    Ends {new Date(item.auctionEndTime).toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseAuctions;
