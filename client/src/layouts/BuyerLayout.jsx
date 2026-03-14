import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import flashStockLogo from "../assets/FlashStock_Logo.png";

const buyerNavItems = [
  { to: "/buyer/dashboard", label: "Dashboard", end: true },
  { to: "/buyer/bids", label: "My Bids" },
  { to: "/buyer/negotiations", label: "Negotiations" },
  { to: "/buyer/won", label: "Won" },
  { to: "/buyer/pickups", label: "Pickups" },
  { to: "/buyer/notifications", label: "Notifications" },
  { to: "/buyer/profile", label: "Profile" },
];

const getNavLinkClassName = ({ isActive }) =>
  `app-navbar-link ${isActive ? "app-navbar-link-active" : ""}`;

const BuyerLayout = () => {
  const { logout, isSeller } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="app-navbar">
        <div className="app-navbar-inner">
          <div className="flex items-center justify-between gap-4">
            <Link to="/buyer/dashboard" className="app-navbar-brand">
              <img src={flashStockLogo} alt="Flash Stock" className="app-navbar-logo-image" />
              <span className="sr-only">Flash Stock</span>
            </Link>
          </div>

          <div className="app-navbar-links text-sm">
            {buyerNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={getNavLinkClassName}>
                {item.label}
              </NavLink>
            ))}
            {isSeller() && (
              <NavLink to="/seller/dashboard" className="app-navbar-panel-switch">
                Seller Panel
              </NavLink>
            )}
            <span className="app-navbar-actions-divider" aria-hidden="true" />
            <button onClick={handleLogout} className="app-navbar-logout">
              Logout
            </button>
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
