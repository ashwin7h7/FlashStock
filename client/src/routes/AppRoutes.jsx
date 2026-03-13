import { Routes, Route } from "react-router-dom";

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import BuyerLayout from "../layouts/BuyerLayout";
import SellerLayout from "../layouts/SellerLayout";

// Route guards
import ProtectedRoute from "./ProtectedRoute";
import SellerRoute from "./SellerRoute";

// Public pages
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Register from "../pages/public/Register";
import BrowseAuctions from "../pages/public/BrowseAuctions";

// Buyer pages
import BuyerDashboard from "../pages/buyer/BuyerDashboard";
import AuctionDetails from "../pages/buyer/AuctionDetails";
import MyActiveBids from "../pages/buyer/MyActiveBids";
import WonAuctions from "../pages/buyer/WonAuctions";
import WonAuctionDetails from "../pages/buyer/WonAuctionDetails";
import BuyerNotifications from "../pages/buyer/BuyerNotifications";
import BuyerProfile from "../pages/buyer/BuyerProfile";
import EditProfile from "../pages/shared/EditProfile";
import MyPickups from "../pages/buyer/MyPickups";
import BuyerNegotiations from "../pages/buyer/BuyerNegotiations";
import BuyerNegotiationChat from "../pages/buyer/BuyerNegotiationChat";

// Seller pages
import SellerDashboard from "../pages/seller/SellerDashboard";
import AddProduct from "../pages/seller/AddProduct";
import MyProducts from "../pages/seller/MyProducts";
import MyAuctions from "../pages/seller/MyAuctions";
import SellerNotifications from "../pages/seller/SellerNotifications";
import SellerProfile from "../pages/seller/SellerProfile";
import SellerPickups from "../pages/seller/SellerPickups";
import SellerAuctionMonitor from "../pages/seller/SellerAuctionMonitor";
import SellerNegotiations from "../pages/seller/SellerNegotiations";
import SellerNegotiationChat from "../pages/seller/SellerNegotiationChat";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auctions" element={<BrowseAuctions />} />
        <Route path="/auctions/:id" element={<AuctionDetails />} />
      </Route>

      {/* Buyer routes (protected) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<BuyerLayout />}>
          <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
          <Route path="/buyer/auctions/:id" element={<AuctionDetails />} />
          <Route path="/buyer/bids" element={<MyActiveBids />} />
          <Route path="/buyer/won" element={<WonAuctions />} />
          <Route path="/buyer/won/:id" element={<WonAuctionDetails />} />
          <Route path="/buyer/pickups" element={<MyPickups />} />
          <Route path="/buyer/negotiations" element={<BuyerNegotiations />} />
          <Route path="/buyer/negotiations/:id" element={<BuyerNegotiationChat />} />
          <Route path="/buyer/notifications" element={<BuyerNotifications />} />
          <Route path="/buyer/profile" element={<BuyerProfile />} />
          <Route path="/buyer/profile/edit" element={<EditProfile />} />
        </Route>
      </Route>

      {/* Seller routes (protected + seller role) */}
      <Route element={<SellerRoute />}>
        <Route element={<SellerLayout />}>
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/add-product" element={<AddProduct />} />
          <Route path="/seller/products" element={<MyProducts />} />
          <Route path="/seller/auctions" element={<MyAuctions />} />
          <Route path="/seller/auctions/:id" element={<SellerAuctionMonitor />} />
          <Route path="/seller/negotiations" element={<SellerNegotiations />} />
          <Route path="/seller/negotiations/:id" element={<SellerNegotiationChat />} />
          <Route path="/seller/pickups" element={<SellerPickups />} />
          <Route path="/seller/notifications" element={<SellerNotifications />} />
          <Route path="/seller/profile" element={<SellerProfile />} />
          <Route path="/seller/profile/edit" element={<EditProfile />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRoutes;
