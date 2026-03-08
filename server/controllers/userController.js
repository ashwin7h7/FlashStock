import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ----------------- REGISTER -----------------\
//http://localhost:4000/api/user/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body; // role: "user" or "seller"

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "Missing details" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // If role already exists, return error
      if (existingUser.roles.includes(role)) {
        return res
          .status(400)
          .json({
            success: false,
            message: `${role} already exists for this account`,
          });
      }

      // Add new role to existing user
      existingUser.roles.push(role);
      await existingUser.save();

      return res.status(200).json({
        success: true,
        message: `Account upgraded with role ${role}`,
        user: {
          email: existingUser.email,
          name: existingUser.name,
          roles: existingUser.roles,
        },
      });
    }

    // Create new user with the role
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      roles: [role],
    });

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      user: { email: user.email, name: user.name, roles: user.roles },
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
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ success:false, message:"Missing credentials" });

    const user = await User.findOne({ email });
    if (!user || !user.roles.includes(role)) return res.status(401).json({ success:false, message:`No account as ${role}` });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success:false, message:"Invalid password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV==="production", sameSite:"strict", maxAge:7*24*60*60*1000 });

    return res.status(200).json({ success:true, user });
  } catch (error) {
    return res.status(500).json({ success:false, message:error.message });
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
    return res.json({ success:true, message:"Upgraded to seller" });
  } catch (error) {
    return res.status(500).json({ success:false, message:error.message });
  }
};
