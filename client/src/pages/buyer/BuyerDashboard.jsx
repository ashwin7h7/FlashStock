import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const BuyerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await API.get("/order/my-orders");
        if (data.success) setOrders(data.orders);
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buyer Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-3xl font-bold text-indigo-600">{orders.length}</p>
          <p className="text-gray-500 mt-1">Total Orders</p>
        </div>
        <Link to="/auctions" className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md">
          <p className="text-lg font-semibold text-indigo-600">Browse Auctions</p>
          <p className="text-gray-500 mt-1">Find new deals</p>
        </Link>
        <Link to="/buyer/notifications" className="bg-white p-6 rounded-lg shadow text-center hover:shadow-md">
          <p className="text-lg font-semibold text-indigo-600">Notifications</p>
          <p className="text-gray-500 mt-1">Check updates</p>
        </Link>
      </div>
      <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet. Start bidding!</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Price</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order._id} className="border-t">
                  <td className="px-4 py-3">{order.productId?.name || "N/A"}</td>
                  <td className="px-4 py-3">Rs. {order.price}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(order.purchasedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
