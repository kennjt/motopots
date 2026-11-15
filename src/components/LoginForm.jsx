import { useNavigate } from "react-router-dom";
import { useState } from "react";

function LoginForm({ role }) {
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
      navigate("/customer");
    } else {
      navigate("/staff");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#1F2A44]">
          {isCustomer ? "Email" : "Username / Email"}
        </label>

        <input
          type="text"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder={isCustomer ? "example@gmail.com" : "example@gmail.com"}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#B3231B] focus:ring-2 focus:ring-[#B3231B]/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#1F2A44]">
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 outline-none transition focus:border-[#B3231B] focus:ring-2 focus:ring-[#B3231B]/20"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#B3231B]"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href="#forgot-password"
          className="text-sm font-semibold text-[#B3231B] no-underline hover:underline"
        >
          Forgot Password?
        </a>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-[#B3231B] py-3 font-extrabold text-white transition hover:bg-[#8C1913]"
      >
        {isCustomer ? "Login" : "Login"}
      </button>

      {isCustomer && (
        <p className="pt-2 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <a
            href="#register"
            className="font-bold text-[#B3231B] no-underline hover:underline"
          >
            Create Account
          </a>
        </p>
      )}
    </form>
  );
}

export default LoginForm;
