import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome to Flash Stock</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl">
        Buy and sell through live auctions. Find deals, place bids, and win products in real time.
      </p>
      <div className="flex gap-4">
        <Link to="/auctions" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 text-lg">
          Browse Auctions
        </Link>
        <Link to="/register" className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50 text-lg">
          Get Started
        </Link>
      </div>
    </div>
  );
};

export default Home;
