import express from "express";
import { addProduct, getSellerProducts, getProductById } from "../controllers/productController.js";
import authSeller from "../middlewares/authSeller.js";
import { upload } from "../config/multer.js";

const router = express.Router();

// Only sellers can add products
router.post("/add", authSeller, upload.array("images", 5), addProduct);

// Only sellers can see their own products
router.get("/my-products", authSeller, getSellerProducts);

// Get single product by ID (public)
router.get("/:id", getProductById);

export default router;