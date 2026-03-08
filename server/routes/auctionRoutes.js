import express from "express";
import { startAuction, getActiveAuctions } from "../controllers/auctionController.js";
import authSeller from "../middlewares/authSeller.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.post("/start", authSeller, startAuction);
router.get("/active", authUser, getActiveAuctions);

export default router;