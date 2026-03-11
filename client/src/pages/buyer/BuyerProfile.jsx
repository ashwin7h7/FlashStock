import { useAuth } from "../../context/AuthContext";
import API from "../../api/axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BuyerProfile = () => {
  const { user, checkAuth } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState({ text: "", error: false });
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    setUpgrading(true);
    setMessage({ text: "", error: false });
    try {
      const { data } = await API.patch("/user/upgrade-to-seller");
      if (data.success) {
        setMessage({ text: "Upgraded to seller! Redirecting...", error: false });
        await checkAuth();
        setTimeout(() => navigate("/seller/dashboard"), 1000);
      } else {
        setMessage({ text: data.message || "Upgrade failed", error: true });
      }
    } catch (err) {
      console.error("Upgrade error:", err.response?.data || err.message);
      setMessage({ text: err.response?.data?.message || "Upgrade failed", error: true });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <div className="mb-4">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-lg font-semibold">{user?.name}</p>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-lg">{user?.email}</p>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Roles</p>
          <div className="flex gap-2 mt-1">
            {user?.roles?.map((role) => (
              <span key={role} className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700">
                {role}
              </span>
            ))}
          </div>
        </div>
        {message.text && (
          <p className={`text-sm mb-3 ${message.error ? "text-red-600" : "text-green-600"}`}>{message.text}</p>
        )}
        {!user?.roles?.includes("seller") && (
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {upgrading ? "Upgrading..." : "Upgrade to Seller"}
          </button>
        )}
      </div>
    </div>
  );
};

export default BuyerProfile;
