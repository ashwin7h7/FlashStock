import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import API from "../../api/axios";

const SellerProfile = () => {
  const { user } = useAuth();
  const [ratingSummary, setRatingSummary] = useState({ avgRating: 0, totalReviews: 0 });
  const [recentReviews, setRecentReviews] = useState([]);
  const [ratingLoading, setRatingLoading] = useState(true);

  const completionFields = [
    { label: "Upload a profile photo", done: !!user?.profileImage },
    { label: "Add your full name", done: !!user?.name?.trim() },
    { label: "Add your email address", done: !!user?.email?.trim() },
    { label: "Add a phone number", done: !!user?.phone?.trim() },
    { label: "Add your district", done: !!user?.location?.trim() },
  ];
  const completedCount = completionFields.filter((f) => f.done).length;
  const completionPct = Math.round((completedCount / completionFields.length) * 100);
  const missingFields = completionFields.filter((f) => !f.done);
  const barColor =
    completionPct === 100 ? "bg-green-500" : completionPct >= 60 ? "bg-indigo-500" : "bg-amber-400";

  useEffect(() => {
    const fetchRatingSummary = async () => {
      if (!user?._id) return;
      try {
        const { data } = await API.get(`/ratings/seller/${user._id}`);
        if (data.success) {
          setRatingSummary(data.summary || { avgRating: 0, totalReviews: 0 });
          setRecentReviews(data.recentReviews || []);
        }
      } catch (err) {
        console.error("Failed to load seller ratings", err.response?.data || err.message);
      } finally {
        setRatingLoading(false);
      }
    };

    fetchRatingSummary();
  }, [user?._id]);

  const renderStars = (value = 0) => {
    const rounded = Math.round(value);
    return "★★★★★".split("").map((star, idx) => (
      <span key={`${star}-${idx}`} className={idx < rounded ? "text-amber-500" : "text-gray-300"}>{star}</span>
    ));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Seller Profile</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage your seller account information</p>
      </div>

      {/* Profile Summary */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5 text-center">
        <div className="flex justify-center mb-5">
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user?.name || "Profile"}
              className="w-28 h-28 rounded-full object-cover border-4 border-white ring-2 ring-indigo-100 shadow-md"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-4xl font-bold border-4 border-white ring-2 ring-indigo-100 shadow-md">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{user?.name || "Seller"}</h2>
        <div className="flex justify-center flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
            Seller
          </span>
          <span className="text-sm text-gray-500">
            {user?.location?.trim() ? `📍 ${user.location.trim()}` : "No location set"}
          </span>
        </div>
      </section>

      {/* Seller Rating */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Seller Rating</p>

        {ratingLoading ? (
          <p className="text-sm text-gray-500">Loading ratings...</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {ratingSummary.avgRating.toFixed(1)} <span className="text-base text-gray-500">/ 5</span>
                </p>
                <p className="text-sm text-gray-500">({ratingSummary.totalReviews} reviews)</p>
              </div>
              <div className="text-2xl tracking-wide" aria-label="Average seller rating">
                {renderStars(ratingSummary.avgRating)}
              </div>
            </div>

            {recentReviews.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                {recentReviews.map((review) => (
                  <div key={review._id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm tracking-wide">{renderStars(review.rating)}</div>
                      <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    {review.comment && <p className="text-sm text-gray-700 mt-1">"{review.comment}"</p>}
                    <p className="text-xs text-gray-500 mt-1">By {review.buyerId?.name || "Buyer"}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Profile Completion */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Profile Completion</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {completionPct === 100
                ? "Your profile is complete. Great marketplace presence!"
                : "Complete your profile to improve trust and marketplace readiness."}
            </p>
          </div>
          <span
            className={`text-3xl font-extrabold flex-shrink-0 ${
              completionPct === 100 ? "text-green-500" : completionPct >= 60 ? "text-indigo-500" : "text-amber-500"
            }`}
          >
            {completionPct}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className={`${barColor} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">{completedCount} of {completionFields.length} fields completed</p>
        {missingFields.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            {missingFields.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full"
              >
                <span className="text-amber-400">+</span> {f.label}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Account Details */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Account Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">Email Address</p>
            <p className="text-sm font-medium text-gray-900 break-words">{user?.email || "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">Phone Number</p>
            <p className="text-sm font-medium text-gray-900">{user?.phone?.trim() || "—"}</p>
          </div>
          <div className="sm:col-span-2 bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">District / Location</p>
            <p className="text-sm font-medium text-gray-900">{user?.location?.trim() || "—"}</p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <Link
            to="/seller/profile/edit"
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ✏️ Edit Profile
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SellerProfile;
