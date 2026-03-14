import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import { getEndedAuctionState } from "../../utils/auctionState";

const DashboardGlyph = ({ children }) => (
  <span className="dashboard-stat-icon" aria-hidden="true">
    {children}
  </span>
);

const SectionGlyph = ({ children }) => (
  <span className="dashboard-inline-icon" aria-hidden="true">
    {children}
  </span>
);

const SellerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const fetch = async () => {
      try {
        const [productRes, notificationRes, pickupRes] = await Promise.all([
          API.get("/product/my-products"),
          API.get("/notifications"),
          API.get("/pickups"),
        ]);

        if (productRes.data.success) setProducts(productRes.data.products);
        if (notificationRes.data.success) setNotifications(notificationRes.data.notifications);
        if (pickupRes.data.success) setPickups(pickupRes.data.pickups);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="py-20 text-center">Loading...</div>;

  const hasCompletedPickup = (productId) =>
    pickups.some((pk) => (pk.productId?._id || pk.productId) === productId && pk.status === "completed");

  const activeAuctions = products.filter((p) => p.isAuction && p.auctionStatus === "active");
  const endedAuctions = products.filter((p) => p.isAuction && p.auctionStatus === "ended");
  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const productsReadyForAuction = products.filter((p) => {
    const { hasAcceptedBids } = getEndedAuctionState(p);
    if (!p.isAuction) return true;
    if (p.auctionStatus === "active") return false;
    if (hasAcceptedBids) return false;
    if (hasCompletedPickup(p._id)) return false;
    return true;
  });

  const pendingPickups = pickups.filter((p) => p.status === "pending");

  const getEndedStatus = (product) => {
    const { hasAcceptedBids } = getEndedAuctionState(product);
    if (hasCompletedPickup(product._id)) {
      return { text: "Pickup Completed", color: "dashboard-pill-primary" };
    }
    if (hasAcceptedBids) {
      return { text: "Winner Selected", color: "dashboard-pill-warning" };
    }
    return { text: "Ended (No Bids)", color: "dashboard-pill-neutral" };
  };

  const getTimeRemaining = (endTime) => {
    if (!endTime) return "No end time";
    const diffMs = new Date(endTime).getTime() - now;
    if (diffMs <= 0) return "Ending soon";
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const recentActiveAuctions = [...activeAuctions]
    .sort((a, b) => new Date(a.auctionEndTime) - new Date(b.auctionEndTime))
    .slice(0, 4);

  const recentEndedAuctions = [...endedAuctions]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 4);

  const recentNotifications = [...notifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const stats = [
    {
      label: "Total Products",
      value: products.length,
      note: "Total products listed in your account.",
      tone: "dashboard-card-primary",
      kicker: "Inventory",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 6.75V18a.75.75 0 0 0 .75.75h12a.75.75 0 0 0 .75-.75V6.75" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5h6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25h4.5" />
          </svg>
        </DashboardGlyph>
      ),
    },
    {
      label: "Active Auctions",
      value: activeAuctions.length,
      note: "Auctions currently open for bidding.",
      tone: "dashboard-card-success",
      kicker: "Running",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V5.25" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5V12" />
          </svg>
        </DashboardGlyph>
      ),
    },
    {
      label: "Ended Auctions",
      value: endedAuctions.length,
      note: "Auctions that have already ended.",
      tone: "dashboard-card-neutral",
      kicker: "Completed",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.75 2.25" />
            <circle cx="12" cy="12" r="8.25" />
          </svg>
        </DashboardGlyph>
      ),
    },
    {
      label: "Unread Notifications",
      value: unreadNotifications.length,
      note: "Notifications and updates that require your attention.",
      tone: unreadNotifications.length > 0 ? "dashboard-card-warning" : "dashboard-card-neutral",
      kicker: "Alerts",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.082 5.455 1.31" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17.25a2.25 2.25 0 0 0 4.5 0" />
          </svg>
        </DashboardGlyph>
      ),
    },
    {
      label: "Ready for Auction",
      value: productsReadyForAuction.length,
      note: "Products that are ready to start a new auction.",
      tone: "dashboard-card-primary",
      kicker: "Ready",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 9 12 4.5 16.5 9" />
          </svg>
        </DashboardGlyph>
      ),
    },
    {
      label: "Pending Pickups",
      value: pendingPickups.length,
      note: "Pickup requests pending confirmation.",
      tone: pendingPickups.length > 0 ? "dashboard-card-danger" : "dashboard-card-success",
      kicker: "Pickups",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h11.25v7.5H3.75z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5h2.379a1.5 1.5 0 0 1 1.2.6l1.671 2.229v1.671H15" />
            <circle cx="7.5" cy="17.25" r="1.5" />
            <circle cx="17.25" cy="17.25" r="1.5" />
          </svg>
        </DashboardGlyph>
      ),
    },
  ];

  const quickLinks = [
    {
      to: "/seller/add-product",
      label: "Add Product",
      detail: "Create a new product listing.",
      tone: "dashboard-quick-link-primary",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
        </svg>
      ),
    },
    {
      to: "/seller/products",
      label: "My Products",
      detail: "View and update your product listings.",
      tone: "dashboard-quick-link-primary",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 6.75V18a.75.75 0 0 0 .75.75h12a.75.75 0 0 0 .75-.75V6.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25h4.5" />
        </svg>
      ),
    },
    {
      to: "/seller/auctions",
      label: "My Auctions",
      detail: "Open and manage your auctions.",
      tone: "dashboard-quick-link-success",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V5.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5V12" />
        </svg>
      ),
    },
    {
      to: "/seller/negotiations",
      label: "Negotiations",
      detail: "Review and respond to buyer offers.",
      tone: "dashboard-quick-link-primary",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5h9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25h5.25" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h15v10.5h-4.5L12 20.25l-3-3H4.5z" />
        </svg>
      ),
    },
    {
      to: "/seller/notifications",
      label: "Notifications",
      detail: "View seller notifications and updates.",
      tone: unreadNotifications.length > 0 ? "dashboard-quick-link-danger" : "dashboard-quick-link-warning",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.082 5.455 1.31" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17.25a2.25 2.25 0 0 0 4.5 0" />
        </svg>
      ),
      badge: unreadNotifications.length > 0 ? unreadNotifications.length : null,
    },
    {
      to: "/seller/pickups",
      label: "Pickups",
      detail: "Manage pickup requests and status.",
      tone: pendingPickups.length > 0 ? "dashboard-quick-link-warning" : "dashboard-quick-link-success",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h11.25v7.5H3.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5h2.379a1.5 1.5 0 0 1 1.2.6l1.671 2.229v1.671H15" />
          <circle cx="7.5" cy="17.25" r="1.5" />
          <circle cx="17.25" cy="17.25" r="1.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="dashboard-shell">
      <div className="dashboard-page-header">
        <span className="dashboard-eyebrow">Seller Panel</span>
        <h1 className="dashboard-title">Seller Dashboard</h1>
        <p className="dashboard-subtitle">
          Overview of your seller activity and key statistics.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title-group">
            <SectionGlyph>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V5.25" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5V12" />
              </svg>
            </SectionGlyph>
            <div>
              <p className="dashboard-section-kicker">Stats Cards</p>
              <h2 className="dashboard-section-title">Seller Activity Overview</h2>
              <p className="dashboard-section-copy">Key statistics for your products, auctions, and pickups.</p>
            </div>
          </div>
        </div>

        <div className="dashboard-stats-grid dashboard-stats-grid-6">
          {stats.map((stat) => (
            <div key={stat.label} className={`dashboard-card dashboard-stat-card ${stat.tone}`}>
              <div className="dashboard-stat-top">
                <div>
                  <p className="dashboard-stat-kicker">{stat.kicker}</p>
                  <p className="dashboard-stat-value">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
              <div>
                <p className="dashboard-stat-label">{stat.label}</p>
                <p className="dashboard-stat-note">{stat.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title-group">
            <SectionGlyph>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h10.5v10.5H6.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h4.5v4.5h-4.5z" />
              </svg>
            </SectionGlyph>
            <div>
              <p className="dashboard-section-kicker">Quick Links</p>
              <h2 className="dashboard-section-title">Common seller actions</h2>
              <p className="dashboard-section-copy">Quick access to tools for managing products and auctions.</p>
            </div>
          </div>
        </div>

        <div className="dashboard-quick-links-grid">
          {quickLinks.map((link) => (
            <Link key={link.label} to={link.to} className={`dashboard-quick-link ${link.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="dashboard-quick-link-icon" aria-hidden="true">
                  {link.icon}
                </span>
                {link.badge ? <span className="dashboard-badge">{link.badge}</span> : null}
              </div>
              <div>
                <p className="dashboard-quick-link-title">{link.label}</p>
                <p className="dashboard-quick-link-copy">{link.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="space-y-8">
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div className="dashboard-section-title-group">
              <SectionGlyph>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V5.25" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5V12" />
                </svg>
              </SectionGlyph>
              <div>
                <p className="dashboard-section-kicker">Active Auctions</p>
                <h2 className="dashboard-section-title">Live seller listings</h2>
                <p className="dashboard-section-copy">Auctions that are currently live.</p>
              </div>
            </div>
            <Link to="/seller/auctions" className="dashboard-section-link">
              View all auctions
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {recentActiveAuctions.length === 0 ? (
            <div className="dashboard-empty-state">
              No active auctions right now. Start one from My Auctions or Add Product.
            </div>
          ) : (
            <div className="dashboard-split-grid">
              {recentActiveAuctions.map((product) => (
                <div key={product._id} className="dashboard-list-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="dashboard-item-title">{product.name}</h3>
                      <p className="dashboard-item-copy text-indigo-600 font-semibold">Current highest: Rs. {product.offerPrice}</p>
                      <p className="dashboard-item-meta">Ends {new Date(product.auctionEndTime).toLocaleString()}</p>
                      <p className="dashboard-item-meta">{getTimeRemaining(product.auctionEndTime)}</p>
                    </div>
                    <span className="dashboard-pill dashboard-pill-success">Live</span>
                  </div>
                  <div className="mt-3">
                    <Link to={`/seller/auctions/${product._id}`} className="dashboard-button">
                      Monitor Auction
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div className="dashboard-section-title-group">
              <SectionGlyph>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.75 2.25" />
                  <circle cx="12" cy="12" r="8.25" />
                </svg>
              </SectionGlyph>
              <div>
                <p className="dashboard-section-kicker">Recent Outcomes</p>
                <h2 className="dashboard-section-title">Recently Ended Auctions</h2>
                <p className="dashboard-section-copy">Recently ended auctions and outcomes.</p>
              </div>
            </div>
            <Link to="/seller/auctions" className="dashboard-section-link">
              View results
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {recentEndedAuctions.length === 0 ? (
            <div className="dashboard-empty-state">
              No ended auctions yet. Ended auctions and outcomes will appear here.
            </div>
          ) : (
            <div className="dashboard-split-grid">
              {recentEndedAuctions.map((product) => {
                const endedStatus = getEndedStatus(product);
                return (
                  <div key={product._id} className="dashboard-list-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="dashboard-item-title">{product.name}</h3>
                        <p className="dashboard-item-copy">Final bid: Rs. {product.offerPrice}</p>
                      </div>
                      <span className={`dashboard-pill ${endedStatus.color}`}>{endedStatus.text}</span>
                    </div>
                    <div className="mt-3">
                      <Link to={`/seller/auctions/${product._id}`} className="dashboard-button-secondary">
                        View Auction
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div className="dashboard-section-title-group">
              <SectionGlyph>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.082 5.455 1.31" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17.25a2.25 2.25 0 0 0 4.5 0" />
                </svg>
              </SectionGlyph>
              <div>
                <p className="dashboard-section-kicker">Alerts</p>
                <h2 className="dashboard-section-title">Recent Notifications</h2>
                <p className="dashboard-section-copy">Recent notifications and account updates.</p>
              </div>
            </div>
            <Link to="/seller/notifications" className="dashboard-section-link">
              Open notifications
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {recentNotifications.length === 0 ? (
            <div className="dashboard-empty-state">
              No notifications yet. Updates on bids, winners, and pickups will appear here.
            </div>
          ) : (
            <div className="dashboard-panel dashboard-notification-list">
              {recentNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`dashboard-notification-item ${notification.isRead ? "" : "dashboard-notification-item-unread"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                      <p className="mt-0.5 text-sm text-gray-600">{notification.message}</p>
                    </div>
                    {!notification.isRead && <span className="dashboard-pill dashboard-pill-primary">Unread</span>}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{new Date(notification.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SellerDashboard;
