import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerSupabase } from "../../utils/customerSupabase";
import { showError, showSuccess } from "../../utils/swal";
import { getCustomerPasswordError } from "../../utils/customerPassword";

export default function PasswordResetForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const passwordError = getCustomerPasswordError(password);
    if (passwordError) {
      showError(
        "Password could not be updated",
        passwordError,
      );
      return;
    }
    if (password !== confirmPassword) {
      showError(
        "Password could not be updated",
        "Passwords do not match.",
      );
      return;
    }
    setLoading(true);
    const { error } = await customerSupabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      showError(
        "Password could not be updated",
        "The reset link may have expired. Please request a new one.",
      );
      return;
    }
    await customerSupabase.auth.signOut({ scope: "local" });
    showSuccess(
      "Password updated",
      "You can now log in with your new password.",
    );
    navigate("/?login=user", { replace: true });
  };

  return (
    <div className="auth-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[25rem] space-y-4 rounded-2xl border border-white/10 bg-[#22222B] p-5 shadow-xl shadow-black/30"
      >
        <h1 className="text-center text-2xl font-bold text-[#F5F5F5]">
          Create New Password
        </h1>
        <p className="text-center text-sm text-[#A1A1AA]">
          Choose a new password for your customer account.
        </p>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password"
          required
          className="w-full rounded-xl border border-white/10 bg-[#15151C] px-4 py-3 text-[#F5F5F5] outline-none focus:border-[#E63946]"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
          required
          className="w-full rounded-xl border border-white/10 bg-[#15151C] px-4 py-3 text-[#F5F5F5] outline-none focus:border-[#E63946]"
        />
        <p className="text-xs text-[#A1A1AA]">
          Use at least 8 characters, one letter, and one number.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#E63946] py-3 font-extrabold text-white disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
