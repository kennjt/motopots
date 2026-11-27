import { useState } from "react";
import { customerSupabase } from "../utils/customerSupabase";

const inputClassName = "w-full rounded-xl border border-white/10 bg-[#15151C] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20";
const buttonClassName = "w-full rounded-xl border border-[#E63946] bg-[#E63946] py-3 font-extrabold text-white shadow-lg shadow-[#E63946]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#C92D3A] disabled:cursor-wait disabled:opacity-70";

function ForgotPasswordForm({ onClose, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    const { error: resetError } = await customerSupabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: "https://kennjt.github.io/motopots/",
    });
    setLoading(false);
    if (resetError) {
      setError("Unable to send the reset email. Please try again later.");
      return;
    }
    setSent(true);
  };

  return (
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[25rem] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#22222B] p-5 shadow-xl shadow-black/30">
      <button type="button" aria-label="Close forgot password form" onClick={onClose} className="absolute right-3 top-2 rounded px-2 text-2xl leading-none text-[#A1A1AA] hover:text-[#E63946]">&times;</button>
      {sent ? (
        <div className="space-y-4 text-center">
          <h2 id="forgot-password-title" className="mt-5 text-2xl font-bold text-[#F5F5F5]">Check Your Email</h2>
          <p className="text-sm leading-6 text-[#A1A1AA]">If an account exists for that address, a password reset link has been sent.</p>
          <button type="button" onClick={onBackToLogin} className={buttonClassName}>Back to Login</button>
        </div>
      ) : (
        <>
          <h2 id="forgot-password-title" className="mt-5 text-center text-2xl font-bold text-[#F5F5F5]">Forgot Password?</h2>
          <p className="text-center text-sm leading-6 text-[#A1A1AA]">Enter your email address and we'll send a password reset link.</p>
          <div>
            <label htmlFor="forgot-password-email" className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">Email Address</label>
            <input id="forgot-password-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="example@gmail.com" required className={inputClassName} />
            {error && <p className="mt-1.5 text-sm text-[#E63946]">{error}</p>}
          </div>
          <button type="submit" disabled={loading} className={buttonClassName}>{loading ? "Sending..." : "Send Reset Link"}</button>
          <p className="pt-2 text-center text-sm text-[#A1A1AA]">Remember your password? <button type="button" onClick={onBackToLogin} className="font-bold text-[#E63946] hover:underline">Back to Login</button></p>
        </>
      )}
    </form>
  );
}

export default ForgotPasswordForm;
