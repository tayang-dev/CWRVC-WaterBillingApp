import React, { useState } from "react";
import { Droplets } from "lucide-react";
import LoginForm from "./auth/LoginForm";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { login, forgotPassword, error, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (values: {
    email: string;
    password: string;
    role: "admin" | "staff";
  }) => {
    setIsLoading(true);
    setLoginError("");
    try {
      await login(values.email, values.password, values.role);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setLoginError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setLoginError(
          "Too many failed login attempts. Please try again later or reset your password."
        );
      } else {
        setLoginError(
          err.message || "Failed to login. Please check your credentials."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = prompt("Please enter your email address");
    if (email) {
      try {
        await forgotPassword(email);
        alert("Password reset email sent. Please check your inbox.");
      } catch (err: any) {
        alert(err.message || "Failed to send password reset email.");
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/src/assets/background.jpg')",
        }}
      ></div>

      {/* Gradient Overlay for readability */}
    

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-end min-h-screen p-6 sm:p-8">
        {/* Login Card */}
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <Droplets className="h-14 w-14 text-blue-600 mr-2" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800">
                CWRVC Water Billing
              </h1>
            </div>
            <p className="text-gray-600 text-sm sm:text-base text-center">
              Secure access for authorized personnel only
            </p>
          </div>

          <LoginForm
            onSubmit={handleLogin}
            onForgotPassword={handleForgotPassword}
            isLoading={isLoading}
            error={loginError || error || ""}
          />

          <div className="mt-8 text-center text-xs text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} Water Utility Company. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
