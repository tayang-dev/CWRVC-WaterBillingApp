import React, { useState, FormEvent } from 'react';

// Define the interface for LoginForm props
export interface LoginFormProps {
  onSubmit: (values: { 
    email: string; 
    password: string; 
    role: "admin" | "staff" 
  }) => Promise<void>;
  onForgotPassword: () => void;
  isLoading: boolean;
  error: string;
  className?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPassword,
  isLoading,
  error,
  className = ''
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<"admin" | "staff">("admin");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit({ email, password, role });
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`space-y-4 ${className}`}
    >
      {/* Email Input */}
      <div>
        <label 
          htmlFor="email" 
          className="block text-sm font-medium text-cyan-100 mb-2"
        >
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-cyan-300/30 bg-white/10 rounded-lg text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Enter your email"
        />
      </div>

      {/* Password Input */}
      <div>
        <label 
          htmlFor="password" 
          className="block text-sm font-medium text-cyan-100 mb-2"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-cyan-300/30 bg-white/10 rounded-lg text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Enter your password"
        />
      </div>

      {/* Role Selection */}
      <div>
        <label 
          htmlFor="role" 
          className="block text-sm font-medium text-cyan-100 mb-2"
        >
          Role
        </label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "staff")}
          className="w-full px-3 py-2 border border-cyan-300/30 bg-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="admin" className="bg-blue-900">Admin</option>
          <option value="staff" className="bg-blue-900">Staff</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 transition-colors duration-300 disabled:opacity-50"
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      {/* Forgot Password */}
      <div className="text-center">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-cyan-200 hover:text-white underline"
        >
          Forgot Password?
        </button>
      </div>
    </form>
  );
};

export default LoginForm;