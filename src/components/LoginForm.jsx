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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#22222B] p-5 shadow-xl shadow-black/30">
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
        <a
          href="#forgot-password"
          className="text-sm font-semibold text-[#E63946] no-underline hover:underline"
        >
          Forgot Password?
        </a>
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
            onClick={() => navigate("/register")}
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
