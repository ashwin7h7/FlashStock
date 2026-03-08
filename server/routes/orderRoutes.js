import express from "express";
import { getUserOrders } from "../controllers/orderController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/my-orders", authUser, getUserOrders);

export default router;