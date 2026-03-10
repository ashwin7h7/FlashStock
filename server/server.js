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

import Product from "./models/Product.js";
import Order from "./models/Order.js";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

// Connect Database
await connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Routes
//http://localhost:4000/
app.get("/", (req, res) => res.send("API is Working"));
app.use("/api/user", userRouter);
app.use("/api/product", productRoutes);
app.use("/api/auction", auctionRoutes);

// ---------------- SOCKET.IO ----------------

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
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
      const auction = await Product.findById(auctionId);
      if (!auction) return;

      // Initialize auction state
      if (!auctionState[auctionId]) {
        auctionState[auctionId] = {
          highestBid: auction.offerPrice || auction.price,
          highestBidder: null
        };

      }

      // Check bid is higher
      if (amount > auctionState[auctionId].highestBid) {
        auctionState[auctionId].highestBid = amount;
        auctionState[auctionId].highestBidder = bidderId;

        // Update product price
        auction.offerPrice = amount;
        await auction.save();

        // Broadcast bid update
        io.to(auctionId).emit("bidUpdate", {
          auctionId,
          amount,
          bidderId
        });

      }

    } catch (error) {
      console.error("Bid Error:", error.message);
    }

  });

  // End auction
  socket.on("endAuction", async (auctionId) => {

    const state = auctionState[auctionId];
    if (!state) return;

    try {
      const auction = await Product.findById(auctionId);
      if (!auction) return;

      // Set winner
      auction.winner = state.highestBidder;

      await auction.save();

      // Save order for winner
      await Order.create({
        userId: state.highestBidder,
        productId: auctionId,
        price: state.highestBid
      });

      // Notify users
      io.to(auctionId).emit("auctionEnded", {
        auctionId,
        winner: state.highestBidder,
        finalBid: state.highestBid
      });
      // Clear memory
      delete auctionState[auctionId];
    } catch (error) {
        console.error("Auction End Error:", error.message);
    }

  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

});

// Start server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
