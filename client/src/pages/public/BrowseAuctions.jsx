import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const CATEGORY_OPTIONS = [
  "all",
  "electronics",
  "furniture",
  "vehicles",
  "books",
  "accessories",
  "others",
];

const SORT_OPTIONS = [
  { value: "ending-soon", label: "Ending Soon" },
  { value: "highest-bid", label: "Highest Bid" },
  { value: "recently-added", label: "Recently Added" },
];

const LOCATION_OPTIONS = [
  "all",
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
  "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
];

const isLiveAuction = (auction, nowTs = Date.now()) => {
  if (!auction?.isAuction) return false;
  if (auction.auctionStatus !== "active") return false;
  if (!auction.auctionEndTime) return false;
  return new Date(auction.auctionEndTime).getTime() > nowTs;
};

const BrowseAuctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("ending-soon");
  const [location, setLocation] = useState("all");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const activeRes = await API.get("/auction/active");
        const activeAuctions = activeRes.data?.success ? activeRes.data.auctions : [];
        const normalized = activeAuctions.filter((a) => isLiveAuction(a));

        normalized.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setAuctions(normalized);
      } catch (err) {
        console.error("Failed to fetch auctions", err);
        setError("Failed to load auctions. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = (endTime) => {
    const diff = new Date(endTime).getTime() - now;
    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const filteredAuctions = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = auctions.filter((item) => {
      if (!isLiveAuction(item, now)) return false;

      const itemCategory = (item.category || "").toLowerCase();
      const matchesCategory = category === "all" || itemCategory === category;
      const itemLocation = (item.location || "").toLowerCase();
      const matchesLocation = location === "all" || itemLocation === location.toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        (item.name || "").toLowerCase().includes(query) ||
        (item.description || "").toLowerCase().includes(query);

      return matchesCategory && matchesLocation && matchesSearch;
    });

    const sorted = [...filtered];
    if (sortBy === "ending-soon") {
      sorted.sort((a, b) => new Date(a.auctionEndTime) - new Date(b.auctionEndTime));
    } else if (sortBy === "highest-bid") {
      sorted.sort((a, b) => Number(b.offerPrice || 0) - Number(a.offerPrice || 0));
    } else if (sortBy === "recently-added") {
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return sorted;
  }, [auctions, now, search, category, location, sortBy]);

  if (loading) return <div className="text-center py-20">Loading auctions...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-end gap-4 md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Browse Auctions</h1>
          <p className="text-gray-500 mt-1">Discover live auctions currently accepting bids.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or description"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {LOCATION_OPTIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc === "all" ? "All Locations" : loc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500">Sort</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredAuctions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="text-gray-500">No auctions found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuctions.map((item) => {
            return (
              <div
                key={item._id}
                className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden border border-gray-100"
              >
              <img
                src={item.image?.[0] || "/placeholder.png"}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Live Auction
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{item.category || "others"}</span>
                </div>

                <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description || "No description"}</p>

                {item.location && (
                  <p className="text-xs text-gray-500 mt-1.5">📍 {item.location}</p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Current Highest</p>
                    <p className="text-indigo-600 font-bold">Rs. {item.offerPrice}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500">Time Remaining</p>
                    <p className="font-semibold text-sm text-green-700">
                      {getTimeRemaining(item.auctionEndTime)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Ends {new Date(item.auctionEndTime).toLocaleString()}
                </p>

                <Link
                  to={`/auctions/${item._id}`}
                  className="mt-4 inline-block w-full text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm"
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
  );
};

export default BrowseAuctions;
