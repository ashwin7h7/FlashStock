import express from "express";
import {
  startNegotiation,
  getMyNegotiations,
  getNegotiationById,
  getMessages,
  sendMessage,
  acceptOffer,
  rejectOffer,
} from "../controllers/negotiationController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

// All negotiation endpoints require an authenticated user
router.post("/start", authUser, startNegotiation);
router.get("/my", authUser, getMyNegotiations);
router.get("/:id", authUser, getNegotiationById);
router.get("/:id/messages", authUser, getMessages);
router.post("/:id/messages", authUser, sendMessage);
router.patch("/:id/accept-offer", authUser, acceptOffer);
router.patch("/:id/reject-offer", authUser, rejectOffer);

export default router;
