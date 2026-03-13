import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

const buildCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = process.env.COOKIE_SAME_SITE || (isProd ? "none" : "strict");
  const secure = process.env.COOKIE_SECURE === "true" ? true : isProd;

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

// ----------------- REGISTER -----------------\
//http://localhost:4000/api/user/register
export const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing details" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Default role is 'user'
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: fullName,
      email: normalizedEmail,
      password: hashedPassword,
      roles: ["buyer"],
    });

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, buildCookieOptions());

    return res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        profileImage: user.profileImage,
        roles: user.roles,
      },
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

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ success: false, message: "No account found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, buildCookieOptions());

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        location: user.location,
        profileImage: user.profileImage,
        roles: user.roles,
      },
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
      secure: buildCookieOptions().secure,
      sameSite: buildCookieOptions().sameSite,
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

// ----------------- UPDATE PROFILE -----------------
// PATCH /api/user/profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { fullName, email, phone, location } = req.body;

    const nameValue = String(fullName || "").trim();
    const emailValue = String(email || "").trim().toLowerCase();
    const locationValue = String(location || "").trim();
    const phoneValue = phone == null ? "" : String(phone).trim();
    if (!nameValue) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address" });
    }

    if (!locationValue) {
      return res.status(400).json({ success: false, message: "District/location is required" });
    }

    const existingUser = await User.findOne({ email: emailValue, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already in use by another account" });
    }

    let uploadedProfileImageUrl;
    if (req.file) {
      try {
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          resource_type: "image",
          folder: "flashstock/profiles",
        });
        uploadedProfileImageUrl = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: "Profile image upload failed. Please try a different image.",
        });
      }
    }

    const updatePayload = {
      name: nameValue,
      email: emailValue,
      phone: phoneValue,
      location: locationValue,
    };
    if (uploadedProfileImageUrl) {
      updatePayload.profileImage = uploadedProfileImageUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updatePayload,
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ success: false, message: "Email already in use by another account" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
