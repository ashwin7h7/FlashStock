import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authSeller = async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) return res.status(401).json({ success: false, message: "Not Authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.roles.includes("seller")) {
      return res.status(403).json({ success: false, message: "Not authorized as seller" });
    }
    req.userId = user._id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export default authSeller;