import { useState, useEffect } from "react";
import API from "../../api/axios";

const MyPickups = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await API.get("/pickups");
        if (data.success) setPickups(data.pickups);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const confirmPickup = async (pickupId) => {
    try {
      const { data } = await API.patch(`/pickups/${pickupId}/confirm-buyer`);
      if (data.success) {
        setPickups((prev) =>
          prev.map((p) => (p._id === pickupId ? { ...p, buyerConfirmed: true, status: data.pickup?.status || p.status } : p))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Pickups</h1>
      {pickups.length === 0 ? (
        <p className="text-gray-500">No pickups yet.</p>
      ) : (
        <div className="space-y-4">
          {pickups.map((p) => (
            <div key={p._id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{p.productId?.name || "Product"}</p>
                <p className="text-sm text-gray-500">Status: <span className="font-medium">{p.status}</span></p>
                <p className="text-xs text-gray-400 mt-1">
                  Seller confirmed: {p.sellerConfirmed ? "Yes" : "No"} | Buyer confirmed: {p.buyerConfirmed ? "Yes" : "No"}
                </p>
              </div>
              {!p.buyerConfirmed && p.status === "pending" && (
                <button
                  onClick={() => confirmPickup(p._id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Confirm Pickup
                </button>
              )}
              {p.status === "completed" && (
                <span className="px-3 py-1 text-sm rounded bg-green-100 text-green-700">Completed</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPickups;
