import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  acceptNegotiationOffer,
  getNegotiationDetails,
  getNegotiationMessages,
  rejectNegotiationOffer,
  sendNegotiationMessage,
  sendNegotiationOffer,
} from "../../services/negotiationApi";
import { useAuth } from "../../context/AuthContext";
import { deriveNegotiationUiState } from "../../utils/negotiationUiState";

const SellerNegotiationChat = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [negotiation, setNegotiation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textMessage, setTextMessage] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusInfo, setStatusInfo] = useState("");

  const refreshNegotiationState = useCallback(async () => {
    const [detailsRes, messagesRes] = await Promise.all([
      getNegotiationDetails(id),
      getNegotiationMessages(id),
    ]);

    if (!detailsRes.success) {
      throw new Error(detailsRes.message || "Failed to load negotiation");
    }

    if (!messagesRes.success) {
      throw new Error(messagesRes.message || "Failed to load messages");
    }

    setNegotiation(detailsRes.negotiation);
    setMessages(messagesRes.messages || []);
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        await refreshNegotiationState();
      } catch (err) {
        console.error("Failed to load seller negotiation chat:", {
          negotiationId: id,
          message: err?.message,
        });
        setError(err.message || "Failed to load chat");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, refreshNegotiationState]);

  const uiState = useMemo(
    () =>
      deriveNegotiationUiState({
        negotiation,
        messages,
        currentUserId: user?._id,
      }),
    [negotiation, messages, user?._id]
  );

  const handleSendText = async (e) => {
    e.preventDefault();
    const message = textMessage.trim();
    if (!message || !negotiation || uiState.areActionsDisabled) return;

    try {
      setSaving(true);
      setError("");
      setStatusInfo("");
      await sendNegotiationMessage(id, message);
      setTextMessage("");
      await refreshNegotiationState();
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setSaving(false);
    }
  };

  const handleSendOffer = async (e) => {
    e.preventDefault();
    if (!negotiation || uiState.isOfferSendDisabled) return;

    const amount = Number(offerAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid offer amount");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setStatusInfo("");
      await sendNegotiationOffer(id, amount);
      setOfferAmount("");
      await refreshNegotiationState();
    } catch (err) {
      setError(err.message || "Failed to send offer");
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    if (!uiState.latestOffer?.offerAmount || !negotiation || !uiState.canSellerRespondToLatestOffer) return;

    try {
      setSaving(true);
      setError("");
      setStatusInfo("");
      await acceptNegotiationOffer(id);
      setStatusInfo(`Offer accepted at Rs. ${uiState.latestOffer.offerAmount}`);
      await refreshNegotiationState();
    } catch (err) {
      setError(err.message || "Failed to accept offer");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!negotiation || !uiState.canSellerRespondToLatestOffer) return;

    try {
      setSaving(true);
      setError("");
      setStatusInfo("");
      await rejectNegotiationOffer(id);
      setStatusInfo("Offer rejected. Buyer can send another offer.");
      await refreshNegotiationState();
    } catch (err) {
      setError(err.message || "Failed to reject offer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-16">Loading chat...</div>;
  if (!negotiation) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-gray-500">Negotiation not found.</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Negotiation Chat</h1>
        <Link to="/seller/negotiations" className="text-sm text-indigo-600 hover:underline">
          Back to Seller Negotiations
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {statusInfo && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {statusInfo}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Product</p>
          <p className="font-semibold text-gray-800">{negotiation.productId?.name || "Product"}</p>
          <p className="text-sm text-gray-500 mt-1">Buyer: {negotiation.buyerId?.name || "Buyer"}</p>
          <p className="text-sm text-gray-500">Auction status: {negotiation.productId?.auctionStatus || "-"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Negotiation Status</p>
          <p className="font-semibold capitalize text-gray-800">{uiState.statusLabel}</p>
          {negotiation.acceptedOfferAmount && (
            <p className="text-sm text-green-700 mt-2">Accepted: Rs. {negotiation.acceptedOfferAmount}</p>
          )}
          {uiState.latestOffer && (
            <p className="text-sm text-indigo-700 mt-2">Latest offer: Rs. {uiState.latestOffer.offerAmount}</p>
          )}
        </div>
      </div>

      {uiState.isOpen && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <p className="font-semibold">Negotiation Open</p>
          {uiState.waitingFor === "seller" && <p className="mt-1">Waiting for seller response.</p>}
          {uiState.waitingFor === "buyer" && <p className="mt-1">Waiting for buyer response.</p>}
        </div>
      )}

      {uiState.lastRejectedMessage && uiState.isOpen && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Last offer rejected</p>
          <p className="mt-1">{uiState.lastRejectedMessage.message}</p>
        </div>
      )}

      {uiState.isAccepted && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-green-800 font-semibold">Negotiation accepted</p>
          <p className="text-sm text-green-700 mt-1">
            Offer Accepted at Rs. {uiState.acceptedAmount}
          </p>
          <p className="text-sm text-green-700 mt-1">
            This chat is now visible as a completed record. No further actions are allowed.
          </p>
        </div>
      )}

      {uiState.isClosedByAuctionEnd && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Negotiation closed because the auction has ended.</p>
        </div>
      )}

      {uiState.isClosed && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold">Negotiation closed</p>
        </div>
      )}

      {uiState.isRejected && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">Negotiation rejected</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 h-[380px] overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500">No messages yet.</p>
        ) : (
          messages.map((msg) => {
            const senderId = String(msg.senderId?._id || msg.senderId || "");
            const isMine = senderId === String(user?._id || "");
            const bubbleClass = msg.messageType === "system"
              ? "bg-gray-100 text-gray-700"
              : isMine
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-800";

            return (
              <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${bubbleClass}`}>
                  <p className="text-xs opacity-80 mb-1">
                    {msg.senderId?.name || (isMine ? "You" : "User")}
                  </p>
                  {msg.messageType === "offer" ? (
                    <div>
                      <p className="font-semibold">Offer: Rs. {msg.offerAmount}</p>
                      {msg.offerStatus && (
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 ${
                            msg.offerStatus === "accepted"
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : msg.offerStatus === "rejected"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                          }`}
                        >
                          {msg.offerStatus === "pending"
                            ? "Pending"
                            : msg.offerStatus === "accepted"
                              ? "Accepted ✓"
                              : "Rejected ✗"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p>{msg.message || "System update"}</p>
                  )}
                  <p className="text-[11px] opacity-75 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {uiState.canSellerRespondToLatestOffer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800 mb-3">
            Latest buyer offer: <span className="font-semibold">Rs. {uiState.latestOffer.offerAmount}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={saving || uiState.areActionsDisabled}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
            >
              Accept Offer
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={saving || uiState.areActionsDisabled}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              Reject Offer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={handleSendText} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Send Message</h2>
          <textarea
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={saving || uiState.areActionsDisabled}
          />
          <button
            type="submit"
            disabled={saving || uiState.areActionsDisabled}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            Send Message
          </button>
        </form>

        <form onSubmit={handleSendOffer} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Send Counter Offer</h2>
          {uiState.hasPendingOffer && uiState.isOpen && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Waiting for response to the current offer.
              {uiState.waitingFor === "seller" && " (Seller must respond.)"}
              {uiState.waitingFor === "buyer" && " (Buyer must respond.)"}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            value={offerAmount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d+$/.test(v)) setOfferAmount(v);
            }}
            placeholder="Enter amount"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={saving || uiState.isOfferSendDisabled}
          />
          <button
            type="submit"
            disabled={saving || uiState.isOfferSendDisabled}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            Send Offer
          </button>
        </form>
      </div>

      {uiState.areActionsDisabled && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          This negotiation is {uiState.statusLabel}. New messages/offers are disabled.
        </div>
      )}
    </div>
  );
};

export default SellerNegotiationChat;
