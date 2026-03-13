import API from "../api/axios";

const extractMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const startNegotiation = async (productId) => {
  try {
    const { data } = await API.post("/negotiations/start", { productId });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to start negotiation"));
  }
};

export const getMyNegotiations = async () => {
  try {
    const { data } = await API.get("/negotiations/my");
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch negotiations"));
  }
};

export const getNegotiationDetails = async (negotiationId) => {
  try {
    const { data } = await API.get(`/negotiations/${negotiationId}`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch negotiation details"));
  }
};

export const getNegotiationMessages = async (negotiationId) => {
  try {
    const { data } = await API.get(`/negotiations/${negotiationId}/messages`);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to fetch negotiation messages"));
  }
};

export const sendNegotiationMessage = async (negotiationId, message) => {
  try {
    const { data } = await API.post(`/negotiations/${negotiationId}/messages`, {
      messageType: "text",
      message,
    });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to send message"));
  }
};

export const sendNegotiationOffer = async (negotiationId, offerAmount) => {
  try {
    const { data } = await API.post(`/negotiations/${negotiationId}/messages`, {
      messageType: "offer",
      offerAmount,
    });
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to send offer"));
  }
};

export const acceptNegotiationOffer = async (negotiationId, offerAmount) => {
  try {
    const payload = Number.isFinite(Number(offerAmount)) ? { offerAmount: Number(offerAmount) } : {};
    const { data } = await API.patch(`/negotiations/${negotiationId}/accept-offer`, payload);
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to accept offer"));
  }
};

export const rejectNegotiationOffer = async (negotiationId) => {
  try {
    const { data } = await API.patch(`/negotiations/${negotiationId}/reject-offer`, {});
    return data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to reject offer"));
  }
};
