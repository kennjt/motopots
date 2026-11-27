import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerNavbar from "./customernavbar";
import { showError, showSuccess, showWarning } from "../utils/swal";
import CustomerAddressBook from "./CustomerAddressBook";
import { customerSupabase } from "../utils/customerSupabase";
import { useCustomerAuth } from "../auth/customerAuthContext";

function ProfileSettings({ modal = false, onClose }) {
  const navigate = useNavigate();
  const { customer, refreshCustomer } = useCustomerAuth();

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [profile, setProfile] = useState(() => ({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.contact_no || "",
  }));
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setErrorMessage("");
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    const changingPassword = Object.values(passwords).some(Boolean);
    if (changingPassword && (!passwords.current || !passwords.next)) {
      setErrorMessage("Enter your current password and a new password to continue.");
      showWarning("Check password details", "Enter your current password and a new password to continue.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setErrorMessage("New password and confirmation do not match.");
      showWarning("Passwords do not match", "Enter the same new password in both fields.");
      return;
    }

    setSaving(true);
    try {
      const { error: profileError } = await customerSupabase
        .from("customer")
        .update({
          name: profile.name.trim(),
          contact_no: profile.phone.trim() || null,
        })
        .eq("auth_user_id", customer.auth_user_id);
      if (profileError) throw profileError;

      if (changingPassword) {
        const { error: passwordError } = await customerSupabase.auth.updateUser({ password: passwords.next });
        if (passwordError) throw passwordError;
      }
      await refreshCustomer();

      showSuccess("Profile updated successfully");
      setErrorMessage("");
      setPasswords({ current: "", next: "", confirm: "" });
      if (modal && onClose) {
        onClose();
      }
    } catch {
      setErrorMessage("Unable to save your profile. Please try again.");
      showError("Profile could not be updated", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const profileCard = (
        <div className={modal ? "w-full p-5" : "w-full max-w-lg rounded-xl border border-white/10 bg-[#15151C] p-6 shadow-lg shadow-black/20 sm:p-8"}>
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-[#F5F5F5]">Profile Settings</h1>
            <p className="mt-2 text-sm text-[#A1A1AA]">Manage your personal information and account settings.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                placeholder="Enter your full name"
                required
                className="w-full rounded-lg border border-white/10 bg-[#22222B] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={profile.email}
                readOnly
                placeholder="example@gmail.com"
                required
                className="w-full rounded-lg border border-white/10 bg-[#22222B] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                placeholder="09XXXXXXXXX"
                className="w-full rounded-lg border border-white/10 bg-[#22222B] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
              />
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <h2 className="text-lg font-bold text-[#F5F5F5]">Change Password</h2>
              {[
                ["current", "Current Password", "Enter current password"],
                ["next", "New Password", "Enter new password"],
                ["confirm", "Confirm New Password", "Confirm new password"],
              ].map(([name, label, placeholder]) => (
                <div key={name}>
                  <label className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">{label}</label>
                  <div className="relative">
                    <input
                      type={showPasswords[name] ? "text" : "password"}
                      name={name}
                      value={passwords[name]}
                      onChange={handlePasswordChange}
                      placeholder={placeholder}
                      className="w-full rounded-lg border border-white/10 bg-[#22222B] px-4 py-3 pr-16 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, [name]: !showPasswords[name] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#E63946]"
                    >
                      {showPasswords[name] ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-[#A1A1AA]">Leave all password fields blank to keep your existing password.</p>
            </div>

            {errorMessage && <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{errorMessage}</p>}

            {/* Buttons */}
            <div className="flex flex-col-reverse justify-end gap-3 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => (modal ? onClose() : navigate("/customer"))}
                className="rounded-lg border border-white/10 px-6 py-3 font-bold text-[#A1A1AA] transition hover:bg-[#22222B]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#E63946] px-6 py-3 font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </form>
          <CustomerAddressBook />
        </div>
  );

  if (modal) {
    return (
      <div
        className="mobile-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="profileTitle"
          className="h-[36rem] max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#15151C] shadow-xl shadow-black/40"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-[#22222B] px-5 py-4">
            <h2
              id="profileTitle"
              className="m-0 font-heading text-xl text-[#F5F5F5]"
            >
              Profile Settings
            </h2>
            <button
              type="button"
              aria-label="Close profile settings"
              onClick={onClose}
              className="rounded px-2 text-2xl leading-none text-[#A1A1AA] hover:text-[#E63946]"
            >
              &times;
            </button>
          </header>
          {profileCard}
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#F5F5F5]">
      <CustomerNavbar />
      <main className="flex min-h-[calc(100vh-4.75rem)] items-center justify-center px-5 py-10">
        {profileCard}
      </main>
    </div>
  );
}

export default ProfileSettings;
