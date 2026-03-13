// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  location: { type: String, default: "" },
  profileImage: { type: String, default: "" },
  roles: { type: [String], default: ["user"] } // make sure this exists
}, { timestamps: true });

const User = mongoose.models.user || mongoose.model("user", userSchema);
export default User;