import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await API.get("/user/is-auth");
      if (data.success) {
        setUser(data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await API.post("/user/login", { email, password });
    if (data.success) {
      setUser(data.user);
    }
    return data.success ? { ...data, roles: data.user?.roles } : data;
  };

  const register = async (fullName, email, password) => {
    const { data } = await API.post("/user/register", { fullName, email, password });
    if (data.success) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    await API.get("/user/logout");
    setUser(null);
  };

  const isSeller = () => user?.roles?.includes("seller");
  const isBuyer = () => !!user;

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, checkAuth, isSeller, isBuyer }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
