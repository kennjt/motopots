import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { showSuccess } from "../utils/swal";
import LogoutConfirmationModal from "./LogoutConfirmationModal";
import NotificationCenter from "./NotificationCenter";

const navigation = [
  { label: "Overview", path: "/staff", icon: LayoutDashboard },
  { label: "Orders", path: "/staff/orders", icon: ShoppingBag },
  { label: "Inventory", path: "/staff/inventory", icon: Package },
  { label: "Expenses", path: "/staff/expenses", icon: ReceiptText },
  { label: "Customer", path: "/staff/customers", icon: Users },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const logoutButtonRef = useRef(null);

  useEffect(() => {
    document.querySelector(".admin-main-content")?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const logout = () => {
    sessionStorage.removeItem("motopots-admin-session");
    showSuccess("Logged out successfully");
    navigate("/?login=admin");
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0B0B0F] text-[#F5F5F5]">
      {logoutOpen && (
        <LogoutConfirmationModal
          onCancel={() => {
            setLogoutOpen(false);
            logoutButtonRef.current?.focus();
          }}
          onConfirm={logout}
        />
      )}
      {mobileNavOpen && <button type="button" aria-label="Close admin navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-20 bg-black/60 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-[248px] flex-col overflow-y-auto border-r border-white/[0.07] bg-[#111116] px-5 py-6 ${mobileNavOpen ? "flex" : "hidden"} lg:flex`}>
        <Link to="/staff" onClick={() => setMobileNavOpen(false)} className="mb-8 inline-flex flex-col leading-none no-underline">
          <span className="font-display text-[1.4rem] tracking-[1px] text-[#E63946] [text-shadow:2px_2px_0_#000000]">MOTOPOT&apos;S</span>
          <span className="mt-1 self-start bg-[#22222B] px-2 py-0.5 font-display text-[0.65rem] italic text-[#F5F5F5]">FOOD HOUSE</span>
        </Link>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#777781]">Main Navigation</p>
        <nav aria-label="Admin navigation" className="space-y-1">
          {navigation.map(({ label, path, icon: NavigationIcon }) => {
            return (
              <NavLink
                key={path}
                to={path}
                end={path === "/staff"}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm no-underline transition ${isActive ? "bg-[#E63946]/10 font-bold text-[#FF727D]" : "font-semibold text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white"}`}
              >
                <NavigationIcon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto shrink-0 space-y-1 border-t border-white/[0.08] pt-3">
          <Link to="/staff/settings" onClick={() => setMobileNavOpen(false)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#A1A1AA] no-underline transition hover:bg-white/[0.04] hover:text-white">
            <Settings aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-[#FF727D]" />Settings
          </Link>
          <button ref={logoutButtonRef} type="button" onClick={() => { setMobileNavOpen(false); setLogoutOpen(true); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#FF929A] transition hover:bg-[#E63946]/10">
            <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />Logout
          </button>
        </div>
      </aside>

      <div className="admin-main-content flex h-screen min-w-0 flex-col lg:ml-[248px]">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open admin navigation"
          className="fixed bottom-4 left-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#15151C] text-[#B8B8C0] shadow-lg lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-3 sm:px-7 lg:px-8">
          <h1 className="m-0 text-sm font-bold text-[#A1A1AA]">Admin workspace</h1>
          <NotificationCenter audience="admin" manageNotices />
        </header>
        <div key={location.pathname} className="admin-route-content min-h-0 flex-1 px-4 py-5 pb-20 sm:px-7 lg:px-8 lg:pb-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
