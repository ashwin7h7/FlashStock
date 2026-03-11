import { useState, useEffect } from "react";
import API from "../../api/axios";

const MyActiveBids = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await API.get("/auction/active");
        if (data.success) setAuctions(data.auctions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Active Auctions</h1>
      {auctions.length === 0 ? (
        <p className="text-gray-500">No active auctions at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((item) => (
            <a
              key={item._id}
              href={`/auctions/${item._id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition p-4 block"
            >
              <img src={item.image?.[0] || "/placeholder.png"} alt={item.name} className="w-full h-40 object-cover rounded mb-3" />
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-indigo-600 font-bold mt-1">Rs. {item.offerPrice}</p>
              <p className="text-xs text-gray-400 mt-1">
                Ends {new Date(item.auctionEndTime).toLocaleString()}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyActiveBids;
