import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const SRI_LANKA_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
  "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
];

const AddProduct = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", description: "", price: "", offerPrice: "", category: "", location: "" });
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const sellerLocation = user?.location?.trim();
    if (sellerLocation && !form.location) {
      setForm((prev) => ({ ...prev, location: sellerLocation }));
    }
  }, [user?.location]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files).slice(0, 5));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (images.length === 0) {
      setError("Please select at least one image");
      return;
    }

    setSubmitting(true);
    try {
      const productData = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        offerPrice: Number(form.offerPrice || form.price),
        category: form.category,
        location: form.location,
      };

      const formData = new FormData();
      formData.append("productData", JSON.stringify(productData));
      images.forEach((file) => formData.append("images", file));

      const { data } = await API.post("/product/add", formData);
      if (data.success) {
        setSuccess("Product added successfully!");
        setForm({ name: "", description: "", price: "", offerPrice: "", category: "", location: "" });
        setImages([]);
        setTimeout(() => navigate("/seller/products"), 1500);
      } else {
        setError(data.message || "Failed to add product");
      }
    } catch (err) {
      console.error("Add product error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to add product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      {/* ── Page heading ── */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Add Product</h1>
        <p className="mt-1.5 text-sm text-slate-500">Create a new product listing for auction.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.09)] sm:p-8">
        {/* ── Status messages ── */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* ── Fields ── */}
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Product Name</label>
            <input
              name="name" type="text" required value={form.name} onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              name="description" required value={form.description} onChange={handleChange} rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Price (Rs.)</label>
              <input
                name="price" type="number" required value={form.price} onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Offer Price (Rs.)</label>
              <input
                name="offerPrice" type="number" value={form.offerPrice} onChange={handleChange}
                placeholder="Defaults to price if empty"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
            <input
              name="category" type="text" required value={form.category} onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Location (District)</label>
            <select
              name="location" required value={form.location} onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm transition duration-150 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">Select a district</option>
              {SRI_LANKA_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {user?.location?.trim() && (
              <p className="mt-1.5 text-xs text-slate-500">Defaulted to your profile district. You can change it per listing.</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Images <span className="font-normal text-slate-400">(up to 5)</span></label>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition duration-150 hover:border-indigo-300 hover:bg-indigo-50/30">
              <input
                type="file" accept="image/*" multiple onChange={handleImageChange}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-600 hover:file:bg-indigo-100"
              />
              {images.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">{images.length} file{images.length !== 1 ? "s" : ""} selected</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Submit button ── */}
        <div className="mt-7">
          <button
            type="submit" disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-[0_8px_20px_rgba(79,70,229,0.26)] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
