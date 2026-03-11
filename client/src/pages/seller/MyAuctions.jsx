import { useState, useEffect } from "react";
import API from "../../api/axios";

const MyAuctions = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startForm, setStartForm] = useState({ productId: "", startingBid: "", duration: "60" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await API.get("/product/my-products");
      if (data.success) setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAuction = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const { data } = await API.post("/auction/start", {
        productId: startForm.productId,
        startingBid: Number(startForm.startingBid),
        duration: Number(startForm.duration),
      });
      if (data.success) {
        setMessage("Auction started!");
        await fetchProducts();
        setStartForm({ productId: "", startingBid: "", duration: "60" });
      } else {
        setMessage(data.message || "Failed to start auction");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to start auction");
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const nonAuctionProducts = products.filter((p) => !p.isAuction || p.auctionStatus === "ended");
  const activeAuctions = products.filter((p) => p.auctionStatus === "active");
  const endedAuctions = products.filter((p) => p.auctionStatus === "ended");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Auctions</h1>

      {/* Start auction form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">Start New Auction</h2>
        {message && <p className="text-sm text-indigo-600 mb-3">{message}</p>}
        <form onSubmit={handleStartAuction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={startForm.productId}
              onChange={(e) => setStartForm({ ...startForm, productId: e.target.value })}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select a product</option>
              {nonAuctionProducts.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Starting Bid (Rs.)</label>
            <input type="number" required value={startForm.startingBid}
              onChange={(e) => setStartForm({ ...startForm, startingBid: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input type="number" required value={startForm.duration}
              onChange={(e) => setStartForm({ ...startForm, duration: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
            Start Auction
          </button>
        </form>
      </div>

      {/* Active auctions */}
      <h2 className="text-xl font-semibold mb-4">Active Auctions ({activeAuctions.length})</h2>
      {activeAuctions.length === 0 ? (
        <p className="text-gray-500 mb-8">No active auctions.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {activeAuctions.map((p) => (
            <div key={p._id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-indigo-600 font-bold">Current: Rs. {p.offerPrice}</p>
              <p className="text-xs text-gray-400 mt-1">Ends {new Date(p.auctionEndTime).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ended auctions */}
      <h2 className="text-xl font-semibold mb-4">Ended Auctions ({endedAuctions.length})</h2>
      {endedAuctions.length === 0 ? (
        <p className="text-gray-500">No ended auctions.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {endedAuctions.map((p) => (
            <div key={p._id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-gray-600">Final: Rs. {p.offerPrice}</p>
              <p className="text-xs text-gray-400">Winner: {p.winnerId || "No bids"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAuctions;
