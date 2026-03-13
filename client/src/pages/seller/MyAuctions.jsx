import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const MyAuctions = () => {
  const [products, setProducts] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startForm, setStartForm] = useState({ productId: "", startingBid: "", endTime: "" });
  const [message, setMessage] = useState({ text: "", error: false });
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, pickupRes] = await Promise.all([
        API.get("/product/my-products"),
        API.get("/pickups"),
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (pickupRes.data.success) setPickups(pickupRes.data.pickups);
    } catch (err) {
      console.error(err);
      setError("Failed to load auctions. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const hasCompletedPickup = (productId) =>
    pickups.some((pk) => (pk.productId?._id || pk.productId) === productId && pk.status === "completed");

  const canStartOrRestart = (p) => {
    if (p.isAuction && p.auctionStatus === "active") return false;
    if (p.winnerId) return false;
    if (hasCompletedPickup(p._id)) return false;
    return true;
  };

  const getStatusLabel = (p) => {
    if (!p.isAuction) return { text: "No auction", color: "bg-blue-100 text-blue-700" };
    if (p.auctionStatus === "active") return { text: "Live", color: "bg-green-100 text-green-700" };
    if (hasCompletedPickup(p._id)) return { text: "Pickup Completed", color: "bg-purple-100 text-purple-700" };
    if (p.winnerId) return { text: "Ended (Winner)", color: "bg-amber-100 text-amber-700" };
    return { text: "Ended (No Bids)", color: "bg-gray-100 text-gray-700" };
  };

  const openForm = (productId) => {
    const defaultEnd = new Date(Date.now() + 60 * 60 * 1000);
    setStartForm({ productId, startingBid: "", endTime: defaultEnd.toISOString().slice(0, 16) });
    setMessage({ text: "", error: false });
  };

  const handleStartAuction = async (e) => {
    e.preventDefault();
    setMessage({ text: "", error: false });
    setStarting(true);
    try {
      const { data } = await API.post("/auction/start", {
        productId: startForm.productId,
        startingBid: Number(startForm.startingBid),
        endTime: new Date(startForm.endTime).toISOString(),
      });
      if (data.success) {
        setMessage({ text: "Auction started!", error: false });
        setStartForm({ productId: "", startingBid: "", endTime: "" });
        await fetchData();
      } else {
        setMessage({ text: data.message || "Failed to start auction", error: true });
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || "Failed to start auction", error: true });
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const eligibleProducts = products.filter(canStartOrRestart);
  const activeAuctions = products.filter((p) => p.isAuction && p.auctionStatus === "active");
  const endedAuctions = products.filter((p) => p.isAuction && p.auctionStatus === "ended");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Auctions</h1>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Start auction form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">Start New Auction</h2>
        {message.text && (
          <p className={`text-sm mb-3 ${message.error ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
        )}
        {eligibleProducts.length === 0 ? (
          <p className="text-gray-500 text-sm">No eligible products to auction.</p>
        ) : (
          <form onSubmit={handleStartAuction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={startForm.productId}
                onChange={(e) => openForm(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select a product</option>
                {eligibleProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.auctionStatus === "ended" ? "(restart)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Bid (Rs.)</label>
              <input type="number" required min="1" value={startForm.startingBid}
                onChange={(e) => setStartForm({ ...startForm, startingBid: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auction End Time</label>
              <input type="datetime-local" required value={startForm.endTime}
                onChange={(e) => setStartForm({ ...startForm, endTime: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <button
              type="submit"
              disabled={starting}
              className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {starting ? "Starting..." : "Start Auction"}
            </button>
          </form>
        )}
      </div>

      {/* Active auctions */}
      <h2 className="text-xl font-semibold mb-4">Active Auctions ({activeAuctions.length})</h2>
      {activeAuctions.length === 0 ? (
        <p className="text-gray-500 mb-8">No active auctions.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {activeAuctions.map((p) => (
            <div key={p._id} className="bg-white rounded-lg shadow overflow-hidden">
              <img src={p.image?.[0] || "/placeholder.png"} alt={p.name} className="w-full h-36 object-cover" />
              <div className="p-4">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-indigo-600 font-bold">Current: Rs. {p.offerPrice}</p>
                <p className="text-xs text-gray-500 mt-0.5">Starting bid: Rs. {p.startingBid ?? "—"}</p>
                <p className="text-xs text-gray-400 mt-1">Ends {new Date(p.auctionEndTime).toLocaleString()}</p>
                <div className="flex items-center justify-between mt-3">
                    <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-green-100 text-green-700">Live</span>
                  <Link
                    to={`/seller/auctions/${p._id}`}
                    className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                  >
                    Monitor Live
                  </Link>
                </div>
              </div>
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
          {endedAuctions.map((p) => {
            const label = getStatusLabel(p);
            return (
              <div key={p._id} className="bg-white rounded-lg shadow overflow-hidden">
                <img src={p.image?.[0] || "/placeholder.png"} alt={p.name} className="w-full h-36 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-gray-600">Final: Rs. {p.offerPrice}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${label.color}`}>{label.text}</span>
                    <Link
                      to={`/seller/auctions/${p._id}`}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      View Results
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAuctions;
