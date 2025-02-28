import React from "react";
import { Droplets } from "lucide-react";
import LoginForm from "./auth/LoginForm";

const Home = () => {
  const handleLogin = (values: { email: string; password: string }) => {
    console.log("Login attempt with:", values);
    // In a real application, this would handle authentication with Firebase
  };

  const handleForgotPassword = () => {
    console.log("Forgot password clicked");
    // In a real application, this would trigger password recovery flow
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
