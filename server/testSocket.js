import { io } from "socket.io-client";

// Connect to your server
const socket = io("http://localhost:4000");

// Auction ID from your MongoDB
const auctionId = "69ae5fba469b5efd0ff51cf4";

// Simulated user
const bidderId = "testUser123";

// When connected
socket.on("connect", () => {

  console.log("Connected to server:", socket.id);

  // Join auction room
  socket.emit("joinAuction", auctionId);
  console.log("Joined auction:", auctionId);

  // First bid
  setTimeout(() => {
    console.log("Placing bid: 60000");

    socket.emit("placeBid", {
      auctionId,
      bidderId,
      amount: 60000
    });

  }, 2000);

  // Second bid (higher)
  setTimeout(() => {
    console.log("Placing bid: 65000");

    socket.emit("placeBid", {
      auctionId,
      bidderId,
      amount: 65000
    });

  }, 4000);

  // Third bid (higher)
  setTimeout(() => {
    console.log("Placing bid: 70000");

    socket.emit("placeBid", {
      auctionId,
      bidderId,
      amount: 70000
    });

  }, 6000);

  // End auction
  setTimeout(() => {
    console.log("Ending auction...");

    socket.emit("endAuction", auctionId);

  }, 10000);

});


// Listen for bid updates
socket.on("bidUpdate", (data) => {

  console.log("New Highest Bid:");
  console.log("Auction:", data.auctionId);
  console.log("Bid Amount:", data.amount);
  console.log("Bidder:", data.bidderId);
  console.log("-----------------------");

});


// Listen for auction ended
socket.on("auctionEnded", (data) => {

  console.log("Auction Finished!");
  console.log("Winner:", data.winner);
  console.log("Final Price:", data.finalBid);
  console.log("-----------------------");

});


// Handle disconnect
socket.on("disconnect", () => {
  console.log("Disconnected from server");
});


// Error handler
socket.on("connect_error", (error) => {
  console.log("Connection Error:", error.message);
});