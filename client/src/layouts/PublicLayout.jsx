import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicLayout = () => {
  const { user, isSeller } = useAuth();
  const logoTarget = user ? (isSeller() ? "/seller/dashboard" : "/buyer/dashboard") : "/";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to={logoTarget} className="text-xl font-bold text-indigo-600">Flash Stock</Link>
          <div className="flex items-center gap-4">
            <Link to="/auctions" className="text-gray-700 hover:text-indigo-600">Browse</Link>
            {user ? (
              <>
                <Link
                  to={isSeller() ? "/seller/dashboard" : "/buyer/dashboard"}
                  className="text-gray-700 hover:text-indigo-600"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-indigo-600">Login</Link>
                <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
