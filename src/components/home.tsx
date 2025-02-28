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

  const handleLogin = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    setLoginError("");
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (err: any) {
      setLoginError(
        err.message || "Failed to login. Please check your credentials.",
      );
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
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8 flex flex-col items-center">
        <div className="flex items-center justify-center mb-4">
          <Droplets className="h-12 w-12 text-blue-600 mr-2" />
          <h1 className="text-3xl font-bold text-blue-800">Water Billing</h1>
        </div>
        <p className="text-gray-600 text-center">
          Admin Portal for Water Utility Billing Management
        </p>
      </div>

      <LoginForm
        onSubmit={handleLogin}
        onForgotPassword={handleForgotPassword}
        isLoading={isLoading}
        error={loginError || error || ""}
      />

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Secure access for authorized personnel only</p>
        <p className="mt-2">
          &copy; {new Date().getFullYear()} Water Utility Company. All rights
          reserved.
        </p>
      </div>
    </div>
  );
};

export default Home;
