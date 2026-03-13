import Negotiation from "../models/Negotiation.js";
import NegotiationMessage from "../models/NegotiationMessage.js";
import Product from "../models/Product.js";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import Pickup from "../models/Pickup.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const notify = async ({ userId, type, title, message, relatedProductId }) => {
  try {
    await Notification.create({ userId, type, title, message, relatedProductId });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (typeof value.toString === "function") {
      const raw = value.toString();
      return raw === "[object Object]" ? "" : String(raw);
    }
  }
  return String(value);
};

const isParticipant = (negotiation, userId) => {
  const uid = toIdString(userId);
  return (
    toIdString(negotiation.sellerId) === uid ||
    toIdString(negotiation.buyerId) === uid
  );
};

const getLatestOfferMessage = async (negotiationId) => {
  return NegotiationMessage.findOne({
    negotiationId,
    messageType: "offer",
    offerStatus: "pending",
  })
    .sort({ createdAt: -1 })
    .lean();
};

const closeCompetingNegotiations = async (acceptedNegotiation) => {
  const competingThreads = await Negotiation.find({
    productId: acceptedNegotiation.productId,
    _id: { $ne: acceptedNegotiation._id },
    status: "open",
  }).select("_id sellerId buyerId");

  if (competingThreads.length === 0) return;

  await Negotiation.updateMany(
    { _id: { $in: competingThreads.map((thread) => thread._id) } },
    { $set: { status: "closed" } }
  );

  await NegotiationMessage.insertMany(
    competingThreads.map((thread) => ({
      negotiationId: thread._id,
      senderId: thread.sellerId,
      message: "This negotiation was closed because the product was sold through another accepted negotiation.",
      messageType: "system",
    }))
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/start
// Buyer starts (or retrieves) a negotiation thread for a product.
// ─────────────────────────────────────────────────────────────────────────────
export const startNegotiation = async (req, res) => {
  try {
    const { productId } = req.body;
    const buyerId = req.userId;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!product.isAuction || product.auctionStatus !== "active") {
      return res.status(400).json({
        success: false,
        message: "Negotiation is only available while the auction is active",
      });
    }

    // Buyer cannot negotiate on their own product
    if (String(product.sellerId) === String(buyerId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot negotiate on your own product",
      });
    }

    // Return existing open thread if one already exists
    const existing = await Negotiation.findOne({
      productId,
      buyerId,
      status: "open",
    });

    if (existing) {
      return res.json({ success: true, negotiation: existing });
    }

    const negotiation = await Negotiation.create({
      productId,
      sellerId: product.sellerId,
      buyerId,
    });

    // Notify seller
    await notify({
      userId: product.sellerId,
      type: "negotiation_started",
      title: "New negotiation request",
      message: `A buyer has started a negotiation for your product "${product.name}".`,
      relatedProductId: product._id,
    });

    return res.status(201).json({ success: true, negotiation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/negotiations/my
// Return all negotiations relevant to the logged-in user.
// ─────────────────────────────────────────────────────────────────────────────
export const getMyNegotiations = async (req, res) => {
  try {
    const userId = req.userId;

    const negotiations = await Negotiation.find({
      $or: [{ sellerId: userId }, { buyerId: userId }],
    })
      .populate("productId", "name image offerPrice auctionStatus")
      .populate("sellerId", "name email")
      .populate("buyerId", "name email")
      .sort({ updatedAt: -1 });

    res.json({ success: true, negotiations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/negotiations/:id
// Return negotiation details (participants only).
// ─────────────────────────────────────────────────────────────────────────────
export const getNegotiationById = async (req, res) => {
  try {
    const negotiation = await Negotiation.findById(req.params.id)
      .populate("productId", "name image offerPrice startingBid auctionStatus sellerId")
      .populate("sellerId", "name email")
      .populate("buyerId", "name email");

    if (!negotiation) {
      return res.status(404).json({ success: false, message: "Negotiation not found" });
    }

    if (!isParticipant(negotiation, req.userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, negotiation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/negotiations/:id/messages
// Return messages in a thread (oldest first).
// ─────────────────────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const negotiation = await Negotiation.findById(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ success: false, message: "Negotiation not found" });
    }

    if (!isParticipant(negotiation, req.userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messages = await NegotiationMessage.find({
      negotiationId: req.params.id,
    })
      .populate("senderId", "name")
      .sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/negotiations/:id/messages
// Send a text or offer message.
// ─────────────────────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { message, messageType, offerAmount } = req.body;
    const senderId = req.userId;

    const negotiation = await Negotiation.findById(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ success: false, message: "Negotiation not found" });
    }

    if (!isParticipant(negotiation, senderId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (negotiation.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Cannot send messages on a ${negotiation.status} negotiation`,
      });
    }

    const type = messageType || "text";

    if (!["text", "offer"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "messageType must be 'text' or 'offer'",
      });
    }

    if (type === "offer") {
      const amount = Number(offerAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "offerAmount must be a positive number for offer messages",
        });
      }

      // One-pending-offer rule: block new offer if one is already awaiting response
      const existingPending = await NegotiationMessage.exists({
        negotiationId: negotiation._id,
        messageType: "offer",
        offerStatus: "pending",
      });
      if (existingPending) {
        return res.status(409).json({
          success: false,
          message: "There is already a pending offer waiting for a response.",
        });
      }
    }

    if (type === "text" && (!message || !message.trim())) {
      return res.status(400).json({
        success: false,
        message: "message is required for text messages",
      });
    }

    const newMessage = await NegotiationMessage.create({
      negotiationId: negotiation._id,
      senderId,
      message: message?.trim() || "",
      messageType: type,
      offerAmount: type === "offer" ? Number(offerAmount) : null,
      offerStatus: type === "offer" ? "pending" : null,
    });

    await newMessage.populate("senderId", "name");

    // Notify the other participant
    const recipientId =
      String(senderId) === String(negotiation.buyerId)
        ? negotiation.sellerId
        : negotiation.buyerId;

    const product = await Product.findById(negotiation.productId).select("name");
    const notifTitle =
      type === "offer"
        ? "New offer in negotiation"
        : "New message in negotiation";
    const notifMsg =
      type === "offer"
        ? `An offer of Rs. ${offerAmount} was made for "${product?.name || "a product"}".`
        : `New message in your negotiation for "${product?.name || "a product"}".`;

    await notify({
      userId: recipientId,
      type: type === "offer" ? "negotiation_offer" : "negotiation_message",
      title: notifTitle,
      message: notifMsg,
      relatedProductId: negotiation.productId,
    });

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/negotiations/:id/accept-offer
// Receiver of the latest offer accepts.
// ─────────────────────────────────────────────────────────────────────────────
export const acceptOffer = async (req, res) => {
  try {
    const userId = req.userId;

    const negotiation = await Negotiation.findById(req.params.id).populate(
      "productId",
      "name"
    );
    if (!negotiation) {
      return res.status(404).json({ success: false, message: "Negotiation not found" });
    }

    if (!isParticipant(negotiation, userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (negotiation.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Negotiation is already ${negotiation.status}`,
      });
    }

    const latestOffer = await getLatestOfferMessage(negotiation._id);
    if (!latestOffer || !Number.isFinite(Number(latestOffer.offerAmount)) || Number(latestOffer.offerAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "No pending offer found to accept",
      });
    }

    const latestOfferSenderId = toIdString(latestOffer.senderId);
    const responderId = toIdString(userId);

    if (latestOfferSenderId === responderId) {
      return res.status(403).json({
        success: false,
        message: "Offer sender cannot accept their own offer",
      });
    }

    const amount = Number(latestOffer.offerAmount);

    // Mark this specific offer message as accepted before updating negotiation
    await NegotiationMessage.findByIdAndUpdate(latestOffer._id, { offerStatus: "accepted" });

    const winningBuyerId = negotiation.buyerId;

    negotiation.status = "accepted";
    negotiation.acceptedOfferAmount = amount;
    await negotiation.save();

    const product = await Product.findById(negotiation.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    product.auctionStatus = "closed_by_negotiation";
    product.offerPrice = amount;
    product.highestBidderId = winningBuyerId;
    product.winnerId = winningBuyerId;
    product.closedByNegotiationAt = new Date();
    product.auctionEndTime = new Date();
    await product.save();

    const existingOrder = await Order.findOne({ productId: product._id });
    if (!existingOrder) {
      const order = await Order.create({
        userId: winningBuyerId,
        productId: product._id,
        price: amount,
      });

      await Pickup.create({
        productId: product._id,
        sellerId: negotiation.sellerId,
        buyerId: winningBuyerId,
        orderId: order._id,
      });
    }

    await closeCompetingNegotiations(negotiation);

    // System message
    await NegotiationMessage.create({
      negotiationId: negotiation._id,
      senderId: userId,
      message: `Offer of Rs. ${amount} accepted.`,
      messageType: "system",
      offerAmount: amount,
    });

    // Notify the offer sender that their offer was accepted
    await notify({
      userId: latestOfferSenderId,
      type: "negotiation_accepted",
      title: "Your offer was accepted!",
      message: `Your offer of Rs. ${amount} for "${negotiation.productId?.name || "a product"}" has been accepted. The auction is now closed by negotiation.`,
      relatedProductId: negotiation.productId?._id || negotiation.productId,
    });

    await notify({
      userId: negotiation.sellerId,
      type: "negotiation_sale_closed",
      title: "Product sold by negotiation",
      message: `"${negotiation.productId?.name || "A product"}" was closed by negotiation for Rs. ${amount}.`,
      relatedProductId: negotiation.productId?._id || negotiation.productId,
    });

    await notify({
      userId: winningBuyerId,
      type: "negotiation_sale_closed",
      title: "You secured the product by negotiation",
      message: `You agreed to purchase "${negotiation.productId?.name || "a product"}" for Rs. ${amount}.`,
      relatedProductId: negotiation.productId?._id || negotiation.productId,
    });

    res.json({ success: true, negotiation, acceptedOfferAmount: amount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/negotiations/:id/reject-offer
// Receiver of the latest offer rejects — thread stays open.
// ─────────────────────────────────────────────────────────────────────────────
export const rejectOffer = async (req, res) => {
  try {
    const userId = req.userId;

    const negotiation = await Negotiation.findById(req.params.id).populate(
      "productId",
      "name"
    );
    if (!negotiation) {
      return res.status(404).json({ success: false, message: "Negotiation not found" });
    }

    if (!isParticipant(negotiation, userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (negotiation.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Negotiation is already ${negotiation.status}`,
      });
    }

    const latestOffer = await getLatestOfferMessage(negotiation._id);
    if (!latestOffer || !Number.isFinite(Number(latestOffer.offerAmount)) || Number(latestOffer.offerAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "No pending offer found to reject",
      });
    }

    const latestOfferSenderId = toIdString(latestOffer.senderId);
    const responderId = toIdString(userId);

    if (latestOfferSenderId === responderId) {
      return res.status(403).json({
        success: false,
        message: "Offer sender cannot reject their own offer",
      });
    }

    // Mark this specific offer message as rejected
    await NegotiationMessage.findByIdAndUpdate(latestOffer._id, { offerStatus: "rejected" });

    // Keep thread open so either party can counter-offer; just post a system message
    await NegotiationMessage.create({
      negotiationId: negotiation._id,
      senderId: userId,
      message: `Offer of Rs. ${Number(latestOffer.offerAmount)} rejected. The negotiation remains open for further discussion.`,
      messageType: "system",
    });

    // Notify the offer sender that their offer was rejected
    const product = await Product.findById(negotiation.productId).select("name");
    await notify({
      userId: latestOfferSenderId,
      type: "negotiation_rejected",
      title: "Your offer was rejected",
      message: `Your offer for "${product?.name || "a product"}" was rejected. You can make a new offer.`,
      relatedProductId: negotiation.productId,
    });

    res.json({
      success: true,
      message: "Offer rejected. Thread remains open for further discussion.",
      negotiation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
