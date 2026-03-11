import { useState, useEffect } from "react";
import API from "../../api/axios";

const WonAuctions = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await API.get("/order/my-orders");
        if (data.success) setOrders(data.orders);
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
      <h1 className="text-2xl font-bold mb-6">Won Auctions</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">You haven't won any auctions yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold">{order.productId?.name || "Product"}</h3>
              <p className="text-indigo-600 font-bold mt-2">Rs. {order.price}</p>
              <p className="text-sm text-gray-500 mt-1">
                Won on {new Date(order.purchasedAt).toLocaleDateString()}
              </p>
              <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                {order.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WonAuctions;
