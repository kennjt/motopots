import { NavLink, Outlet } from "react-router-dom";

export default function AdminWorkspace({ title, tabs }) {
  return (
    <div className="space-y-5">
      <nav aria-label={`${title} tabs`} className="flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#111116] p-2">
        {tabs.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold no-underline transition ${isActive ? "bg-[#E63946] text-white" : "text-[#A1A1AA] hover:bg-white/[0.04] hover:text-white"}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
