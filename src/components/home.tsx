import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router";
import LoginForm from "./auth/LoginForm";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
const Home = () => {
  const { login, forgotPassword, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();

  // Define allowed emails with roles
  const allowedEmails = {
    "centennialwaterventureresource@gmail.com": "admin",
    "sarahfabella11@gmail.com": "staff",
    "haroldbatula34@gmail.com": "meter_reader",
  };

  const handleLogin = async (values) => {
    setIsLoading(true);
    setLoginError("");
  
    try {
      const q = query(collection(db, "staffs"), where("email", "==", values.email));
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
  
        if (userData.status !== "active") {
          throw new Error("Account is inactive. Contact administrator.");
        }
  
        await login(values.email, values.password, userData.role); // Assume login accepts role
        navigate("/dashboard");
      } else {
        throw new Error("Unauthorized email. Please use a valid email.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError(err.message || "Invalid email or password. Please try again.");
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
      } catch (err) {
        alert(err.message || "Failed to send password reset email.");
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-6xl px-4">
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Side - Company Info */}
          <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 md:p-12 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row items-center mb-6 md:mb-8">
              <img
                src="/assets/logo.png"
                alt="Company Logo"
                className="h-16 w-16 md:h-20 md:w-20 mb-4 md:mb-0 md:mr-6 rounded-full border-4 border-white shadow-lg"
              />
              <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight text-center md:text-left">
                Centennial Water Resource Venture Corporation
              </h2>
            </div>
            <p className="text-base md:text-xl leading-relaxed opacity-90 mb-4 md:mb-6 text-center md:text-left">
              Welcome to your water billing portal. Seamlessly manage your water services,
              track usage, and handle billing with ease and convenience.
            </p>
            <div className="hidden md:block border-t border-blue-400 pt-6">
              <p className="text-sm md:text-base italic opacity-75 text-center md:text-left">
                Empowering communities through efficient water resource management
              </p>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="md:w-1/2 p-6 md:p-12 flex items-center justify-center bg-white">
            <div className="w-full max-w-md">
              <LoginForm
                onSubmit={handleLogin}
                onForgotPassword={handleForgotPassword}
                isLoading={isLoading}
                error={loginError || error || ""}
              />
            </div>
          </div>
        </div>

        {/* Mobile-only Tagline */}
        <div className="md:hidden text-center text-sm text-white mt-4 relative z-10">
          Empowering communities through efficient water resource management
        </div>
      </div>
    </div>
  );
};

export default Home;