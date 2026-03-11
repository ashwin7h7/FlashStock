import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket, getSocket } from "../../services/socket";

const AuctionDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [auctionRes, bidRes] = await Promise.all([
          API.get("/auction/active"),
          API.get(`/auction/${id}/bids`),
        ]);
        if (auctionRes.data.success) {
          const found = auctionRes.data.auctions.find((a) => a._id === id);
          setProduct(found || null);
        }
        if (bidRes.data.success) setBids(bidRes.data.bids);
      } catch (err) {
        console.error("Failed to load auction", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit("joinAuction", id);

    socket.on("bidUpdate", (data) => {
      setProduct((prev) => prev ? { ...prev, offerPrice: data.currentBid, highestBidderId: data.highestBidderId } : prev);
      setBids((prev) => [{ bidderId: { _id: data.highestBidderId }, amount: data.currentBid, createdAt: new Date() }, ...prev]);
    });

    socket.on("bidError", (data) => {
      setMessage(data.message);
    });

    socket.on("auctionEnded", () => {
      setMessage("Auction has ended!");
    });

    return () => {
      socket.off("bidUpdate");
      socket.off("bidError");
      socket.off("auctionEnded");
      disconnectSocket();
    };
  }, [id]);

  const handleBid = (e) => {
    e.preventDefault();
    setMessage("");
    const socket = socketRef.current;
    if (!socket || !user) return;
    socket.emit("placeBid", {
      auctionId: id,
      bidderId: user._id,
      amount: Number(bidAmount),
    });
    setBidAmount("");
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!product) return <div className="text-center py-20 text-gray-500">Auction not found.</div>;

  const isEnded = new Date(product.auctionEndTime) <= new Date();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            src={product.image?.[0] || "/placeholder.png"}
            alt={product.name}
            className="w-full rounded-lg shadow"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <p className="text-sm text-gray-400 mb-2">Category: {product.category}</p>
          <div className="bg-indigo-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-500">Current Bid</p>
            <p className="text-3xl font-bold text-indigo-600">Rs. {product.offerPrice}</p>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {isEnded ? "Auction ended" : `Ends: ${new Date(product.auctionEndTime).toLocaleString()}`}
          </p>
          {message && <p className="text-red-600 text-sm mb-3">{message}</p>}
          {!isEnded && user && (
            <form onSubmit={handleBid} className="flex gap-2">
              <input
                type="number"
                placeholder="Your bid amount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
                Bid
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Bid History</h2>
        {bids.length === 0 ? (
          <p className="text-gray-500">No bids yet.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Bidder</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3">{bid.bidderId?.name || bid.bidderId?._id || "Anonymous"}</td>
                    <td className="px-4 py-3 font-semibold">Rs. {bid.amount}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(bid.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuctionDetails;
