import express from "express";
import { registerSeller, loginSeller, isSellerAuth, logoutSeller } from "../controllers/sellerController.js";
import authSeller from "../middlewares/authSeller.js";

const sellerRouter = express.Router();

// Register a new seller
sellerRouter.post("/register", registerSeller);

// Seller login
sellerRouter.post("/login", loginSeller);

// Check seller authentication (protected)
sellerRouter.get("/is-auth", authSeller, isSellerAuth);

// Seller logout (protected)
sellerRouter.get("/logout", authSeller, logoutSeller);

export default sellerRouter;