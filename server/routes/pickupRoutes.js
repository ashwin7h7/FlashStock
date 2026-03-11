import express from "express";
import { getMyPickups, getPickupById, confirmPickupBySeller, confirmPickupByBuyer } from "../controllers/pickupController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/", authUser, getMyPickups);
router.get("/:id", authUser, getPickupById);
router.patch("/:id/confirm-seller", authUser, confirmPickupBySeller);
router.patch("/:id/confirm-buyer", authUser, confirmPickupByBuyer);

export default router;
