import express from "express";
import { getUserOrderById, getUserOrders } from "../controllers/orderController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/my-orders", authUser, getUserOrders);
router.get("/my-orders/:id", authUser, getUserOrderById);

export default router;