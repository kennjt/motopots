
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import LoginForm from "./LoginForm";

function AppNavbar() {
  const location = useLocation();
  const loginRole = new URLSearchParams(location.search).get("login");
  const [showLogin, setShowLogin] = useState(loginRole === "user" || loginRole === "admin");
  const [selectedRole, setSelectedRole] = useState(loginRole === "admin" ? "staff" : "customer");
  const [expanded, setExpanded] = useState(false);
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");

  const openLogin = (role) => {
    setSelectedRole(role);
    setShowLogin(true);
    setExpanded(false);
    setLoginMenuOpen(false);
  };

  useEffect(() => {
    if (!showLogin) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setShowLogin(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showLogin]);

  const closeMobileNav = () => setExpanded(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-transparent py-2.5">
        <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-end gap-x-3 px-5 sm:px-6 lg:px-5">
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md border border-white/10 px-3 py-2 text-[#F5F5F5] focus:outline-none focus:ring-4 focus:ring-[#E63946]/20 lg:hidden"
            aria-label="Toggle navigation"
            aria-controls="mainNav"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
          </button>

          <div
            id="mainNav"
            className={`${expanded ? "flex" : "hidden"} w-full min-w-0 flex-col pt-3 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:pt-0`}
          >
            <div className="flex flex-col rounded-3xl border border-white/10 bg-[#15151C]/80 p-2 shadow-lg shadow-black/20 backdrop-blur-xl lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:flex-row">
              {["Home", "Menu", "About"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  onClick={() => {
                    setActiveNav(label);
                    closeMobileNav();
                  }}
                  className={`min-h-11 rounded-3xl py-1 no-underline transition-colors hover:text-[#E63946] lg:min-h-0 lg:px-[13px] lg:py-0 ${
                    activeNav === label
                      ? "font-bold text-[#E63946]"
                      : "font-medium text-[#A1A1AA]"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-2 py-2 lg:ml-auto lg:flex-row lg:items-center lg:py-0">
              <div className="relative">
                <button
                  type="button"
                  id="loginDropdown"
                  aria-expanded={loginMenuOpen}
                  onClick={() => setLoginMenuOpen((value) => !value)}
                  className="min-h-11 w-full rounded-full border border-white/10 bg-[#15151C]/80 px-4 py-2 text-left text-sm font-medium text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-[#E63946]/50 hover:bg-[#22222B] hover:shadow-xl lg:min-h-0 lg:w-auto"
                >
                  Log in{" "}
                  <span aria-hidden="true" className="ml-1 text-xs">
                    ▼
                  </span>
                </button>

                {loginMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[min(13rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#22222B] p-1.5 shadow-xl shadow-black/30 backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => openLogin("customer")}
                      className="block w-full rounded-md px-3.5 py-2 text-left font-semibold text-[#F5F5F5] hover:bg-[#15151C] hover:text-[#E63946]"
                    >
                      User Login
                    </button>

                    <button
                      type="button"
                      onClick={() => openLogin("staff")}
                      className="block w-full rounded-md px-3.5 py-2 text-left font-semibold text-[#F5F5F5] hover:bg-[#15151C] hover:text-[#E63946]"
                    >
                      Admin Login
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogin(false);
          }}
        >
          {/* Glassmorphism Modal */}
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="loginTitle"
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] shadow-2xl shadow-black/40 sm:max-h-[calc(100dvh-2rem)]"
          >
            {/* Modal Header */}
            <header className="flex items-center justify-between border-b border-white/10 bg-[#22222B] px-5 py-4">
              <h2
                id="loginTitle"
                className="m-0 font-['Alfa_Slab_One',serif] text-xl text-[#F5F5F5]"
              >
                Login
              </h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowLogin(false)}
                className="rounded px-2 text-2xl leading-none text-[#A1A1AA] transition hover:text-[#E63946]"
              >
                &times;
              </button>
            </header>

            {/* Modal Content */}
            <div className="bg-[#15151C] p-5">
              <div className="mb-5 text-center">
                <p className="mb-1 text-sm text-[#A1A1AA]">
                  Welcome to Motopot&apos;s Food House!
                </p>

                <h3 className="text-xl font-extrabold text-[#F5F5F5]">
                  {selectedRole === "customer" ? "User sign in" : "Admin sign in"}
                </h3>
              </div>

              <LoginForm role={selectedRole} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default AppNavbar;
