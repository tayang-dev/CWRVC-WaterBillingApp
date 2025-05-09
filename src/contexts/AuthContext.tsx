import React, { createContext, useContext, useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  signIn,
  signOut,
  signUp,
  resetPassword,
} from "../services/authService";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  userRole: "admin" | "staff"| "meter_reader" | null;
  login: (
    email: string,
    password: string,
    role: "admin" | "staff" | "meter_reader",
  ) => Promise<User>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    role: "admin" | "staff" | "meter_reader",
  ) => Promise<User>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "staff" | "meter_reader"| null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Get user role from localStorage
          const savedRole = localStorage.getItem("userRole");
          if (savedRole === "admin" || savedRole === "staff" || savedRole === "meter_reader") {
            setUserRole(savedRole);
          } else {
            // Default to admin if no role is found
            setUserRole("admin");
          }
        } catch (error) {
          console.error("Error getting user role:", error);
          setUserRole("admin"); // Default fallback
        }
      } else {
        setUserRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (
    email: string,
    password: string,
    role: "admin" | "staff" | "meter_reader",
  ) => {
    setLoading(true);
    try {
      const user = await signIn(email, password);
      setUserRole(role);
      localStorage.setItem("userRole", role);
      setError(null);
      return user;
    } catch (err: any) {
      setError(err.message || "Failed to login");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      setUserRole(null);
      localStorage.removeItem("userRole");
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to logout");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    role: "admin" | "staff" | "meter_reader",
  ) => {
    setLoading(true);
    try {
      const user = await signUp(email, password, displayName);
      setUserRole(role);
      localStorage.setItem("userRole", role);
      setError(null);
      return user;
    } catch (err: any) {
      setError(err.message || "Failed to register");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await resetPassword(email);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    currentUser,
    loading,
    error,
    userRole,
    login,
    logout,
    register,
    forgotPassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
