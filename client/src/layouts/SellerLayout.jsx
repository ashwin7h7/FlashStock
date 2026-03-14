import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import flashStockLogo from "../assets/FlashStock_Logo.png";

const sellerNavItems = [
  { to: "/seller/dashboard", label: "Dashboard", end: true },
  { to: "/seller/add-product", label: "Add Product" },
  { to: "/seller/products", label: "My Products" },
  { to: "/seller/auctions", label: "Auctions" },
  { to: "/seller/negotiations", label: "Negotiations" },
  { to: "/seller/pickups", label: "Pickups" },
  { to: "/seller/notifications", label: "Notifications" },
  { to: "/seller/profile", label: "Profile" },
];

const getSellerNavLinkClassName = ({ isActive }) =>
  `app-navbar-link app-navbar-link-compact ${isActive ? "app-navbar-link-active" : ""}`;

const SellerLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="app-navbar app-navbar-seller">
        <div className="app-navbar-inner">
          <div className="app-navbar-seller-top">
            <div className="app-navbar-brand-slot">
              <Link to="/seller/dashboard" className="app-navbar-brand">
                <img src={flashStockLogo} alt="Flash Stock" className="app-navbar-logo-image app-navbar-logo-image-seller" />
                <span className="sr-only">Flash Stock</span>
              </Link>
            </div>

            <div className="app-navbar-actions text-sm">
              <NavLink to="/buyer/dashboard" className="app-navbar-panel-switch app-navbar-panel-switch-secondary">
                Buyer Panel
              </NavLink>
              <span className="app-navbar-actions-divider" aria-hidden="true" />
              <button onClick={handleLogout} className="app-navbar-logout">
                Logout
              </button>
            </div>
          </div>

          <div className="app-navbar-seller-main">
            <div className="app-navbar-primary-links text-sm">
              {sellerNavItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={getSellerNavLinkClassName}>
                  {item.label}
                </NavLink>
              ))}
            </div>
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
