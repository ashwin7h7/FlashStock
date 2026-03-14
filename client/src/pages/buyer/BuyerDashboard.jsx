import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";

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

const BuyerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [activeBids, setActiveBids] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ordersRes = await API.get("/order/my-orders");
        if (ordersRes.data.success) {
          setOrders(ordersRes.data.orders);
        }

        const bidsRes = await API.get("/auction/my-bids");
        if (bidsRes.data.success) {
          setActiveBids(bidsRes.data.items);
        }

        const notifRes = await API.get("/notifications");
        if (notifRes.data.success) {
          setNotifications(notifRes.data.notifications);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setError("Failed to load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="py-20 text-center">Loading...</div>;

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  const stats = [
    {
      label: "Active Bids",
      value: activeBids.length,
      note: "Auctions you are currently tracking",
      tone: "dashboard-card-primary",
      kicker: "Live activity",
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
      label: "Won Auctions",
      value: orders.length,
      note: "Closed deals already assigned to you",
      tone: "dashboard-card-success",
      kicker: "Completed",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5.25h9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 5.25v2.1a3.75 3.75 0 0 0 7.5 0v-2.1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25H4.5a1.5 1.5 0 0 0-1.5 1.5v.75a4.5 4.5 0 0 0 4.5 4.5h.75" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 5.25h.75a1.5 1.5 0 0 1 1.5 1.5v.75a4.5 4.5 0 0 1-4.5 4.5h-.75" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v4.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19.5h6" />
          </svg>
        </DashboardGlyph>
      ),
    },
    {
      label: "Unread Notifications",
      value: unreadNotifications.length,
      note: "New seller updates and auction alerts",
      tone: unreadNotifications.length > 0 ? "dashboard-card-warning" : "dashboard-card-neutral",
      kicker: "Attention",
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
      label: "Browse Auctions",
      value: "Explore",
      note: "Jump back into the marketplace and place bids",
      tone: "dashboard-card-primary",
      kicker: "Shortcut",
      icon: (
        <DashboardGlyph>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="6.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m16 16 4 4" />
          </svg>
        </DashboardGlyph>
      ),
      action: (
        <Link to="/auctions" className="dashboard-section-link">
          View auctions
          <span aria-hidden="true">→</span>
        </Link>
      ),
    },
  ];

  const quickLinks = [
    {
      to: "/auctions",
      label: "Browse Auctions",
      detail: "See current lots and live prices",
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
      to: "/buyer/bids",
      label: "My Bids",
      detail: "Track auctions where you are competing",
      tone: "dashboard-quick-link-primary",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 16.5V9.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V6.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.5V12" />
        </svg>
      ),
    },
    {
      to: "/buyer/won",
      label: "Won Auctions",
      detail: "Review orders and payment outcomes",
      tone: "dashboard-quick-link-success",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5.25h9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 5.25v2.1a3.75 3.75 0 0 0 7.5 0v-2.1" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25H4.5a1.5 1.5 0 0 0-1.5 1.5v.75a4.5 4.5 0 0 0 4.5 4.5h.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 5.25h.75a1.5 1.5 0 0 1 1.5 1.5v.75a4.5 4.5 0 0 1-4.5 4.5h-.75" />
        </svg>
      ),
    },
    {
      to: "/buyer/pickups",
      label: "Pickups",
      detail: "Check ready items and collection status",
      tone: "dashboard-quick-link-warning",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h11.25v7.5H3.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5h2.379a1.5 1.5 0 0 1 1.2.6l1.671 2.229v1.671H15" />
          <circle cx="7.5" cy="17.25" r="1.5" />
          <circle cx="17.25" cy="17.25" r="1.5" />
        </svg>
      ),
    },
    {
      to: "/buyer/negotiations",
      label: "Negotiations",
      detail: "Open pricing discussions with sellers",
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
      to: "/buyer/notifications",
      label: "Notifications",
      detail: "Stay on top of new auction events",
      tone: unreadNotifications.length > 0 ? "dashboard-quick-link-danger" : "dashboard-quick-link-primary",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9a6 6 0 1 0-12 0v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.082 5.455 1.31" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17.25a2.25 2.25 0 0 0 4.5 0" />
        </svg>
      ),
      badge: unreadNotifications.length > 0 ? unreadNotifications.length : null,
    },
  ];

  return (
    <div className="dashboard-shell">
      <div className="dashboard-page-header">
        <span className="dashboard-eyebrow">Buyer Panel</span>
        <h1 className="dashboard-title">Buyer Dashboard</h1>
        <p className="dashboard-subtitle">
          Follow your bids, review won auctions, and move quickly between buyer actions from one clean overview.
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
              <h2 className="dashboard-section-title">Marketplace snapshot</h2>
              <p className="dashboard-section-copy">Key buyer metrics with clearer emphasis and more breathing room.</p>
            </div>
          </div>
        </div>

        <div className="dashboard-stats-grid dashboard-stats-grid-4">
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
                {stat.action ? <div className="mt-4">{stat.action}</div> : null}
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
              <h2 className="dashboard-section-title">Common buyer actions</h2>
              <p className="dashboard-section-copy">Shortcuts styled as dashboard widgets with stronger hover affordance.</p>
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

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div className="dashboard-section-title-group">
            <SectionGlyph>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5.25h9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 5.25v2.1a3.75 3.75 0 0 0 7.5 0v-2.1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25H4.5a1.5 1.5 0 0 0-1.5 1.5v.75a4.5 4.5 0 0 0 4.5 4.5h.75" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 5.25h.75a1.5 1.5 0 0 1 1.5 1.5v.75a4.5 4.5 0 0 1-4.5 4.5h-.75" />
              </svg>
            </SectionGlyph>
            <div>
              <p className="dashboard-section-kicker">Recent Activity</p>
              <h2 className="dashboard-section-title">Recent Won Auctions</h2>
              <p className="dashboard-section-copy">A cleaner summary of the latest auctions you have secured.</p>
            </div>
          </div>
          {orders.length > 5 && (
            <Link to="/buyer/won" className="dashboard-section-link">
              View all won auctions
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <p className="dashboard-empty-state">You have not won any auctions yet. Start bidding to see completed purchases here.</p>
        ) : (
          <div className="dashboard-panel overflow-hidden">
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Winning Amount</th>
                    <th>Status</th>
                    <th>Won Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order._id}>
                      <td className="font-semibold">{order.productId?.name || "N/A"}</td>
                      <td className="font-semibold text-indigo-600">Rs. {order.price}</td>
                      <td>
                        <span
                          className={`dashboard-pill ${
                            order.pickup?.pickupStatus === "completed"
                              ? "dashboard-pill-success"
                              : "dashboard-pill-warning"
                          }`}
                        >
                          {order.pickup?.pickupStatus === "completed" ? "Pickup Done" : "Pending Pickup"}
                        </span>
                      </td>
                      <td className="text-sm text-slate-500">{new Date(order.purchasedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default BuyerDashboard;
