import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";

const AddProduct = () => {
  const [form, setForm] = useState({ name: "", description: "", price: "", offerPrice: "", category: "" });
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

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
      };

      const formData = new FormData();
      formData.append("productData", JSON.stringify(productData));
      images.forEach((file) => formData.append("images", file));

      const { data } = await API.post("/product/add", formData);
      if (data.success) {
        setSuccess("Product added successfully!");
        setForm({ name: "", description: "", price: "", offerPrice: "", category: "" });
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-lg">
        {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm mb-4">{success}</p>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <input name="name" type="text" required value={form.name} onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" required value={form.description} onChange={handleChange} rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rs.)</label>
          <input name="price" type="number" required value={form.price} onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price (Rs.)</label>
          <input name="offerPrice" type="number" value={form.offerPrice} onChange={handleChange}
            placeholder="Defaults to price if empty"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input name="category" type="text" required value={form.category} onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Images (up to 5)</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange}
            className="w-full text-sm" />
          {images.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{images.length} file(s) selected</p>
          )}
        </div>
        <button type="submit" disabled={submitting}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? "Adding..." : "Add Product"}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
