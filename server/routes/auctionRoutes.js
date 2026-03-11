import express from "express";
import { startAuction, getActiveAuctions, getEndedAuctions, getBidHistory } from "../controllers/auctionController.js";
import authSeller from "../middlewares/authSeller.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.post("/start", authSeller, startAuction);
router.get("/active", authUser, getActiveAuctions);
router.get("/ended", authUser, getEndedAuctions);
router.get("/:productId/bids", authUser, getBidHistory);

export default router;