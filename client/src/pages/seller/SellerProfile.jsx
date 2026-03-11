import { useAuth } from "../../context/AuthContext";

const SellerProfile = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Seller Profile</h1>
      <div className="bg-white rounded-lg shadow p-6 max-w-lg">
        <div className="mb-4">
          <p className="text-sm text-gray-500">Name</p>
          <p className="text-lg font-semibold">{user?.name}</p>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-lg">{user?.email}</p>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Roles</p>
          <div className="flex gap-2 mt-1">
            {user?.roles?.map((role) => (
              <span key={role} className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700">
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerProfile;
