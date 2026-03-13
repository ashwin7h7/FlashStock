import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BuyerLayout = () => {
  const { logout, isSeller } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/buyer/dashboard" className="text-xl font-bold text-indigo-600">Flash Stock</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/buyer/dashboard" className="text-gray-700 hover:text-indigo-600">Dashboard</Link>
            <Link to="/buyer/bids" className="text-gray-700 hover:text-indigo-600">My Bids</Link>
            <Link to="/buyer/negotiations" className="text-gray-700 hover:text-indigo-600">Negotiations</Link>
            <Link to="/buyer/won" className="text-gray-700 hover:text-indigo-600">Won</Link>
            <Link to="/buyer/pickups" className="text-gray-700 hover:text-indigo-600">Pickups</Link>
            <Link to="/buyer/notifications" className="text-gray-700 hover:text-indigo-600">Notifications</Link>
            <Link to="/buyer/profile" className="text-gray-700 hover:text-indigo-600">Profile</Link>
            {isSeller() && (
              <Link to="/seller/dashboard" className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Seller Panel</Link>
            )}
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

export default BuyerLayout;
