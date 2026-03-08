import express from "express";
import { isAuth, login, logout, register, upgradeToSeller } from "../controllers/userController.js";
import authUser from "../middlewares/authUser.js";

const userRouter = express.Router();

// Auth routes
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.get("/is-auth", authUser, isAuth);
userRouter.get("/logout", authUser, logout);

// Upgrade to seller route
userRouter.patch("/upgrade-to-seller", authUser, upgradeToSeller);

export default userRouter;