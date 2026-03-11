import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const SellerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await API.get("/product/my-products");
        if (data.success) setProducts(data.products);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  const activeAuctions = products.filter((p) => p.auctionStatus === "active").length;
  const endedAuctions = products.filter((p) => p.auctionStatus === "ended").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Seller Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-3xl font-bold text-indigo-600">{products.length}</p>
          <p className="text-gray-500 mt-1">Total Products</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-3xl font-bold text-green-600">{activeAuctions}</p>
          <p className="text-gray-500 mt-1">Active Auctions</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-3xl font-bold text-gray-600">{endedAuctions}</p>
          <p className="text-gray-500 mt-1">Ended Auctions</p>
        </div>
        <Link to="/seller/add-product" className="bg-indigo-600 text-white p-6 rounded-lg shadow text-center hover:bg-indigo-700 flex items-center justify-center">
          <span className="text-lg font-semibold">+ Add Product</span>
        </Link>
      </div>
    </div>
  );
};

export default SellerDashboard;
