import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  findCustomerProfile,
  saveCustomerAccountProfile,
} from "../data/customerProfileStorage";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  terms: false,
};

function getValidationErrors(formData) {
  const passwordScore = [
    formData.password.length >= 8,
    /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password),
    /\d/.test(formData.password) && /[^A-Za-z0-9]/.test(formData.password),
  ].filter(Boolean).length;

  return {
    fullName: formData.fullName.trim() ? "" : "Please enter your full name.",
    email: !formData.email.trim()
      ? "Email is required."
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
        ? ""
        : "Enter a valid email address.",
    phone: formData.phone.trim() ? "" : "Phone number is required.",
    password:
      passwordScore >= 2
        ? ""
        : "Use at least 8 characters with upper and lowercase letters.",
    confirmPassword: !formData.confirmPassword
      ? "Please confirm your password."
      : formData.password === formData.confirmPassword
        ? ""
        : "Passwords do not match.",
    terms: formData.terms ? "" : "Please accept the terms to continue.",
  };
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.7 4.2 10 7-0.5 1.1-1.6 2.9-3.6 4.5M6.1 6.1C3.8 7.7 2.5 10 2 12c1.3 2.8 4.8 7 10 7 1 0 1.9-.2 2.8-.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function AccountCreation() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const passwordScore = [
    formData.password.length >= 8,
    /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password),
    /\d/.test(formData.password) && /[^A-Za-z0-9]/.test(formData.password),
  ].filter(Boolean).length;
  const strength =
    passwordScore < 2 ? "Weak" : passwordScore === 2 ? "Medium" : "Strong";
  const validationErrors = getValidationErrors(formData);
  const canSubmit = Object.values(validationErrors).every((error) => !error);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSuccess(false);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError("");
    setSuccess(false);
    if (!canSubmit) {
      setFormError("Please correct the highlighted fields and try again.");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const email = formData.email.trim();
      if (findCustomerProfile(email)) {
        setFormError(
          "A profile with this email is already saved on this device. Please log in or use a different email.",
        );
        return;
      }

      saveCustomerAccountProfile({
        name: formData.fullName,
        email,
        phone: formData.phone,
      });
      setSuccess(true);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Your account could not be saved. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#15151C] px-4 py-2.5 text-[#F5F5F5] outline-none transition placeholder:text-[#71717A] focus:border-[#E63946] focus:ring-4 focus:ring-[#E63946]/10";
  const errorClass = "mt-1.5 text-xs font-semibold text-[#FF8B93]";

  return (
    <main
      className="auth-modal-backdrop mobile-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-6 sm:py-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) navigate("/");
      }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-labelledby="accountCreationTitle"
        aria-describedby="accountCreationDescription"
        aria-modal="true"
        className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#1B1B23] shadow-2xl shadow-black/50 sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#E63946] via-[#FF727D] to-[#E63946]" />
        <div className="p-5 sm:p-7">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF727D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E63946]" />
                Motopot&apos;s Food House
              </p>
              <h1
                id="accountCreationTitle"
                className="font-heading text-3xl font-extrabold leading-tight text-[#F5F5F5]"
              >
                Create your account
              </h1>
              <p
                id="accountCreationDescription"
                className="mt-2 max-w-md text-sm leading-relaxed text-[#A1A1AA]"
              >
                Save your details for a smoother checkout next time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Close account creation"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-xl leading-none text-[#A1A1AA] transition hover:border-white/20 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#E63946]/40"
            >
              &times;
            </button>
          </header>
          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-[#FF8B93]/30 bg-[#FF8B93]/10 p-3 text-sm text-[#FFB0B5]"
            >
              {formError}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200"
            >
              Your profile has been saved on this device.
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-sm font-bold text-[#F5F5F5]"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                  className={inputClass}
                  autoComplete="name"
                  required
                  aria-invalid={submitted && Boolean(validationErrors.fullName)}
                />
                {submitted && validationErrors.fullName && (
                  <p className={errorClass}>{validationErrors.fullName}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-bold text-[#F5F5F5]"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={`${inputClass} ${submitted && validationErrors.email ? "border-[#FF8B93]" : ""}`}
                  autoComplete="email"
                  required
                  aria-invalid={submitted && Boolean(validationErrors.email)}
                />
                {submitted && validationErrors.email && (
                  <p className={errorClass}>{validationErrors.email}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 block text-sm font-bold text-[#F5F5F5]"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="09XX XXX XXXX"
                  className={inputClass}
                  autoComplete="tel"
                  required
                  aria-invalid={submitted && Boolean(validationErrors.phone)}
                />
                {submitted && validationErrors.phone && (
                  <p className={errorClass}>{validationErrors.phone}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-bold text-[#F5F5F5]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className={`${inputClass} pr-12 ${submitted && validationErrors.password ? "border-[#FF8B93]" : ""}`}
                    autoComplete="new-password"
                    required
                    aria-invalid={submitted && Boolean(validationErrors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#A1A1AA] transition hover:text-[#E63946] focus:outline-none focus:ring-2 focus:ring-[#E63946]/30"
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      <span
                        className={`h-1 flex-1 rounded-full ${passwordScore >= 1 ? (passwordScore === 1 ? "bg-[#E63946]" : "bg-amber-400") : "bg-white/10"}`}
                      />
                      <span
                        className={`h-1 flex-1 rounded-full ${passwordScore >= 2 ? (passwordScore === 2 ? "bg-amber-400" : "bg-emerald-400") : "bg-white/10"}`}
                      />
                      <span
                        className={`h-1 flex-1 rounded-full ${passwordScore >= 3 ? "bg-emerald-400" : "bg-white/10"}`}
                      />
                    </div>
                    <p className="mt-1 text-xs font-bold text-[#A1A1AA]">
                      {strength}{" "}
                      <span className="font-normal">
                        · Use letters, numbers, and symbols
                      </span>
                    </p>
                  </div>
                )}
                {submitted && validationErrors.password && (
                  <p className={errorClass}>{validationErrors.password}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-bold text-[#F5F5F5]"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className={`${inputClass} pr-12 ${submitted && validationErrors.confirmPassword ? "border-[#FF8B93]" : ""}`}
                    autoComplete="new-password"
                    required
                    aria-invalid={
                      submitted && Boolean(validationErrors.confirmPassword)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmed password"
                        : "Show confirmed password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#A1A1AA] transition hover:text-[#E63946] focus:outline-none focus:ring-2 focus:ring-[#E63946]/30"
                  >
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>
                {submitted && validationErrors.confirmPassword && (
                  <p className={errorClass}>
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm leading-relaxed text-[#A1A1AA]">
              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                className="mt-1 h-4 w-4 shrink-0 accent-[#E63946]"
                required
                aria-invalid={submitted && Boolean(validationErrors.terms)}
              />
              <span>
                I agree to the{" "}
                <a
                  href="#terms"
                  className="font-bold text-[#E63946] hover:underline"
                >
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a
                  href="#privacy"
                  className="font-bold text-[#E63946] hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {submitted && validationErrors.terms && (
              <p className={errorClass}>{validationErrors.terms}</p>
            )}
            <button
              type="submit"
              disabled={isLoading || success}
              aria-busy={isLoading}
              className="w-full rounded-xl border border-[#E63946] bg-[#E63946] py-3.5 font-extrabold text-white shadow-lg shadow-[#E63946]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#C92D3A] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isLoading
                ? "Saving profile…"
                : success
                  ? "Profile Saved"
                  : "Create Account"}
            </button>
          </form>
          <p className="mt-5 border-t border-white/10 pt-4 text-center text-sm text-[#A1A1AA]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/?login=user")}
              className="font-extrabold text-[#E63946] hover:underline"
            >
              Log In
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default AccountCreation;
