const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  if (typeof value?.toString === "function") return String(value.toString());
  return "";
};

export const getLatestOfferMessage = (messages = []) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.messageType === "offer" && msg?.offerStatus === "pending") return msg;
  }
  return null;
};

export const getLastRejectedSystemMessage = (messages = []) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.messageType === "system" && /rejected/i.test(msg?.message || "")) {
      return msg;
    }
  }
  return null;
};

export const deriveNegotiationUiState = ({ negotiation, messages, currentUserId }) => {
  const status = negotiation?.status || "closed";
  const isOpen = status === "open";
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";
  const isClosed = status === "closed";

  const auctionStatus = negotiation?.productId?.auctionStatus;
  const endTime = negotiation?.productId?.auctionEndTime;
  const endTimeMs = endTime ? new Date(endTime).getTime() : null;
  const auctionEndedByTime = Number.isFinite(endTimeMs) ? endTimeMs <= Date.now() : false;
  const auctionEndedByStatus = Boolean(auctionStatus && auctionStatus !== "active");
  const isAuctionEnded = auctionEndedByStatus || auctionEndedByTime;
  const isClosedByAuctionEnd = !isAccepted && isAuctionEnded;

  const buyerId = toIdString(negotiation?.buyerId);
  const sellerId = toIdString(negotiation?.sellerId);
  const userId = toIdString(currentUserId);

  const latestOffer = getLatestOfferMessage(messages || []);
  const latestOfferSenderId = toIdString(latestOffer?.senderId);

  const isCurrentUserBuyer = userId && userId === buyerId;
  const isCurrentUserSeller = userId && userId === sellerId;

  const canBuyerRespondToLatestOffer = Boolean(
    isOpen &&
      !isAuctionEnded &&
      latestOffer &&
      isCurrentUserBuyer &&
      latestOfferSenderId &&
      latestOfferSenderId !== buyerId
  );

  const canSellerRespondToLatestOffer = Boolean(
    isOpen &&
      !isAuctionEnded &&
      latestOffer &&
      isCurrentUserSeller &&
      latestOfferSenderId &&
      latestOfferSenderId !== sellerId
  );

  const areActionsDisabled = !isOpen || isAuctionEnded;

  const waitingFor = isOpen && latestOffer
    ? latestOfferSenderId === buyerId
      ? "seller"
      : latestOfferSenderId === sellerId
        ? "buyer"
        : null
    : null;

  const acceptedAmount =
    Number(negotiation?.acceptedOfferAmount) ||
    Number(latestOffer?.offerAmount) ||
    Number(negotiation?.productId?.offerPrice) ||
    null;

  const lastRejectedMessage = getLastRejectedSystemMessage(messages || []);

  // hasPendingOffer: true when a pending offer exists and is awaiting the other party.
  // isOfferSendDisabled: no new offer may be sent while one is pending, or thread is closed.
  const hasPendingOffer = !!latestOffer;
  const isOfferSendDisabled = areActionsDisabled || hasPendingOffer;

  return {
    status,
    statusLabel: isAccepted ? "accepted" : isClosedByAuctionEnd ? "auction ended" : status,
    isOpen,
    isAccepted,
    isRejected,
    isClosed,
    isAuctionEnded,
    isClosedByAuctionEnd,
    latestOffer,
    latestOfferSenderId,
    canBuyerRespondToLatestOffer,
    canSellerRespondToLatestOffer,
    areActionsDisabled,
    isOfferSendDisabled,
    hasPendingOffer,
    waitingFor,
    acceptedAmount,
    lastRejectedMessage,
  };
};
