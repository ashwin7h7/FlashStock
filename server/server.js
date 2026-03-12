import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import "dotenv/config";

import userRouter from "./routes/userRoute.js";
import productRoutes from "./routes/productRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import pickupRoutes from "./routes/pickupRoutes.js";

import connectCloudinary from "./config/cloudinary.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import Bid from "./models/Bid.js";
import Notification from "./models/Notification.js";
import Pickup from "./models/Pickup.js";
import User from "./models/User.js";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

// Connect Database
await connectDB();

// Connect Cloudinary
await connectCloudinary();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Routes
//http://localhost:4000/
app.get("/", (req, res) => res.send("API is Working"));
app.use("/api/user", userRouter);
app.use("/api/product", productRoutes);
app.use("/api/auction", auctionRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/pickups", pickupRoutes);

// ---------------- SOCKET.IO ----------------

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// In-memory auction state
// { auctionId: { highestBid, highestBidder } }
const auctionState = {};

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join auction room
  socket.on("joinAuction", (auctionId) => {
    socket.join(auctionId);
    console.log(`Socket ${socket.id} joined auction ${auctionId}`);
  });

  // Place bid
  socket.on("placeBid", async ({ auctionId, bidderId, amount }) => {

    try {
      // 1. Convert and validate bid amount
      const bidAmount = Number(amount);
      if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
        return socket.emit("bidError", { auctionId, message: "Invalid bid amount" });
      }

      const auction = await Product.findById(auctionId);
      if (!auction) {
        return socket.emit("bidError", { auctionId, message: "Auction not found" });
      }

      // 2. Check auction is active
      if (!auction.isAuction || auction.auctionStatus === "ended") {
        return socket.emit("bidError", { auctionId, message: "This auction is not active" });
      }

      // 3. Check auction has not ended
      if (auction.auctionEndTime && new Date() >= new Date(auction.auctionEndTime)) {
        return socket.emit("bidError", { auctionId, message: "Auction has ended" });
      }

      // 4. Seller cannot bid on own auction
      if (auction.sellerId.toString() === String(bidderId)) {
        return socket.emit("bidError", { auctionId, message: "Seller cannot bid on own auction" });
      }

      // 5. Convert current highest bid to Number and compare
      const currentHighest = Number(auction.offerPrice) || 0;
      if (bidAmount <= currentHighest) {
        return socket.emit("bidError", {
          auctionId,
          message: `Bid must be higher than the current highest bid of ${currentHighest}`
        });
      }

      // 6. All checks passed — save bid record, then update auction
      const previousBidderId = auction.highestBidderId;

      await Bid.create({ productId: auctionId, bidderId, amount: bidAmount });

      auction.offerPrice = bidAmount;
      auction.highestBidderId = bidderId;
      await auction.save();

      // Notify previous highest bidder that they were outbid
      if (previousBidderId && previousBidderId.toString() !== String(bidderId)) {
        await Notification.create({
          userId: previousBidderId,
          type: "outbid",
          title: "You have been outbid!",
          message: `Someone placed a higher bid of ${bidAmount} on "${auction.name}".`,
          relatedProductId: auctionId
        });
      }

      // Notify seller about bid activity
      if (!previousBidderId) {
        // First bid on this auction
        await Notification.create({
          userId: auction.sellerId,
          type: "first_bid",
          title: "First bid received!",
          message: `Your auction "${auction.name}" received its first bid of Rs. ${bidAmount}.`,
          relatedProductId: auctionId
        });
      } else {
        // Subsequent higher bid
        await Notification.create({
          userId: auction.sellerId,
          type: "new_higher_bid",
          title: "New higher bid placed!",
          message: `A new bid of Rs. ${bidAmount} was placed on "${auction.name}".`,
          relatedProductId: auctionId
        });
      }

      // Keep in-memory state in sync (used by endAuction handler)
      auctionState[auctionId] = {
        highestBid: bidAmount,
        highestBidder: bidderId
      };

      // Look up bidder name for the broadcast
      const bidder = await User.findById(bidderId).select("name");

      // Broadcast only on successful acceptance
      io.to(auctionId).emit("bidUpdate", {
        auctionId,
        amount: bidAmount,
        bidderId,
        bidderName: bidder?.name || "Anonymous"
      });

    } catch (error) {
      console.error("Bid Error:", error.message);
    }

  });

  // End auction
  socket.on("endAuction", async (auctionId) => {
    // Manual end is now a no-op — auctions are ended automatically by the server interval.
    // Kept for backward compatibility; clients can still emit this but it does nothing.
    console.log(`Manual endAuction event received for ${auctionId} — ignored (auto-end handles this)`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

});

// ---------------- AUTO-END AUCTIONS ----------------

const endExpiredAuctions = async () => {
  try {
    // Find auctions that are active but past their end time
    const expiredAuctions = await Product.find({
      isAuction: true,
      auctionStatus: "active",
      auctionEndTime: { $lte: new Date() }
    });

    for (const auction of expiredAuctions) {
      // Determine winner
      const winnerId = auction.highestBidderId || null;

      // Mark auction as ended
      auction.auctionStatus = "ended";
      auction.winnerId = winnerId;
      await auction.save();

      // Create order for winner (only if there is one and no order exists yet)
      if (winnerId) {
        const existingOrder = await Order.findOne({ productId: auction._id });
        if (!existingOrder) {
          const order = await Order.create({
            userId: winnerId,
            productId: auction._id,
            price: auction.offerPrice
          });

          // Create Pickup record
          await Pickup.create({
            productId: auction._id,
            sellerId: auction.sellerId,
            buyerId: winnerId,
            orderId: order._id
          });

          // Notify winner
          await Notification.create({
            userId: winnerId,
            type: "auction_won",
            title: "You won an auction!",
            message: `Congratulations! You won "${auction.name}" with a bid of ${auction.offerPrice}.`,
            relatedProductId: auction._id
          });

          // Notify seller
          await Notification.create({
            userId: auction.sellerId,
            type: "auction_sold",
            title: "Your auction has ended!",
            message: `Your product "${auction.name}" was sold for ${auction.offerPrice}.`,
            relatedProductId: auction._id
          });
        }
      } else {
        // No bids — notify seller
        await Notification.create({
          userId: auction.sellerId,
          type: "auction_no_bids",
          title: "Auction ended without bids",
          message: `Your auction for "${auction.name}" ended with no bids.`,
          relatedProductId: auction._id
        });
      }

      // Notify connected clients
      io.to(auction._id.toString()).emit("auctionEnded", {
        auctionId: auction._id,
        winner: winnerId,
        finalBid: auction.offerPrice
      });

      // Clear in-memory state
      delete auctionState[auction._id.toString()];

      console.log(`Auction auto-ended: ${auction._id} | Winner: ${winnerId || "none"}`);
    }
  } catch (error) {
    console.error("Auto-end auction error:", error.message);
  }
};

// Run every 10 seconds
setInterval(endExpiredAuctions, 10 * 1000);

// Start server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
