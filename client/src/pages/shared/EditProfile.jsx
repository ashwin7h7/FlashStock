import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const DISTRICT_OPTIONS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
  "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
];

const EditProfile = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", error: false });
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    location: user?.location || "",
  });

  const isSellerView = useMemo(() => location.pathname.startsWith("/seller"), [location.pathname]);
  const cancelPath = isSellerView ? "/seller/profile" : "/buyer/profile";

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  useEffect(() => {
    if (!selectedImageFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImageFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImageFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImageFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please select a valid image file.", error: true });
      e.target.value = "";
      return;
    }

    setMessage({ text: "", error: false });
    setSelectedImageFile(file);
  };

  const validate = () => {
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const district = form.location.trim();

    if (!fullName) return "Full name is required";
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    if (!district) return "District/location is required";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setMessage({ text: validationError, error: true });
      return;
    }

    setSaving(true);
    setMessage({ text: "", error: false });
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (selectedImageFile) {
        formData.append("profileImage", selectedImageFile);
      }

      const { data } = await API.patch("/user/profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (!data.success) {
        setMessage({ text: data.message || "Failed to update profile", error: true });
        return;
      }

      await checkAuth();
      setMessage({ text: "Profile updated successfully.", error: false });
      setTimeout(() => navigate(cancelPath), 600);
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to update profile";
      setMessage({ text: errMsg, error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-lg space-y-4">
        {message.text && (
          <p className={`text-sm ${message.error ? "text-red-600" : "text-green-600"}`}>
            {message.text}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={onChange}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
          <input
            name="phone"
            type="text"
            value={form.phone}
            onChange={onChange}
            placeholder="e.g. 0771234567"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District / Location</label>
          <select
            name="location"
            value={form.location}
            onChange={onChange}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select district</option>
            {DISTRICT_OPTIONS.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {selectedImageFile ? `Selected: ${selectedImageFile.name}` : "No new image selected"}
          </p>
          {(previewUrl || user?.profileImage) && (
            <img
              src={previewUrl || user?.profileImage}
              alt="Profile preview"
              className="mt-2 w-20 h-20 rounded-full object-cover border border-gray-200"
            />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate(cancelPath)}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;
