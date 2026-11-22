import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, UserRound, X } from "lucide-react";
import LoginForm from "./LoginForm";
import ForgotPasswordForm from "./ForgotPasswordForm";

function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const loginRole = new URLSearchParams(location.search).get("login");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginView, setLoginView] = useState("login");
  const [selectedRole, setSelectedRole] = useState(
    loginRole === "admin" ? "staff" : "customer",
  );
  const [expanded, setExpanded] = useState(false);
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [loginChoiceOpen, setLoginChoiceOpen] = useState(false);
  const [loginChoiceClosing, setLoginChoiceClosing] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");
  const navRef = useRef(null);
  const drawerRef = useRef(null);
  const hamburgerRef = useRef(null);
  const loginButtonRef = useRef(null);
  const loginChoiceRef = useRef(null);
  const loginChoiceTimerRef = useRef(null);
  const sectionVisibilityRef = useRef(new Map());
  const queryLoginOpen = loginRole === "user" || loginRole === "admin";
  const showLogin = loginOpen || queryLoginOpen;

  useEffect(() => {
    const sectionLabels = ["Home", "Menu", "About"];
    const sections = sectionLabels
      .map((label) => ({
        label,
        element: document.getElementById(label.toLowerCase()),
      }))
      .filter(({ element }) => element);

    if (!sections.length || !("IntersectionObserver" in window))
      return undefined;

    const visibility = sectionVisibilityRef.current;
    visibility.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = sections.find(
            ({ element }) => element === entry.target,
          );
          if (section) visibility.set(section.label, entry);
        });

        const visibleSection = [...visibility.values()]
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleSection) {
          const section = sections.find(
            ({ element }) => element === visibleSection.target,
          );
          if (section) setActiveNav(section.label);
        }
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    sections.forEach(({ element }) => observer.observe(element));
    return () => {
      observer.disconnect();
      visibility.clear();
    };
  }, [location.pathname]);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setLoginView("login");
    if (queryLoginOpen) navigate("/");
  }, [navigate, queryLoginOpen]);

  const openLogin = (role) => {
    setSelectedRole(role);
    setLoginOpen(true);
    setLoginView("login");
    setExpanded(false);
    setLoginMenuOpen(false);
    setLoginChoiceOpen(false);
    setLoginChoiceClosing(false);
  };

  const closeLoginChoice = useCallback((afterClose) => {
    if (loginChoiceTimerRef.current) return;

    setLoginChoiceClosing(true);
    loginChoiceTimerRef.current = window.setTimeout(() => {
      loginChoiceTimerRef.current = null;
      setLoginChoiceOpen(false);
      setLoginChoiceClosing(false);
      afterClose?.();
    }, 180);
  }, []);

  const openLoginChoice = () => {
    if (loginChoiceTimerRef.current) {
      window.clearTimeout(loginChoiceTimerRef.current);
      loginChoiceTimerRef.current = null;
    }
    setExpanded(false);
    setLoginMenuOpen(false);
    setLoginChoiceClosing(false);
    setLoginChoiceOpen(true);
  };

  const handleLoginButtonClick = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      openLoginChoice();
      return;
    }
    setLoginMenuOpen((value) => !value);
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

  const closeMobileNav = () => {
    setExpanded(false);
    setLoginMenuOpen(false);
  };

  useEffect(() => {
    if (!loginChoiceOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const loginButton = loginButtonRef.current;
    document.body.style.overflow = "hidden";
    loginChoiceRef.current
      ?.querySelector('[aria-label="Close login selection"]')
      ?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeLoginChoice();
        return;
      }

      if (event.key !== "Tab" || !loginChoiceRef.current) return;
      const focusableElements = Array.from(
        loginChoiceRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      loginButton?.focus();
    };
  }, [closeLoginChoice, loginChoiceOpen]);

  useEffect(
    () => () => {
      if (loginChoiceTimerRef.current) {
        window.clearTimeout(loginChoiceTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!expanded && !loginMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setExpanded(false);
        setLoginMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [expanded, loginMenuOpen]);

  useEffect(() => {
    if (!expanded || !window.matchMedia("(max-width: 1023px)").matches) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const hamburgerButton = hamburgerRef.current;
    document.body.style.overflow = "hidden";
    drawerRef.current
      ?.querySelector('[aria-label="Close navigation"]')
      ?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setLoginMenuOpen(false);
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusableElements = Array.from(
        drawerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

      if (focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      hamburgerButton?.focus();
    };
  }, [expanded]);

  const navigateToSection = (event, label) => {
    event.preventDefault();
    setActiveNav(label);
    closeMobileNav();
    window.requestAnimationFrame(() => {
      document
        .getElementById(label.toLowerCase())
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <nav ref={navRef} className="sticky top-0 z-40 bg-transparent py-2.5">
        <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-end gap-x-3 px-5 sm:px-6 lg:px-5">
          <button
            type="button"
            aria-expanded={loginChoiceOpen}
            aria-haspopup="dialog"
            onClick={handleLoginButtonClick}
            className="mr-1 min-h-11 w-auto rounded-full border border-white/10 bg-[#15151C]/80 px-4 py-2 text-left text-sm font-medium text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-[2px] transition-all duration-200 hover:border-[#E63946]/50 hover:bg-[#22222B] hover:shadow-xl active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#E63946]/25 sm:mr-0 lg:hidden"
          >
            Login
          </button>

          <button
            ref={hamburgerRef}
            type="button"
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 bg-[#15151C]/70 text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:border-[#E63946]/50 focus:outline-none focus:ring-4 focus:ring-[#E63946]/20 lg:hidden"
            aria-label={expanded ? "Close navigation" : "Open navigation"}
            aria-controls="mainNav"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                expanded ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${
                expanded ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                expanded ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={`fixed inset-0 z-[60] bg-black/65 backdrop-blur-[2px] transition-[opacity,visibility] duration-300 lg:hidden ${
              expanded
                ? "visible opacity-100"
                : "pointer-events-none invisible opacity-0"
            }`}
            onClick={closeMobileNav}
          />

          <div
            id="mainNav"
            ref={drawerRef}
            role={expanded ? "dialog" : undefined}
            aria-label="Main navigation"
            aria-modal={expanded ? "true" : undefined}
            className={`fixed right-0 top-0 z-[61] flex h-[100dvh] w-[82vw] max-w-[24rem] flex-col overflow-y-auto border-l border-white/10 bg-[#111116]/95 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-2xl shadow-black/40 lg:visible lg:static lg:z-auto lg:h-auto lg:w-full lg:max-w-none lg:translate-x-0 lg:flex-1 lg:flex-row lg:items-center lg:justify-between lg:gap-0 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none ${
              expanded
                ? "visible translate-x-0"
                : "pointer-events-none invisible translate-x-full"
            } lg:pointer-events-auto`}
          >
            <div className="mb-5 flex min-h-11 items-center justify-end lg:hidden">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={closeMobileNav}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/10 text-[#F5F5F5] transition-colors hover:border-[#E63946]/50 hover:text-[#E63946] focus:outline-none focus:ring-4 focus:ring-[#E63946]/20"
              >
                <span className="relative block h-5 w-5" aria-hidden="true">
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rotate-45 rounded-full bg-current" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
                </span>
              </button>
            </div>

            <div className="flex min-w-0 flex-col gap-1 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:flex-row lg:gap-0 lg:rounded-3xl lg:border lg:border-white/10 lg:bg-[#15151C]/80 lg:p-2 lg:shadow-lg lg:shadow-black/20 lg:backdrop-blur-xl">
              {["Home", "Menu", "About"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  onClick={(event) => navigateToSection(event, label)}
                  aria-current={activeNav === label ? "page" : undefined}
                  className={`flex min-h-12 items-center border-b border-white/10 px-2 py-3 text-left no-underline transition-[color,background-color,box-shadow] duration-300 hover:text-[#E63946] active:bg-white/5 lg:min-h-0 lg:rounded-3xl lg:border-0 lg:px-[13px] lg:py-0 lg:hover:bg-transparent ${
                    activeNav === label
                      ? "font-bold text-[#E63946] lg:bg-transparent"
                      : "font-medium text-[#F5F5F5]"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="mt-auto hidden min-w-0 flex-col gap-2 border-t border-white/10 pt-5 lg:mt-0 lg:ml-auto lg:flex lg:flex-row lg:items-center lg:border-0 lg:pt-0">
              <div className="relative w-full lg:w-auto">
                <button
                  ref={loginButtonRef}
                  type="button"
                  id="loginDropdown"
                  aria-expanded={loginMenuOpen}
                  onClick={handleLoginButtonClick}
                  className="min-h-12 w-full rounded-xl bg-[#E63946] px-4 py-2 text-left text-sm font-bold text-white shadow-lg shadow-[#E63946]/20 transition-all duration-200 hover:bg-[#C92D3A] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#E63946]/25 lg:min-h-0 lg:w-auto lg:rounded-full lg:border lg:border-white/10 lg:bg-[#15151C]/80 lg:font-medium lg:text-[#F5F5F5] lg:shadow-black/20 lg:backdrop-blur-[2px] lg:hover:border-[#E63946]/50 lg:hover:bg-[#22222B] lg:hover:shadow-xl"
                >
                  Login{" "}
                  <span aria-hidden="true" className="ml-1 text-xs">
                    ▼
                  </span>
                </button>

                {loginMenuOpen && (
                  <div className="mt-2 w-full rounded-xl border border-white/10 bg-[#22222B] p-1.5 shadow-xl shadow-black/30 backdrop-blur-[2px] lg:absolute lg:right-0 lg:z-50 lg:w-[min(13rem,calc(100vw-2rem))]">
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

      {loginChoiceOpen && (
        <div
          className={`login-choice-overlay mobile-modal-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 sm:p-6 ${
            loginChoiceClosing ? "is-closing" : ""
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLoginChoice();
          }}
        >
          <section
            ref={loginChoiceRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="loginChoiceTitle"
            aria-describedby="loginChoiceDescription"
            className="login-choice-panel relative max-h-[90dvh] w-[90vw] max-w-[26rem] overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-2xl shadow-black/50 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close login selection"
              onClick={() => closeLoginChoice()}
              className="absolute right-3 top-3 flex min-h-10 min-w-10 items-center justify-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-4 focus:ring-[#E63946]/25"
            >
              <X size={19} aria-hidden="true" />
            </button>

            <div className="px-5 pt-4 text-center">
              <h2
                id="loginChoiceTitle"
                className="font-heading text-xl font-bold text-[#F5F5F5] sm:text-2xl"
              >
                Choose Your Login
              </h2>
              <p
                id="loginChoiceDescription"
                className="mt-2 text-sm leading-5 text-[#A1A1AA]"
              >
                Please select your account type to continue.
              </p>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => closeLoginChoice(() => openLogin("customer"))}
                className="flex min-h-11 w-[82%] max-w-[17rem] items-center justify-center gap-2.5 rounded-xl border border-[#E63946] bg-[#E63946] px-3 py-2.5 text-center text-xs font-extrabold tracking-wide text-white shadow-lg shadow-[#E63946]/15 transition-colors hover:bg-[#C92D3A] focus:outline-none focus:ring-4 focus:ring-[#E63946]/25 sm:text-sm"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/15">
                  <UserRound size={16} aria-hidden="true" />
                </span>
                CUSTOMER LOGIN
              </button>

              <button
                type="button"
                onClick={() => closeLoginChoice(() => openLogin("staff"))}
                className="flex min-h-11 w-[82%] max-w-[17rem] items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#22222B] px-3 py-2.5 text-center text-xs font-extrabold tracking-wide text-[#F5F5F5] transition-colors hover:border-[#E63946]/60 hover:bg-[#292930] focus:outline-none focus:ring-4 focus:ring-[#E63946]/25 sm:text-sm"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E63946]/15 text-[#E63946]">
                  <ShieldCheck size={16} aria-hidden="true" />
                </span>
                ADMIN LOGIN
              </button>
            </div>
          </section>
        </div>
      )}

      {showLogin && (
        <div
          className="auth-modal-backdrop mobile-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLogin();
          }}
        >
          {loginView === "forgot" ? (
            <ForgotPasswordForm
              onClose={closeLogin}
              onBackToLogin={() => setLoginView("login")}
            />
          ) : (
            <LoginForm
              role={selectedRole}
              onClose={closeLogin}
              onCreateAccount={openAccountCreation}
              onForgotPassword={() => setLoginView("forgot")}
            />
          )}
        </div>
      )}
    </>
  );
}

export default AppNavbar;
