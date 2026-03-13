import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SellerLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/seller/dashboard" className="text-xl font-bold text-indigo-600">Flash Stock</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/seller/dashboard" className="text-gray-700 hover:text-indigo-600">Dashboard</Link>
            <Link to="/seller/add-product" className="text-gray-700 hover:text-indigo-600">Add Product</Link>
            <Link to="/seller/products" className="text-gray-700 hover:text-indigo-600">My Products</Link>
            <Link to="/seller/auctions" className="text-gray-700 hover:text-indigo-600">Auctions</Link>
            <Link to="/seller/pickups" className="text-gray-700 hover:text-indigo-600">Pickups</Link>
            <Link to="/seller/notifications" className="text-gray-700 hover:text-indigo-600">Notifications</Link>
            <Link to="/seller/profile" className="text-gray-700 hover:text-indigo-600">Profile</Link>
            <Link to="/buyer/dashboard" className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">Buyer Panel</Link>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800">Logout</button>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default SellerLayout;
