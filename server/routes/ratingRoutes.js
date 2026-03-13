import express from "express";
import authUser from "../middlewares/authUser.js";
import { getMySubmittedRatings, getSellerRatingSummary, submitSellerRating } from "../controllers/ratingController.js";

const router = express.Router();

router.post("/", authUser, submitSellerRating);
router.get("/mine", authUser, getMySubmittedRatings);
router.get("/seller/:sellerId", getSellerRatingSummary); // public — only aggregate summary

export default router;
