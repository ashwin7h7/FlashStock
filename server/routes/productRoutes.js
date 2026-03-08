import express from "express";
import { addProduct, getSellerProducts } from "../controllers/productController.js";
import authSeller from "../middlewares/authSeller.js";

const router = express.Router();

// Only sellers can add products
router.post("/add", authSeller, addProduct);

// Only sellers can see their own products
router.get("/my-products", authSeller, getSellerProducts);

export default router;