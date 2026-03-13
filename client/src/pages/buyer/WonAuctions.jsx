import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const WonAuctions = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await API.get("/order/my-orders");
        if (data.success) setOrders(data.orders);
      } catch (err) {
        console.error(err);
        setError("Failed to load won auctions.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const getPickupMeta = (pickup) => {
    if (!pickup) {
      return { text: "Pickup Pending", color: "bg-yellow-100 text-yellow-700" };
    }
    if (pickup.pickupStatus === "completed") {
      return { text: "Pickup Completed", color: "bg-green-100 text-green-700" };
    }
    if (pickup.buyerConfirmed) {
      return { text: "Buyer Confirmed", color: "bg-blue-100 text-blue-700" };
    }
    return { text: "Awaiting Pickup", color: "bg-yellow-100 text-yellow-700" };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Won Auctions</h1>
          <p className="text-sm text-gray-500 mt-1">Track won items and complete pickup confirmation.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          You have not won any auctions yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const product = order.productId;
            const pickupMeta = getPickupMeta(order.pickup);

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

                <h3 className="font-semibold text-lg">{product?.name || "Product"}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product?.description || "No description available."}</p>

                {product?.location && (
                  <p className="text-xs text-indigo-600 mt-1.5">📍 Pickup Location: {product.location}</p>
                )}

                <div className="mt-3 bg-indigo-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Winning Amount</p>
                  <p className="text-xl font-bold text-indigo-600">Rs. {order.price}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Auction Ended
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                    Order {order.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pickupMeta.color}`}>
                    {pickupMeta.text}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  Won on {new Date(order.purchasedAt).toLocaleDateString()}
                </p>

                <Link
                  to={`/buyer/won/${order._id}`}
                  className="mt-auto pt-3 block text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm"
                >
                  Open Won Item
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
