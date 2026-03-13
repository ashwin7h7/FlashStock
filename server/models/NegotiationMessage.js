import mongoose from "mongoose";

const negotiationMessageSchema = new mongoose.Schema(
  {
    negotiationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "negotiation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    messageType: {
      type: String,
      enum: ["text", "offer", "system"],
      default: "text",
    },
    offerAmount: {
      type: Number,
      default: null,
    },
    // Only relevant for messageType === "offer"
    // "pending"  – offer is awaiting response
    // "accepted" – receiver accepted this specific offer
    // "rejected" – receiver rejected this specific offer
    // null       – text / system messages
    offerStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: null,
    },
  },
  { timestamps: true }
);

const NegotiationMessage =
  mongoose.models.negotiationmessage ||
  mongoose.model("negotiationmessage", negotiationMessageSchema);

export default NegotiationMessage;
