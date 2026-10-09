"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { authApi } from "@/services/auth";
import { apiError } from "@/services/http";
import type { User } from "@/types";
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function reload() {
    try {
      setUser(await authApi.me());
      setError("");
    } catch (initialError) {
      if (
        axios.isAxiosError(initialError) &&
        initialError.response?.status === 401
      ) {
        try {
          await authApi.refresh();
          setUser(await authApi.me());
          setError("");
        } catch (refreshError) {
          setUser(null);
          setError(
            axios.isAxiosError(refreshError) &&
              refreshError.response?.status === 401
              ? ""
              : apiError(refreshError),
          );
        }
      } else {
        setUser(null);
        setError(apiError(initialError));
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function login(email: string, password: string) {
    await authApi.login(email, password);
    setUser(await authApi.me());
    setError("");
  }
  async function logout() {
    await authApi.logout();
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, logout, reload }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw Error("AuthProvider is required.");
  return value;
}
export function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading, error, reload } = useAuth();
  if (loading)
    return (
      <main className="access-page">
        <p>Loading account…</p>
      </main>
    );
  if (error)
    return (
      <main className="access-page">
        <h1>Account unavailable</h1>
        <p role="alert">{error}</p>
        <button onClick={() => void reload()}>Retry</button>
      </main>
    );
  if (!user)
    return (
      <main className="access-page">
        <h1>Sign in to continue</h1>
        <a
          href={
            "/login?next=" +
            encodeURIComponent(
              typeof window !== "undefined"
                ? window.location.pathname + window.location.search
                : "/workspace",
            )
          }
        >
          Sign in
        </a>
      </main>
    );
  if (admin && user.role !== "admin")
    return (
      <main className="access-page">
        <h1>Admin access required</h1>
        <a href="/workspace">Dashboard</a>
      </main>
    );
  return children;
}
