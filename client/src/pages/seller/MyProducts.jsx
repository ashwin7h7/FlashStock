import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const MyProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auction start state per product
  const [auctionForm, setAuctionForm] = useState(null); // { productId, startingBid, duration }
  const [auctionMsg, setAuctionMsg] = useState({ text: "", error: false });
  const [starting, setStarting] = useState(false);

  const fetchProducts = async () => {
    try {
      const { data } = await API.get("/product/my-products");
      if (data.success) setProducts(data.products);
      else setError(data.message || "Failed to load products");
    } catch (err) {
      console.error("Fetch products error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAuctionForm = (productId) => {
    setAuctionForm({ productId, startingBid: "", duration: "60" });
    setAuctionMsg({ text: "", error: false });
  };

  const handleStartAuction = async (e) => {
    e.preventDefault();
    if (!auctionForm) return;
    setStarting(true);
    setAuctionMsg({ text: "", error: false });
    try {
      const endTime = new Date(Date.now() + Number(auctionForm.duration) * 60 * 1000).toISOString();
      const { data } = await API.post("/auction/start", {
        productId: auctionForm.productId,
        startingBid: Number(auctionForm.startingBid),
        endTime,
      });
      if (data.success) {
        setAuctionMsg({ text: "Auction started!", error: false });
        setAuctionForm(null);
        await fetchProducts();
      } else {
        setAuctionMsg({ text: data.message || "Failed to start auction", error: true });
      }
    } catch (err) {
      console.error("Start auction error:", err.response?.data || err.message);
      setAuctionMsg({ text: err.response?.data?.message || "Failed to start auction", error: true });
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
                  {p.isAuction && p.auctionStatus === "active" ? (
                    <div>
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Auction: active</span>
                      <p className="text-xs text-gray-400 mt-1">
                        Ends: {new Date(p.auctionEndTime).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Current bid: Rs. {p.offerPrice}
                      </p>
                    </div>
                  ) : p.isAuction && p.auctionStatus === "ended" ? (
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Auction: ended</span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">No auction</span>
                  )}
                </div>

                {/* Start Auction button — only for non-auction products */}
                {!p.isAuction && (
                  <div className="mt-3">
                    {auctionForm?.productId === p._id ? (
                      <form onSubmit={handleStartAuction} className="space-y-2">
                        {auctionMsg.text && (
                          <p className={`text-xs ${auctionMsg.error ? "text-red-600" : "text-green-600"}`}>{auctionMsg.text}</p>
                        )}
                        <input
                          type="number"
                          placeholder="Starting bid (Rs.)"
                          required
                          value={auctionForm.startingBid}
                          onChange={(e) => setAuctionForm({ ...auctionForm, startingBid: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Duration (minutes)"
                          required
                          value={auctionForm.duration}
                          onChange={(e) => setAuctionForm({ ...auctionForm, duration: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={starting}
                            className="flex-1 bg-green-600 text-white py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50">
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
                        Start Auction
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
