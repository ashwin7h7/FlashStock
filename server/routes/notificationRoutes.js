import express from "express";
import { getUnreadCount, getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../controllers/notificationController.js";
import authUser from "../middlewares/authUser.js";

const router = express.Router();

router.get("/count/unread", authUser, getUnreadCount);
router.get("/", authUser, getMyNotifications);
router.patch("/read-all", authUser, markAllNotificationsAsRead);
router.patch("/:id/read", authUser, markNotificationAsRead);

export default router;
