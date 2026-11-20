import { useEffect, useRef, useState } from "react";
import { LogOut, X } from "lucide-react";

export default function LogoutConfirmationModal({ onCancel, onConfirm }) {
  const [closing, setClosing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !closing) setClosing(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closing]);

  const closeModal = () => {
    if (closing) return;
    setConfirmed(false);
    setClosing(true);
  };

  const confirmLogout = () => {
    if (closing) return;
    setConfirmed(true);
    setClosing(true);
  };

  const finishAnimation = (event) => {
    if (event.target !== event.currentTarget || !closing) return;
    if (confirmed) onConfirm();
    else onCancel();
  };

  return (
    <div
      className={`logout-modal-overlay fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-[2px] sm:p-6 ${closing ? "is-closing pointer-events-none" : ""}`}
      onAnimationEnd={finishAnimation}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-description"
        className="logout-modal-panel relative w-full max-w-[25rem] rounded-2xl border border-[#292930] bg-[#15151B] p-5 text-center text-white shadow-[0_16px_48px_rgba(0,0,0,0.42)] sm:p-6"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeModal}
          aria-label="Close logout confirmation"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-[#A1A1AA] transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4D5A]"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF4D5A]/10 text-[#FF4D5A]">
          <LogOut aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <h2 id="logout-modal-title" className="m-0 px-8 font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
          Confirm Logout
        </h2>
        <p id="logout-modal-description" className="mx-auto mb-0 mt-2 max-w-[22rem] text-sm leading-6 text-[#A1A1AA]">
          Are you sure you want to log out of your account? You will need to sign in again to access the system.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#292930] bg-[#1B1B22] px-4 text-sm font-bold text-[#D4D4D8] transition hover:bg-[#22222B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4D5A] sm:max-w-36"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmLogout}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF4D5A] px-4 text-sm font-bold text-white shadow-sm shadow-[#FF4D5A]/20 transition hover:bg-[#E63946] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF929A] sm:max-w-36"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </section>
    </div>
  );
}
