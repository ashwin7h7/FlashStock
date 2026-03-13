import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import { getEndedAuctionState } from "../../utils/auctionState";

const MyProducts = () => {
  const [products, setProducts] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auction start state per product
  const [auctionForm, setAuctionForm] = useState(null); // { productId, startingBid, endTime }
  const [auctionMsg, setAuctionMsg] = useState({ text: "", error: false, productId: null });
  const [starting, setStarting] = useState(false);

  const fetchProducts = async () => {
    try {
      const [prodRes, pickupRes] = await Promise.all([
        API.get("/product/my-products"),
        API.get("/pickups"),
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.products);
      else setError(prodRes.data.message || "Failed to load products");
      if (pickupRes.data.success) setPickups(pickupRes.data.pickups);
    } catch (err) {
      console.error("Fetch products error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // Check if a product has a completed pickup
  const hasCompletedPickup = (productId) =>
    pickups.some((pk) => (pk.productId?._id || pk.productId) === productId && pk.status === "completed");

  // Determine auction status label
  const getAuctionLabel = (p) => {
    const { hasAcceptedBids } = getEndedAuctionState(p);
    if (!p.isAuction) return { text: "No auction", color: "bg-blue-100 text-blue-700" };
    if (p.auctionStatus === "active") return { text: "Active", color: "bg-green-100 text-green-700" };
    if (hasCompletedPickup(p._id)) return { text: "Pickup Completed", color: "bg-purple-100 text-purple-700" };
    if (hasAcceptedBids) return { text: "Ended (Winner Selected)", color: "bg-amber-100 text-amber-700" };
    return { text: "Ended (No Bids)", color: "bg-gray-100 text-gray-600" };
  };

  // Restart only if: ended + no winner + no completed pickup
  const canRestart = (p) =>
    p.isAuction &&
    p.auctionStatus === "ended" &&
    !getEndedAuctionState(p).hasAcceptedBids &&
    !hasCompletedPickup(p._id);

  // Start only if: never auctioned
  const canStartNew = (p) => !p.isAuction;

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAuctionForm = (productId) => {
    // Default end time: 1 hour from now, formatted for datetime-local input
    const defaultEnd = new Date(Date.now() + 60 * 60 * 1000);
    const localISO = defaultEnd.toISOString().slice(0, 16);
    setAuctionForm({ productId, startingBid: "", endTime: localISO });
    setAuctionMsg({ text: "", error: false, productId: null });
  };

  const handleStartAuction = async (e) => {
    e.preventDefault();
    if (!auctionForm) return;
    setStarting(true);
    setAuctionMsg({ text: "", error: false, productId: null });
    try {
      const endTimeISO = new Date(auctionForm.endTime).toISOString();
      const { data } = await API.post("/auction/start", {
        productId: auctionForm.productId,
        startingBid: Number(auctionForm.startingBid),
        endTime: endTimeISO,
      });
      if (data.success) {
        setAuctionMsg({ text: "Auction started!", error: false, productId: auctionForm.productId });
        setAuctionForm(null);
        await fetchProducts();
      } else {
        setAuctionMsg({ text: data.message || "Failed to start auction", error: true, productId: auctionForm.productId });
      }
    } catch (err) {
      console.error("Start auction error:", err.response?.data || err.message);
      setAuctionMsg({ text: err.response?.data?.message || "Failed to start auction", error: true, productId: auctionForm.productId });
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Products</h1>
        <Link to="/seller/add-product" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          + Add Product
        </Link>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {products.length === 0 ? (
        <p className="text-gray-500">No products yet. Add your first product!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p._id} className="bg-white rounded-lg shadow overflow-hidden">
              <img src={p.image?.[0] || "/placeholder.png"} alt={p.name} className="w-full h-40 object-cover" />
              <div className="p-4">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-gray-500 text-sm">{p.category}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-indigo-600 font-bold">Rs. {p.price}</p>
                  {p.offerPrice !== p.price && (
                    <p className="text-gray-500 text-sm">Offer: Rs. {p.offerPrice}</p>
                  )}
                </div>

                {/* Auction status */}
                <div className="mt-2">
                  {(() => {
                    const label = getAuctionLabel(p);
                    return <span className={`px-2 py-1 text-xs rounded-full font-medium ${label.color}`}>{label.text}</span>;
                  })()}
                  {p.isAuction && p.auctionStatus === "active" && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-400">
                        Ends: {new Date(p.auctionEndTime).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Current bid: Rs. {p.offerPrice}
                      </p>
                    </div>
                  )}
                </div>

                {/* Start / Restart Auction button */}
                {(canStartNew(p) || canRestart(p)) && (
                  <div className="mt-3">
                    {/* Success/error message persists after form closes */}
                    {auctionMsg.productId === p._id && auctionMsg.text && !auctionForm && (
                      <p className={`text-xs mb-2 ${auctionMsg.error ? "text-red-600" : "text-green-600"}`}>{auctionMsg.text}</p>
                    )}
                    {auctionForm?.productId === p._id ? (
                      <form onSubmit={handleStartAuction} className="space-y-2">
                        {auctionMsg.productId === p._id && auctionMsg.text && (
                          <p className={`text-xs ${auctionMsg.error ? "text-red-600" : "text-green-600"}`}>{auctionMsg.text}</p>
                        )}
                        <input
                          type="number"
                          placeholder="Starting bid (Rs.)"
                          required
                          min="1"
                          value={auctionForm.startingBid}
                          onChange={(e) => setAuctionForm({ ...auctionForm, startingBid: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <div>
                          <label className="text-xs text-gray-500">Auction End Time</label>
                          <input
                            type="datetime-local"
                            required
                            value={auctionForm.endTime}
                            onChange={(e) => setAuctionForm({ ...auctionForm, endTime: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={starting}
                            className="flex-1 bg-green-600 text-white py-1 rounded text-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed">
                            {starting ? "Starting..." : "Start"}
                          </button>
                          <button type="button" onClick={() => setAuctionForm(null)}
                            className="flex-1 bg-gray-200 text-gray-700 py-1 rounded text-sm hover:bg-gray-300">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => openAuctionForm(p._id)}
                        className="w-full bg-green-600 text-white py-1.5 rounded text-sm hover:bg-green-700">
                        {canRestart(p) ? "Restart Auction" : "Start Auction"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProducts;
