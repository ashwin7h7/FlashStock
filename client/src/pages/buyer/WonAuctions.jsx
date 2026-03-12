import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const WonAuctions = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await API.get("/order/my-orders");
        if (data.success) setOrders(data.orders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const pickupLabel = (pickup) => {
    if (!pickup) return { text: "Pickup Pending", color: "bg-yellow-100 text-yellow-700" };
    if (pickup.pickupStatus === "completed") return { text: "Pickup Completed", color: "bg-green-100 text-green-700" };
    if (pickup.buyerConfirmed) return { text: "You Confirmed", color: "bg-blue-100 text-blue-700" };
    return { text: "Awaiting Pickup", color: "bg-yellow-100 text-yellow-700" };
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Won Auctions</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">You haven't won any auctions yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const product = order.productId;
            const pLabel = pickupLabel(order.pickup);
            return (
              <div
                key={order._id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-4 flex flex-col"
              >
                <img
                  src={product?.image?.[0] || "/placeholder.png"}
                  alt={product?.name || "Product"}
                  className="w-full h-40 object-cover rounded mb-3"
                />
                <h3 className="font-semibold text-lg">
                  {product?.name || "Product"}
                </h3>

                <div className="mt-2 bg-indigo-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Winning Bid</p>
                  <p className="text-xl font-bold text-indigo-600">
                    Rs. {order.price}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Auction Ended
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pLabel.color}`}>
                    {pLabel.text}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  Won on {new Date(order.purchasedAt).toLocaleDateString()}
                </p>

                <Link
                  to={`/buyer/auctions/${product?._id}`}
                  className="mt-auto pt-3 block text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm"
                >
                  View Details
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WonAuctions;
