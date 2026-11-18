import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Users,
  UserRound,
} from "lucide-react";
import { showConfirm, showSuccess } from "../utils/swal";

const navigation = [
  { label: "Overview", path: "/staff", icon: LayoutDashboard },
  { label: "Orders", path: "/staff/orders", icon: ShoppingBag },
  { label: "Inventory", path: "/staff/inventory", icon: Package },
  { label: "Customer", path: "/staff/customers", icon: Users },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    document.querySelector(".admin-main-content")?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const logout = async () => {
    const result = await showConfirm({ title: "Log out?", text: "Are you sure you want to log out of your account?", confirmText: "Yes, log out", cancelText: "Stay logged in" });
    if (!result.isConfirmed) return;
    showSuccess("Logged out successfully");
    navigate("/?login=admin");
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0B0B0F] text-[#F5F5F5]">
      {mobileNavOpen && <button type="button" aria-label="Close admin navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-20 bg-black/60 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-[248px] flex-col overflow-y-auto border-r border-white/[0.07] bg-[#111116] px-5 py-6 ${mobileNavOpen ? "flex" : "hidden"} lg:flex`}>
        <Link to="/staff" onClick={() => setMobileNavOpen(false)} className="mb-8 inline-flex flex-col leading-none no-underline">
          <span className="font-['Alfa_Slab_One',serif] text-[1.4rem] tracking-[1px] text-[#E63946] [text-shadow:2px_2px_0_#000000]">MOTOPOT&apos;S</span>
          <span className="mt-1 self-start bg-[#22222B] px-2 py-0.5 font-['Alfa_Slab_One',serif] text-[0.65rem] italic text-[#F5F5F5]">FOOD HOUSE</span>
        </Link>
        <nav aria-label="Admin navigation" className="space-y-5">
          {navigation.map(({ label, path, icon: NavigationIcon }) => {
            return (
              <NavLink
                key={path}
                to={path}
                end={path === "/staff"}
                onClick={() => { setMobileNavOpen(false); setAccountMenuOpen(false); }}
                className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm no-underline transition ${isActive ? "bg-[#E63946]/10 font-bold text-[#FF727D]" : "font-semibold text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white"}`}
              >
                <NavigationIcon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="relative mt-auto shrink-0 border-t border-white/[0.08] pt-3">
          {accountMenuOpen && (
            <div role="menu" aria-label="Admin account actions" className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-white/[0.08] bg-[#19191F] p-1 shadow-xl">
              <Link to="/staff/settings" role="menuitem" onClick={() => { setMobileNavOpen(false); setAccountMenuOpen(false); }} className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#D4D4DC] no-underline transition hover:bg-white/[0.05] hover:text-white">
                <Settings aria-hidden="true" className="h-[17px] w-[17px] text-[#FF727D]" />Settings
              </Link>
              <button type="button" role="menuitem" onClick={() => { setMobileNavOpen(false); setAccountMenuOpen(false); logout(); }} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[#FF929A] transition hover:bg-[#E63946]/10">
                <LogOut aria-hidden="true" className="h-[17px] w-[17px]" />Logout
              </button>
            </div>
          )}
          <button type="button" aria-expanded={accountMenuOpen} aria-haspopup="menu" onClick={() => setAccountMenuOpen((open) => !open)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#A1A1AA] transition hover:bg-white/[0.04] hover:text-white">
            <UserRound aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">Admin account</span>
            <ChevronUp aria-hidden="true" className={`h-4 w-4 transition-transform ${accountMenuOpen ? "" : "rotate-180"}`} />
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
        <div key={location.pathname} className="admin-route-content min-h-0 flex-1 px-4 py-5 pb-20 sm:px-7 lg:px-8 lg:pb-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
