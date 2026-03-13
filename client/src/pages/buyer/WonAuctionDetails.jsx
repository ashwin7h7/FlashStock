import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../../api/axios";

const WonAuctionDetails = () => {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [message, setMessage] = useState({ text: "", error: false });

  useEffect(() => {
    const fetchWonItem = async () => {
      try {
        const { data } = await API.get(`/order/my-orders/${id}`);
        if (data.success) {
          setOrder(data.order);
        } else {
          setMessage({ text: data.message || "Failed to load won item.", error: true });
        }
      } catch (err) {
        setMessage({
          text: err.response?.data?.message || "Failed to load won item.",
          error: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWonItem();
  }, [id]);

  const refreshOrder = async () => {
    const { data } = await API.get(`/order/my-orders/${id}`);
    if (data.success) {
      setOrder(data.order);
    }
  };

  const handleConfirmPickup = async () => {
    if (!order?.pickup?.pickupId || order.pickup.pickupStatus === "completed") {
      return;
    }

    setSubmitting(true);
    setMessage({ text: "", error: false });

    try {
      const { data } = await API.patch(`/pickups/${order.pickup.pickupId}/confirm-buyer`);
      if (data.success) {
        await refreshOrder();
        setMessage({
          text: data.message || "Pickup confirmed successfully.",
          error: false,
        });
      } else {
        setMessage({ text: data.message || "Could not confirm pickup.", error: true });
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "Could not confirm pickup.",
        error: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!order || !order.productId) {
    return <div className="text-center py-20 text-gray-500">Won item not found.</div>;
  }

  const product = order.productId;
  const pickup = order.pickup;
  const seller = product.sellerId;
  const pickupCompleted = pickup?.pickupStatus === "completed";
  const canConfirmPickup = pickup && !pickupCompleted && !pickup.buyerConfirmed;
  const sellerLocation = seller?.location?.trim() || product?.location || "Not added yet";
  const sellerPhone = seller?.phone?.trim() || "Phone not added yet";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Won Item Details</h1>
          <p className="text-sm text-gray-500 mt-1">Review your won item and complete pickup confirmation.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/buyer/won"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Back to Won Auctions
          </Link>
          <Link
            to="/buyer/pickups"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Go to Pickups
          </Link>
        </div>
      </div>

      {message.text && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            message.error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <img
            src={product.image?.[selectedImg] || product.image?.[0] || "/placeholder.png"}
            alt={product.name}
            className="w-full rounded-xl shadow-lg object-cover max-h-[420px] cursor-pointer"
            onClick={() => setLightboxOpen(true)}
          />
          {product.image?.length > 1 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {product.image.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${product.name} ${index + 1}`}
                  className={`w-16 h-16 rounded object-cover border-2 cursor-pointer ${
                    selectedImg === index
                      ? "border-indigo-500 ring-2 ring-indigo-200"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  onClick={() => setSelectedImg(index)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
              Auction Ended
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700 capitalize">
              Order {order.status}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                pickupCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {pickupCompleted ? "Pickup Completed" : "Pickup Pending"}
            </span>
          </div>

          <h2 className="text-3xl font-bold mb-2">{product.name}</h2>
          <p className="text-sm text-gray-400 mb-4">Category: {product.category}</p>
          <p className="text-gray-600 mb-6">{product.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500">Original Price</p>
              <p className="text-lg font-semibold">Rs. {product.price}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500">Winning Amount</p>
              <p className="text-lg font-semibold text-indigo-600">Rs. {order.price}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500">Won Date</p>
              <p className="text-lg font-semibold">{new Date(order.purchasedAt).toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500">Seller</p>
              <p className="text-lg font-semibold">{seller?.name || "Seller"}</p>
              {seller?.email && <p className="text-sm text-gray-500 mt-1">{seller.email}</p>}
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500">Pickup Location</p>
              <p className="text-lg font-semibold">{product.location || "—"}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
            <h3 className="text-lg font-semibold mb-3">Seller Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Seller Name</p>
                <p className="font-semibold text-gray-900">{seller?.name || "Seller"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-semibold text-gray-900 break-words">{seller?.email || "Not added yet"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-semibold text-gray-900">{sellerPhone}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">District / Location</p>
                <p className="font-semibold text-gray-900">{sellerLocation}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Pickup</h3>
                <p className="text-sm text-gray-500">Buyer confirmation is required to complete the transaction.</p>
              </div>
            </div>

            {pickup ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Pickup Status</p>
                    <p className="font-semibold capitalize">{pickup.pickupStatus}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Completed At</p>
                    <p className="font-semibold">{pickup.completedAt ? new Date(pickup.completedAt).toLocaleString() : "Not completed yet"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Seller Confirmed</p>
                    <p className="font-semibold">{pickup.sellerConfirmed ? "Yes" : "No"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Buyer Confirmed</p>
                    <p className="font-semibold">{pickup.buyerConfirmed ? "Yes" : "No"}</p>
                  </div>
                </div>

                {canConfirmPickup && (
                  <button
                    onClick={handleConfirmPickup}
                    disabled={submitting}
                    className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Confirming..." : "Confirm Pickup"}
                  </button>
                )}

                {!canConfirmPickup && pickupCompleted && (
                  <div className="inline-flex px-3 py-2 rounded-lg bg-green-100 text-green-700 font-medium">
                    Pickup Completed
                  </div>
                )}

                {!canConfirmPickup && !pickupCompleted && pickup.buyerConfirmed && (
                  <div className="inline-flex px-3 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium">
                    You already confirmed pickup
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Pickup record is not available yet. Please check again later.</p>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
            >
              &times;
            </button>
            <img
              src={product.image?.[selectedImg] || product.image?.[0] || "/placeholder.png"}
              alt={product.name}
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WonAuctionDetails;