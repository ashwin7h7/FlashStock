const toId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  if (typeof value?.toString === "function") return String(value.toString());
  return null;
};

export const isAuctionClosedByNegotiation = (product) => {
  return product?.auctionStatus === "closed_by_negotiation";
};

export const isAuctionFinalized = (product) => {
  return Boolean(
    !product?.isAuction ||
      product?.auctionStatus === "ended" ||
      isAuctionClosedByNegotiation(product)
  );
};

export const getResolvedWinnerId = (product, bids = []) => {
  return toId(product?.winnerId) || toId(product?.highestBidderId) || toId(bids[0]?.bidderId);
};

export const hasAcceptedBids = (product, bids = []) => {
  const currentBid = Number(product?.offerPrice) || 0;
  const startingBid = Number(product?.startingBid) || 0;

  return Boolean(
    getResolvedWinnerId(product, bids) ||
      bids.length > 0 ||
      (product?.isAuction && currentBid > startingBid)
  );
};

export const getEndedAuctionState = (product, bids = []) => {
  const resolvedWinnerId = getResolvedWinnerId(product, bids);
  const acceptedBids = hasAcceptedBids(product, bids);
  const closedByNegotiation = isAuctionClosedByNegotiation(product);

  return {
    resolvedWinnerId,
    hasAcceptedBids: acceptedBids,
    endedWithWinner: acceptedBids,
    endedWithNoBids: !acceptedBids,
    closedByNegotiation,
  };
};