import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

/**
 * Auth mechanism: httpOnly cookie-based JWT.
 *
 * - Backend sets an httpOnly "token" cookie on login/register.
 * - Frontend sends it automatically via axios withCredentials: true.
 * - All tabs in the SAME browser profile share the same cookie.
 *
 * This means if you log in as User A in Tab 1 and User B in Tab 2,
 * Tab 2's login overwrites the cookie — both tabs will use User B's
 * session on the next API call.
 *
 * To test multiple users simultaneously, use:
 *   - Different browsers (Chrome + Firefox)
 *   - Incognito / private window (separate cookie jar)
 *   - Different browser profiles
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user from the server cookie
  const checkAuth = useCallback(async () => {
    try {
      const { data } = await API.get("/user/is-auth");
      if (data.success) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-sync auth state when the tab regains visibility.
  // This handles the case where another tab logged in as a different user
  // (overwriting the shared cookie), so this tab updates to match.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkAuth();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkAuth]);

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
    try {
      await API.get("/user/logout");
    } catch {
      // Even if the server call fails, clear client state
    }
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
