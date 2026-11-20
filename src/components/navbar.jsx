
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";

function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const loginRole = new URLSearchParams(location.search).get("login");
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(loginRole === "admin" ? "staff" : "customer");
  const [expanded, setExpanded] = useState(false);
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");
  const queryLoginOpen = loginRole === "user" || loginRole === "admin";
  const showLogin = loginOpen || queryLoginOpen;

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    if (queryLoginOpen) navigate("/");
  }, [navigate, queryLoginOpen]);

  const openLogin = (role) => {
    setSelectedRole(role);
    setLoginOpen(true);
    setExpanded(false);
    setLoginMenuOpen(false);
  };

  const openAccountCreation = useCallback(() => {
    setLoginOpen(false);
    setLoginMenuOpen(false);
    navigate("/register");
  }, [navigate]);

  useEffect(() => {
    if (!showLogin) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeLogin();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeLogin, showLogin]);

  const closeMobileNav = () => setExpanded(false);

  const navigateToSection = (event, label) => {
    event.preventDefault();
    const section = document.getElementById(label.toLowerCase());
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveNav(label);
    closeMobileNav();
  };

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
            <div className="flex flex-col rounded-3xl border border-white/10 bg-[#15151C]/80 p-2 shadow-lg shadow-black/20 backdrop-blur-[2px] lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:flex-row">
              {["Home", "Menu", "About"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  onClick={(event) => navigateToSection(event, label)}
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
                  className="min-h-11 w-full rounded-full border border-white/10 bg-[#15151C]/80 px-4 py-2 text-left text-sm font-medium text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-[2px] transition-all duration-300 hover:border-[#E63946]/50 hover:bg-[#22222B] hover:shadow-xl lg:min-h-0 lg:w-auto"
                >
                  Log in{" "}
                  <span aria-hidden="true" className="ml-1 text-xs">
                    ▼
                  </span>
                </button>

                {loginMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[min(13rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#22222B] p-1.5 shadow-xl shadow-black/30 backdrop-blur-[2px]">
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
          className="auth-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLogin();
          }}
        >
          <LoginForm
            role={selectedRole}
            onClose={closeLogin}
            onCreateAccount={openAccountCreation}
          />
        </div>
      )}
    </>
  );
}

export default AppNavbar;
