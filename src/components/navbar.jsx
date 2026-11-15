import { useEffect, useState } from "react";
import LoginForm from "./LoginForm";

function AppNavbar() {
  const [showLogin, setShowLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");
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
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-3 px-5 sm:px-6 lg:px-5">
          <a
            href="#home"
            className="mr-2 inline-flex shrink-0 flex-col leading-none no-underline sm:mr-6"
            onClick={closeMobileNav}
          >
            <span className="font-['Alfa_Slab_One',serif] text-[1.4rem] tracking-[1px] text-[#B3231B] [text-shadow:2px_2px_0_#1F2A44]">
              MOTOPOT&apos;S
            </span>
            <span className="mt-1 self-start bg-[#2B2118] px-2 py-0.5 font-['Alfa_Slab_One',serif] text-[0.65rem] italic text-[#F7ECD4]">
              FOOD HOUSE
            </span>
          </a>

          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md border border-[#1F2A44] px-3 py-2 text-[#1F2A44] focus:outline-none focus:ring-4 focus:ring-[#1F2A44]/15 lg:hidden"
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
            <div className="flex flex-col rounded-3xl border border-[#252321]/50 bg-transparent p-2 lg:mx-auto lg:flex-row">
              {["Home", "Menu", "About"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  onClick={() => {
                    setActiveNav(label);
                    closeMobileNav();
                  }}
                  className={`min-h-11 rounded-3xl py-1 no-underline transition-colors hover:text-[#B3231B] lg:min-h-0 lg:px-[13px] lg:py-0 ${
                    activeNav === label
                      ? "font-bold text-[#B3231B]"
                      : "font-medium text-[#252321]"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-2 py-2 lg:flex-row lg:items-center lg:py-0">
              <div className="relative">
                <button
                  type="button"
                  id="loginDropdown"
                  aria-expanded={loginMenuOpen}
                  onClick={() => setLoginMenuOpen((value) => !value)}
                  className="min-h-11 w-full rounded-4xl border-1 border-[#FFFAF0] bg-transparent px-3 py-1.5 text-left text-sm font-bold text-[#FFFAF0] transition-colors hover:bg-[#1F2A44] hover:text-white lg:min-h-0 lg:w-auto"
                >
                  Log in{" "}
                  <span aria-hidden="true" className="ml-1 text-xs">
                    ▼
                  </span>
                </button>
                {loginMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[min(13rem,calc(100vw-2rem))] rounded-lg border border-[#1F2A44]/15 bg-white p-1.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => openLogin("customer")}
                      className="block w-full rounded-md px-3.5 py-2 text-left font-semibold text-[#2B2118] hover:bg-[#F7ECD4] hover:text-[#B3231B]"
                    >
                      Customer Login
                    </button>
                    <button
                      type="button"
                      onClick={() => openLogin("staff")}
                      className="block w-full rounded-md px-3.5 py-2 text-left font-semibold text-[#2B2118] hover:bg-[#F7ECD4] hover:text-[#B3231B]"
                    >
                      Owner / Staff Login
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogin(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="loginTitle"
            className="w-full max-w-lg overflow-hidden rounded-xl border-2 border-[#E9A82C] bg-white shadow-xl"
          >
            <header className="flex items-center justify-between border-b-2 border-[#E9A82C] bg-[#F7ECD4] px-5 py-4">
              <h2
                id="loginTitle"
                className="m-0 font-['Alfa_Slab_One',serif] text-xl text-[#1F2A44]"
              >
                {selectedRole === "customer"
                  ? "Login"
                  : "Login"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowLogin(false)}
                className="rounded px-2 text-2xl leading-none text-[#2B2118] hover:text-[#B3231B]"
              >
                &times;
              </button>
            </header>
            <div className="p-5">
              <div className="mb-5 text-center">
                <p className="mb-1 text-sm text-gray-500">
                  Welcome to Motopot's Food House!
                </p>

                <h3 className="text-xl font-extrabold text-[#1F2A44]">
                  {selectedRole === "customer"
                    ? "Sign in to your account"
                    : "Sign in to your account"}
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
