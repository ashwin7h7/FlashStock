import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import { getEndedAuctionState } from "../../utils/auctionState";

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
        API.get("/pickups?role=seller"),
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
    const { hasAcceptedBids } = getEndedAuctionState(p);
    if (p.isAuction && p.auctionStatus === "active") return false;
    if (hasAcceptedBids) return false;
    if (hasCompletedPickup(p._id)) return false;
    return true;
  };

  const getStatusLabel = (p) => {
    const { hasAcceptedBids } = getEndedAuctionState(p);
    if (!p.isAuction) return { text: "No auction", color: "bg-blue-100 text-blue-700" };
    if (p.auctionStatus === "active") return { text: "Live", color: "bg-green-100 text-green-700" };
    if (hasCompletedPickup(p._id)) return { text: "Pickup Completed", color: "bg-purple-100 text-purple-700" };
    if (hasAcceptedBids) return { text: "Ended (Winner)", color: "bg-amber-100 text-amber-700" };
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
    <div className="space-y-8">
      {/* ── Page heading ── */}
      <div>
        <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">My Auctions</h1>
        <p className="mt-1.5 text-sm text-slate-500">Start and manage your product auctions.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Start New Auction form ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.09)] sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">Start New Auction</h2>
          <p className="mt-1 text-sm text-slate-500">Select an eligible product and configure auction settings.</p>
        </div>

        {message.text && (
          <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${message.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {message.text}
          </div>
        )}

        {eligibleProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
            <p className="text-sm text-slate-500">No eligible products available to auction.</p>
          </div>
        ) : (
          <form onSubmit={handleStartAuction} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Product</label>
              <select
                value={startForm.productId}
                onChange={(e) => openForm(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Select a product</option>
                {eligibleProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.auctionStatus === "ended" ? "(restart)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Starting Bid (Rs.)</label>
                <input
                  type="number" required min="1" value={startForm.startingBid}
                  onChange={(e) => setStartForm({ ...startForm, startingBid: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Auction End Time</label>
                <input
                  type="datetime-local" required value={startForm.endTime}
                  onChange={(e) => setStartForm({ ...startForm, endTime: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={starting}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.26)] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? "Starting..." : "Start Auction"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Active Auctions ── */}
      <div>
        <div className="mb-4 flex items-baseline gap-2.5">
          <h2 className="text-xl font-bold text-slate-800">Active Auctions</h2>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">{activeAuctions.length}</span>
        </div>
        {activeAuctions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">No active auctions right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeAuctions.map((p) => (
              <div key={p._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)]">
                <div className="flex h-40 items-center justify-center bg-slate-50 p-2">
                  <img
                    src={p.image?.[0] || "/placeholder.png"}
                    alt={p.name}
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                </div>
                <div className="p-4">
                  <h3 className="truncate font-semibold text-slate-800">{p.name}</h3>
                  <p className="mt-1.5 text-base font-bold text-indigo-600">Rs. {p.offerPrice}</p>
                  <p className="text-xs text-slate-500">Starting bid: Rs. {p.startingBid ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-400">Ends {new Date(p.auctionEndTime).toLocaleString()}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Live</span>
                    <Link
                      to={`/seller/auctions/${p._id}`}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition duration-150 hover:bg-indigo-700"
                    >
                      Monitor Live
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Ended Auctions ── */}
      <div>
        <div className="mb-4 flex items-baseline gap-2.5">
          <h2 className="text-xl font-bold text-slate-800">Ended Auctions</h2>
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{endedAuctions.length}</span>
        </div>
        {endedAuctions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">No ended auctions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {endedAuctions.map((p) => {
              const label = getStatusLabel(p);
              return (
                <div key={p._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition duration-200 hover:shadow-[0_12px_24px_rgba(15,23,42,0.09)]">
                  <div className="flex h-40 items-center justify-center bg-slate-100/60 p-2">
                    <img
                      src={p.image?.[0] || "/placeholder.png"}
                      alt={p.name}
                      className="max-h-full max-w-full rounded-lg object-contain opacity-90"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-semibold text-slate-700">{p.name}</h3>
                    <p className="mt-1.5 text-sm font-semibold text-slate-600">Final: Rs. {p.offerPrice}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${label.color}`}>{label.text}</span>
                      <Link
                        to={`/seller/auctions/${p._id}`}
                        className="text-xs font-semibold text-indigo-600 transition duration-150 hover:text-indigo-700 hover:underline"
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
    </div>
  );
};

export default MyAuctions;
