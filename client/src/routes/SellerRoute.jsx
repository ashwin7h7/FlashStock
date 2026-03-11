import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SellerRoute = () => {
  const { user, loading, isSeller } = useAuth();

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSeller()) return <Navigate to="/buyer/dashboard" replace />;

  return <Outlet />;
};

export default SellerRoute;
