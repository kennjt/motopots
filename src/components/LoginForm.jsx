import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { showError, showSuccess } from "../utils/swal";
import {
  findCustomerProfile,
  readActiveCustomerProfile,
  setActiveCustomerProfile,
} from "../data/customerProfileStorage";

function LoginForm({ role, onClose, onCreateAccount, onForgotPassword }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const isCustomer = role === "customer";

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (role === "customer") {
      try {
        const email = formData.email.trim();
        const savedProfile = findCustomerProfile(email);
        const currentProfile = readActiveCustomerProfile();
        const matchingCurrentProfile = currentProfile?.email.toLowerCase() === email.toLowerCase()
          ? currentProfile
          : null;
        setActiveCustomerProfile(savedProfile || matchingCurrentProfile || { name: "", email, phone: "" });
      } catch (error) {
        showError("Unable to load customer profile", error.message || "Please try again.");
        return;
      }
    }
    showSuccess("Login successful", `Welcome back${formData.email ? `, ${formData.email}` : ""}.`);

    if (role === "customer") {
      navigate("/customer");
    } else {
      navigate("/staff");
    }
  };

  const handleCreateAccount = () => {
    if (onCreateAccount) {
      onCreateAccount();
      return;
    }

    navigate("/register");
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="dialog"
      aria-modal="true"
      aria-label={isCustomer ? "User sign in" : "Admin sign in"}
      className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[25rem] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#22222B] p-5 shadow-xl shadow-black/30 sm:max-h-[calc(100dvh-2rem)]"
    >

      <button
        type="button"
        aria-label="Close login form"
        onClick={onClose}
        className="absolute right-3 top-2 rounded px-2 text-2xl leading-none text-[#A1A1AA] transition hover:text-[#E63946]"
      >
        &times;
      </button>

      <div className="mt-5 mb-0 text-center text-2xl font-bold text-[#F5F5F5]">
        {isCustomer ? "Welcome Back!" : "Admin Login"}
      </div>

      <p className="text-center text-sm text-[#A1A1AA]">
        {isCustomer
          ? "Log in to continue to your account."
          : "Log in to continue to your account."}
      </p>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">
          {isCustomer ? "Email" : "Username / Email"}
        </label>

        <input
          type="text"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder={isCustomer ? "example@gmail.com" : "example@gmail.com"}
          required
          className="w-full rounded-xl border border-white/10 bg-[#15151C] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">
          Password
        </label>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="●●●●●●●"
            required
            className="w-full rounded-xl border border-white/10 bg-[#15151C] px-4 py-3 pr-16 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#E63946]"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-semibold text-[#E63946] no-underline hover:underline"
        >
          Forgot Password?
        </button>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl border border-[#E63946] bg-[#E63946] py-3 font-extrabold text-white shadow-lg shadow-[#E63946]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#C92D3A] hover:shadow-xl"
      >
        {isCustomer ? "Login" : "Login"}
      </button>

      {isCustomer && (
        <p className="pt-2 text-center text-sm text-[#A1A1AA]">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={handleCreateAccount}
            className="font-bold text-[#E63946] no-underline hover:underline"
          >
            Create Account
          </button>
        </p>
      )}
    </form>
  );
}

export default LoginForm;
