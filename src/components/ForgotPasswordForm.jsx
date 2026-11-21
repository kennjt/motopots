import { useState } from "react";

const DEMO_CODE = "1234";
const inputClassName = "w-full rounded-xl border border-white/10 bg-[#15151C] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20";
const buttonClassName = "w-full rounded-xl border border-[#E63946] bg-[#E63946] py-3 font-extrabold text-white shadow-lg shadow-[#E63946]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#C92D3A] hover:shadow-xl disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0";

function ForgotPasswordForm({ onClose, onBackToLogin }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const focusCodeInput = (index) => document.getElementById(`verification-digit-${index}`)?.focus();

  const passwordRequirements = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", valid: /[a-z]/.test(password) },
    { label: "At least one number", valid: /\d/.test(password) },
  ];
  const passwordIsValid = passwordRequirements.every((requirement) => requirement.valid);

  const simulateLoading = (callback) => {
    setIsLoading(true);
    window.setTimeout(() => {
      setIsLoading(false);
      callback();
    }, 500);
  };

  const handleEmailSubmit = (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmail(trimmedEmail);
    setEmailError("");
    setCode(["", "", "", ""]);
    setCodeError("");
    simulateLoading(() => {
      setStep("verify");
      window.setTimeout(() => focusCodeInput(0), 0);
    });
  };

  const updateCode = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);
    setCodeError("");
    if (digit && index < code.length - 1) focusCodeInput(index + 1);
  };

  const handleCodeKeyDown = (event, index) => {
    if (event.key === "Backspace" && !code[index] && index > 0) focusCodeInput(index - 1);
  };

  const handleCodePaste = (event) => {
    event.preventDefault();
    const pastedCode = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!pastedCode) return;
    setCode(pastedCode.split("").concat(["", "", "", ""]).slice(0, 4));
    setCodeError("");
    focusCodeInput(Math.min(pastedCode.length, 4) - 1);
  };

  const handleVerifyCode = (event) => {
    event.preventDefault();
    if (code.join("") !== DEMO_CODE) {
      setCodeError("Invalid verification code. Please try again.");
      setCode(["", "", "", ""]);
      window.setTimeout(() => focusCodeInput(0), 0);
      return;
    }
    setCodeError("");
    simulateLoading(() => setStep("password"));
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    if (!passwordIsValid) {
      setPasswordError("Your password must meet all of the requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError("");
    simulateLoading(() => setStep("success"));
  };

  const renderEmailStep = () => (
    <>
      <h2 id="forgot-password-title" className="mt-5 mb-0 text-center text-2xl font-bold text-[#F5F5F5]">Forgot Password?</h2>
      <p id="forgot-password-description" className="text-center text-sm leading-6 text-[#A1A1AA]">Enter your email address and we'll send you a verification code to reset your password.</p>
      <div>
        <label htmlFor="forgot-password-email" className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">Email Address</label>
        <input id="forgot-password-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(""); }} placeholder="example@gmail.com" aria-invalid={Boolean(emailError)} className={inputClassName} />
        {emailError && <p className="mt-1.5 text-sm text-[#E63946]">{emailError}</p>}
      </div>
      <button type="submit" disabled={isLoading} className={buttonClassName}>{isLoading ? "Sending..." : "Send Verification Code"}</button>
      <p className="pt-2 text-center text-sm text-[#A1A1AA]">Remember your password?{" "}<button type="button" onClick={onBackToLogin} className="font-bold text-[#E63946] hover:underline">Back to Login</button></p>
    </>
  );

  const renderVerifyStep = () => (
    <>
      <h2 id="forgot-password-title" className="mt-5 mb-0 text-center text-2xl font-bold text-[#F5F5F5]">Verify Your Email</h2>
      <p id="forgot-password-description" className="text-center text-sm leading-6 text-[#A1A1AA]">We've sent a 4-digit verification code to your email address.</p>
      <p className="break-all text-center text-sm font-semibold text-[#F5F5F5]">{email}</p>
      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">Verification Code</label>
        <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleCodePaste}>
          {code.map((digit, index) => <input key={`code-${index}`} id={`verification-digit-${index}`} value={digit} onChange={(event) => updateCode(index, event.target.value)} onKeyDown={(event) => handleCodeKeyDown(event, index)} inputMode="numeric" maxLength={1} aria-label={`Verification digit ${index + 1}`} aria-invalid={Boolean(codeError)} className={`h-12 w-12 rounded-xl border bg-[#15151C] text-center text-xl font-bold text-[#F5F5F5] outline-none transition focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 sm:h-14 sm:w-14 ${codeError ? "border-[#E63946]" : "border-white/10"}`} />)}
        </div>
        {codeError && <p className="mt-2 text-center text-sm text-[#E63946]">{codeError}</p>}
      </div>
      <button type="submit" disabled={isLoading} className={buttonClassName}>{isLoading ? "Verifying..." : "Verify Code"}</button>
      <div className="space-y-2 text-center text-sm">
        <p className="text-[#A1A1AA]">Didn't receive the code?{" "}<button type="button" onClick={() => { setCode(["", "", "", ""]); setCodeError(""); focusCodeInput(0); }} className="font-bold text-[#E63946] hover:underline">Resend Code</button></p>
        <button type="button" onClick={() => { setStep("email"); setCodeError(""); }} className="font-bold text-[#E63946] hover:underline">Change Email Address</button>
      </div>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <h2 id="forgot-password-title" className="mt-5 mb-0 text-center text-2xl font-bold text-[#F5F5F5]">Create New Password</h2>
      <p id="forgot-password-description" className="text-center text-sm leading-6 text-[#A1A1AA]">Your email has been verified. Please create a new password for your account.</p>
      <div><label htmlFor="new-password" className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">New Password</label><div className="relative"><input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }} placeholder="Enter your new password" className={`${inputClassName} pr-16`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#E63946]">{showPassword ? "Hide" : "Show"}</button></div></div>
      <div><label htmlFor="confirm-new-password" className="mb-1.5 block text-sm font-bold text-[#F5F5F5]">Confirm New Password</label><div className="relative"><input id="confirm-new-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(""); }} placeholder="Re-enter your new password" className={`${inputClassName} pr-16`} /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#E63946]">{showConfirmPassword ? "Hide" : "Show"}</button></div></div>
      <div className="rounded-xl border border-white/10 bg-[#15151C] p-3 text-sm"><p className="mb-2 font-bold text-[#F5F5F5]">Password requirements</p><ul className="space-y-1 text-[#A1A1AA]">{passwordRequirements.map((requirement) => <li key={requirement.label} className={requirement.valid ? "text-emerald-400" : ""}>{requirement.valid ? "✓" : "○"}{" "}{requirement.label}</li>)}</ul></div>
      {passwordError && <p className="text-sm text-[#E63946]">{passwordError}</p>}
      <button type="submit" disabled={isLoading} className={buttonClassName}>{isLoading ? "Resetting..." : "Reset Password"}</button>
    </>
  );

  const renderSuccessStep = () => <div className="space-y-4 text-center"><div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#E63946]/15 text-3xl font-bold text-[#E63946]" aria-hidden="true">✓</div><h2 id="forgot-password-title" className="text-2xl font-bold text-[#F5F5F5]">Password Reset Successful!</h2><p id="forgot-password-description" className="text-sm leading-6 text-[#A1A1AA]">Your password has been successfully updated. You can now log in using your new password.</p><button type="button" onClick={onBackToLogin} className={buttonClassName}>Back to Login</button></div>;
  const stepSubmitHandler = step === "email" ? handleEmailSubmit : step === "verify" ? handleVerifyCode : handlePasswordSubmit;

  return <form onSubmit={stepSubmitHandler} role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" aria-describedby="forgot-password-description" className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-[25rem] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#22222B] p-5 shadow-xl shadow-black/30 sm:max-h-[calc(100dvh-2rem)]"><button type="button" aria-label="Close forgot password form" onClick={onClose} className="absolute right-3 top-2 rounded px-2 text-2xl leading-none text-[#A1A1AA] transition hover:text-[#E63946]">&times;</button>{step === "email" && renderEmailStep()}{step === "verify" && renderVerifyStep()}{step === "password" && renderPasswordStep()}{step === "success" && renderSuccessStep()}</form>;
}

export default ForgotPasswordForm;
