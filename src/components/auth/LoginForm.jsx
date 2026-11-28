import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { showError, showSuccess } from "../../utils/swal";
import { supabase } from "../../utils/supabase";
import { customerSupabase } from "../../utils/customerSupabase";

function LoginForm({
  role,
  onRoleChange,
  onClose,
  onCreateAccount,
  onForgotPassword,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (role === "customer") {
      setIsLoading(true);
      try {
        const email = formData.email.trim();
        const { data, error } = await customerSupabase.auth.signInWithPassword({ email, password: formData.password });
        if (error || !data.session) throw error || new Error("Invalid login credentials.");
      } catch {
        showError("Unable to log in", "Invalid email or password, or your email has not been confirmed yet.");
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    } else {
      const username = formData.email.trim();
      setIsLoading(true);
      try {
        const response = await fetch(
          "https://qiggtwvpkkurjqflshtm.supabase.co/functions/v1/employee-login",
          {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "content-type": "application/json",
            },
            body: JSON.stringify({ username, password: formData.password }),
          },
        );
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const message = response.status === 429
            ? "Too many login attempts. Please try again later."
            : response.status === 503
              ? "Authentication is temporarily unavailable. Please try again later."
              : "Invalid username or password.";
          throw new Error(message);
        }

        if (!payload?.access_token || !payload?.refresh_token) {
          throw new Error("Authentication is temporarily unavailable. Please try again later.");
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });
        if (sessionError) throw new Error("Authentication is temporarily unavailable. Please try again later.");

        showSuccess("Login successful", "Welcome back.");
        navigate("/staff");
      } catch (error) {
        showError(
          "Unable to log in",
          error instanceof TypeError
            ? "Unable to reach the authentication service. Please try again."
            : error.message || "Invalid username or password.",
        );
      } finally {
        setIsLoading(false);
      }
      return;
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

      <div className="-mb-2 flex justify-end">
        <button
          type="button"
          aria-label="Close login form"
          onClick={onClose}
          className="-translate-y-2 flex h-7 w-7 items-center justify-center rounded-full text-2xl leading-none text-[#A1A1AA] transition hover:bg-white/5 hover:text-[#E63946] focus:outline-none focus:ring-2 focus:ring-[#E63946]/40"
        >
          &times;
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#15151C] p-1">
        <button
          type="button"
          aria-pressed={isCustomer}
          onClick={() => onRoleChange("customer")}
          className={`min-h-10 rounded-lg px-2 text-sm font-bold transition ${
            isCustomer
              ? "bg-[#E63946] text-white"
              : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          Customer Login
        </button>
        <button
          type="button"
          aria-pressed={!isCustomer}
          onClick={() => onRoleChange("staff")}
          className={`min-h-10 rounded-lg px-2 text-sm font-bold transition ${
            !isCustomer
              ? "bg-[#E63946] text-white"
              : "text-[#A1A1AA] hover:text-white"
          }`}
        >
          Admin Login
        </button>
      </div>

      <div className="mt-0 mb-0 text-center text-2xl font-bold text-[#F5F5F5]">
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
        disabled={isLoading}
        className="w-full rounded-xl border border-[#E63946] bg-[#E63946] py-3 font-extrabold text-white shadow-lg shadow-[#E63946]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#C92D3A] hover:shadow-xl"
      >
        {isLoading ? "Logging in..." : "Login"}
      </button>

      <p
        aria-hidden={!isCustomer}
        className={`pt-2 text-center text-sm ${
          isCustomer ? "text-[#A1A1AA]" : "invisible text-[#A1A1AA]"
        }`}
      >
        Don't have an account?{" "}
        {isCustomer ? (
          <button
            type="button"
            onClick={handleCreateAccount}
            className="font-bold text-[#E63946] no-underline hover:underline"
          >
            Create Account
          </button>
        ) : (
          <span className="font-bold text-[#E63946]">Create Account</span>
        )}
      </p>
    </form>
  );
}

export default LoginForm;
