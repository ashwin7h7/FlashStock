import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ----------------- REGISTER -----------------\
//http://localhost:4000/api/user/register
export const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing details" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Default role is 'user'
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      roles: ["buyer"],
    });

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      user: { _id: user._id, email: user.email, name: user.name, roles: user.roles },
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- LOGIN -----------------
//http://localhost:4000/api/user/login
// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body; // no role needed here

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "No account found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      user: { _id: user._id, email: user.email, name: user.name, roles: user.roles },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ----------------- CHECK AUTH -----------------
//http://localhost:4000/api/user/isAuth
export const isAuth = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ----------------- LOGOUT -----------------
//http://localhost:4000/api/user/logout
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//http://localhost:4000/api/user/upgrade-to-seller
// Upgrade to seller
export const upgradeToSeller = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success:false, message:"User not found" });
    if (user.roles.includes("seller")) return res.json({ success:true, message:"Already seller" });
    user.roles.push("seller");
    await user.save();
    return res.json({ success:true, message:"Upgraded to seller", user: { name: user.name, email: user.email, roles: user.roles } });
  } catch (error) {
    return res.status(500).json({ success:false, message:error.message });
  }
};
