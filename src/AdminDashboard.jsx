import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney, menuItems } from "./data/menuData";
import { ORDERS_STORAGE_KEY, ORDERS_UPDATED_EVENT, readOrders, saveOrders } from "./data/orderStorage";

const orderStatuses = ["Pending", "Preparing", "Ready for Pickup", "Completed", "Cancelled"];

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    orders: <><path d="M7 3h10l3 3v15H4V3h3Z" /><path d="M8 11h8M8 15h8M8 7h3" /></>,
    menu: <><path d="M4 4v6a3 3 0 0 0 6 0V4M7 4v17M16 4v17M16 4c3 2 4 5 4 8h-4" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    cash: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9h.01M17 15h.01" /></>,
    package: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function getOrderDate(order) {
  const date = new Date(order.createdAt || order.date || order.id);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getOrderStatus(order) {
  return order.orderStatus || order.status || "Pending";
}

function getCustomerName(order) {
  if (typeof order.customer === "string") return order.customer;
  return order.customer?.name || "Guest customer";
}

function getOrderItems(order) {
  return Array.isArray(order.items) ? order.items : [];
}

function getProductPriceLabel(item) {
  const product = menuItems.find((menuItem) => (
    menuItem.id === item.productId || menuItem.name === item.name
  ));
  const prices = product?.variants?.map((variant) => variant.price)
    || [item.minPrice, item.maxPrice].filter((price) => price !== undefined);
  if (!prices.length) return "Price unavailable";

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return minPrice === maxPrice
    ? formatMoney(minPrice)
    : `${formatMoney(minPrice)}–${formatMoney(maxPrice)}`;
}

function AdminDashboard() {
  const [orders, setOrders] = useState(readOrders);
  const [today] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    const syncOrders = (event) => {
      if (!event.key || event.key === ORDERS_STORAGE_KEY) setOrders(readOrders());
    };
    window.addEventListener("storage", syncOrders);
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    return () => {
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    };
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const todayKey = today.toDateString();
  const todaysOrders = orders.filter((order) => getOrderDate(order)?.toDateString() === todayKey);
  const pendingCount = orders.filter((order) => getOrderStatus(order) === "Pending").length;
  const todaysValue = todaysOrders.reduce((total, order) => total + Number(order.total || 0), 0);

  const salesByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const dateKey = date.toDateString();
      const amount = orders.reduce((total, order) => (
        getOrderDate(order)?.toDateString() === dateKey ? total + Number(order.total || 0) : total
      ), 0);
      return {
        label: date.toLocaleDateString("en", { weekday: "short" }),
        amount,
        isToday: index === 6,
      };
    });
    return days;
  }, [orders, today]);

  const topItems = useMemo(() => {
    const quantities = new Map();
    orders.forEach((order) => {
      getOrderItems(order).forEach((item) => {
        const key = item.productId || item.name;
        const price = Number(item.finalUnitPrice ?? item.price ?? 0);
        const current = quantities.get(key) || {
          quantity: 0,
          name: item.name,
          image: item.image,
          productId: item.productId,
          minPrice: price,
          maxPrice: price,
        };
        current.quantity += Number(item.quantity || 0);
        current.minPrice = Math.min(current.minPrice, price);
        current.maxPrice = Math.max(current.maxPrice, price);
        quantities.set(key, current);
      });
    });
    return [...quantities.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 4);
  }, [orders]);

  const filteredOrders = orders
    .filter((order) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query
        || String(order.id).toLowerCase().includes(query)
        || getCustomerName(order).toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All statuses" || getOrderStatus(order) === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (getOrderDate(b)?.getTime() || 0) - (getOrderDate(a)?.getTime() || 0))
    .slice(0, 6);

  const updateOrderStatus = (orderId, status) => {
    const updatedOrders = orders.map((order) => (
      order.id === orderId ? { ...order, status, orderStatus: status } : order
    ));
    saveOrders(updatedOrders);
  };

  const chartMax = Math.max(...salesByDay.map((day) => day.amount), 1);
  const dateLabel = today.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const stats = [
    { label: "Orders today", value: todaysOrders.length, note: "Orders received today", icon: "orders", tone: "red" },
    { label: "Today's order value", value: formatMoney(todaysValue), note: "Based on today's orders", icon: "cash", tone: "gold" },
    { label: "Pending orders", value: pendingCount, note: "Need your attention", icon: "clock", tone: "blue" },
    { label: "Menu items", value: menuItems.length, note: "Available in the catalog", icon: "package", tone: "green" },
  ];

  return (
    <div id="overview" className="min-h-screen bg-[#0B0B0F] text-[#F5F5F5]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#111116] px-5 py-6 lg:flex">
          <Link to="/staff" className="mb-10 flex items-center gap-3 no-underline">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E63946] font-['Alfa_Slab_One',serif] text-lg text-white">M</span>
            <span>
              <span className="block font-['Alfa_Slab_One',serif] text-base text-white">Motopot&apos;s</span>
              <span className="block text-[10px] font-extrabold uppercase tracking-[2px] text-[#A1A1AA]">Food House</span>
            </span>
          </Link>

          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[1.8px] text-[#74747E]">Workspace</p>
          <nav aria-label="Admin navigation" className="space-y-1">
            <a href="#overview" className="flex min-h-11 items-center gap-3 rounded-xl bg-[#E63946]/10 px-3 text-sm font-bold text-[#FF727D] no-underline">
              <Icon name="overview" className="h-[18px] w-[18px]" /> Overview
            </a>
            <a href="#orders" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#A1A1AA] no-underline transition hover:bg-white/[0.04] hover:text-white">
              <Icon name="orders" className="h-[18px] w-[18px]" /> Orders
              {pendingCount > 0 && <span className="ml-auto rounded-full bg-[#E63946] px-2 py-0.5 text-[10px] font-extrabold text-white">{pendingCount}</span>}
            </a>
            <a href="#menu" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#A1A1AA] no-underline transition hover:bg-white/[0.04] hover:text-white">
              <Icon name="menu" className="h-[18px] w-[18px]" /> Menu catalog
            </a>
            <span className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#65656F]" title="Inventory tracking is not available yet">
              <Icon name="package" className="h-[18px] w-[18px]" /> Inventory
              <span className="ml-auto rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">Soon</span>
            </span>
            <a href="#performance" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#A1A1AA] no-underline transition hover:bg-white/[0.04] hover:text-white">
              <Icon name="chart" className="h-[18px] w-[18px]" /> Performance
            </a>
          </nav>

          <div className="mt-auto rounded-2xl border border-white/[0.08] bg-[#19191F] p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#E63946]/15 text-[#FF727D]">
              <Icon name="people" className="h-[18px] w-[18px]" />
            </div>
            <p className="m-0 text-sm font-extrabold">Need a hand?</p>
            <p className="mb-3 mt-1 text-xs leading-5 text-[#A1A1AA]">Your store dashboard, all in one place.</p>
            <Link to="/" className="text-xs font-extrabold text-[#FF727D] no-underline hover:text-white">View storefront <span aria-hidden="true">→</span></Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-10 pt-5 sm:px-7 lg:px-10 lg:pt-8">
          <header className="mb-7 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 text-xs font-bold text-[#85858F]">{dateLabel}</p>
              <h1 className="mb-0 mt-1 font-['Alfa_Slab_One',serif] text-2xl sm:text-[30px]">Dashboard overview</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button type="button" onClick={() => document.getElementById("orders")?.scrollIntoView({ behavior: "smooth" })} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#15151C] text-[#B8B8C0] transition hover:text-white" aria-label={`${pendingCount} pending orders`}>
                <Icon name="bell" />
                {pendingCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E63946] ring-2 ring-[#15151C]" />}
              </button>
              <div ref={accountRef} className="relative border-l border-white/[0.08] pl-3 sm:pl-4">
                <button type="button" onClick={() => setAccountMenuOpen((value) => !value)} aria-expanded={accountMenuOpen} aria-label="Account options" className="flex min-h-10 items-center gap-2 rounded-xl px-1 text-left transition hover:bg-white/[0.04] sm:gap-3 sm:px-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2A2022] text-sm font-extrabold text-[#FF9BA2]">AD</span>
                  <span className="hidden sm:block">
                    <span className="block text-sm font-extrabold">Administrator</span>
                    <span className="block text-xs text-[#8D8D97]">Store manager</span>
                  </span>
                  <Icon name="chevron" className="hidden h-4 w-4 text-[#8D8D97] sm:block" />
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#22222B] p-1.5 shadow-xl shadow-black/30">
                    <Link to="/?login=user" onClick={() => setAccountMenuOpen(false)} className="block rounded-md px-3.5 py-2 text-sm font-semibold text-[#F5F5F5] no-underline hover:bg-[#15151C] hover:text-[#E63946]">User Login</Link>
                    <Link to="/?login=admin" onClick={() => setAccountMenuOpen(false)} className="block rounded-md px-3.5 py-2 text-sm font-semibold text-[#F5F5F5] no-underline hover:bg-[#15151C] hover:text-[#E63946]">Admin Login</Link>
                    <div className="my-1 border-t border-white/10" />
                    <Link to="/" onClick={() => setAccountMenuOpen(false)} className="block rounded-md px-3.5 py-2 text-sm font-semibold text-[#F5F5F5] no-underline hover:bg-[#15151C] hover:text-[#E63946]">Log out</Link>
                  </div>
                )}
              </div>
            </div>
          </header>

          <nav aria-label="Quick navigation" className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
            {[["Overview", "#overview"], ["Orders", "#orders"], ["Menu", "#menu"], ["Performance", "#performance"]].map(([label, href]) => (
              <a key={label} href={href} className="shrink-0 rounded-full border border-white/[0.08] bg-[#15151C] px-4 py-2 text-xs font-bold text-[#C3C3CA] no-underline">{label}</a>
            ))}
          </nav>

          <section className="relative mb-6 overflow-hidden rounded-2xl border border-[#E63946]/20 bg-gradient-to-br from-[#35181D] via-[#20161A] to-[#17171D] px-5 py-5 sm:px-7 sm:py-6">
            <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-[#E63946]/10 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#D2BFC1]">
                Admin workspace
                </span>
                <h2 className="mb-0 mt-3 font-['Alfa_Slab_One',serif] text-xl sm:text-2xl">Good food. Good to see you.</h2>
                <p className="mb-0 mt-1.5 text-sm text-[#C1AEB0]">Here&apos;s what&apos;s happening at Motopot&apos;s today.</p>
              </div>
              <a href="#orders" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#E63946] px-4 text-sm font-extrabold text-white no-underline shadow-lg shadow-[#E63946]/15 transition hover:-translate-y-0.5 hover:bg-[#C92D3A]">
                View orders <Icon name="arrow" className="h-4 w-4" />
              </a>
            </div>
          </section>

          <section aria-label="Store metrics" className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map((stat) => (
              <article key={stat.label} className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone === "red" ? "bg-[#E63946]/15 text-[#FF727D]" : stat.tone === "gold" ? "bg-amber-400/10 text-amber-300" : stat.tone === "blue" ? "bg-sky-400/10 text-sky-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                    <Icon name={stat.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="mt-1 text-[10px] font-extrabold uppercase tracking-[1px] text-[#70707A]">Overview</span>
                </div>
                <p className="mb-0 mt-4 text-[clamp(21px,3vw,27px)] font-extrabold leading-none tracking-tight">{stat.value}</p>
                <p className="mb-0 mt-2 text-xs font-bold text-[#CACAD0]">{stat.label}</p>
                <p className="mb-0 mt-1 text-[11px] text-[#777781]">{stat.note}</p>
              </article>
            ))}
          </section>

          <section id="performance" className="mb-6 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
            <article className="rounded-2xl border border-white/[0.07] bg-[#141419] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-extrabold">Order value</h2>
                  <p className="mb-0 mt-1 text-xs text-[#85858F]">Daily order totals · last 7 days</p>
                </div>
                <span className="rounded-lg border border-white/[0.07] bg-[#1B1B22] px-2.5 py-1.5 text-[11px] font-bold text-[#B5B5BE]">This week <Icon name="chevron" className="ml-1 inline h-3 w-3" /></span>
              </div>
              <div className="mt-6 flex h-40 items-end gap-3 sm:gap-5">
                {salesByDay.map((day) => (
                  <div key={day.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[9px] font-semibold text-[#777781]">{day.amount ? formatMoney(day.amount) : ""}</span>
                    <div className="flex h-[112px] w-full items-end rounded-t-md bg-[#1B1B22]">
                      <div
                        className={`w-full rounded-t-md transition-all ${day.isToday ? "bg-gradient-to-t from-[#C92D3A] to-[#FF6B75]" : "bg-gradient-to-t from-[#492027] to-[#9E3943]"}`}
                        style={{ height: `${day.amount ? Math.max((day.amount / chartMax) * 100, 8) : 3}%` }}
                        title={`${day.label}: ${formatMoney(day.amount)}`}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${day.isToday ? "text-[#FF727D]" : "text-[#777781]"}`}>{day.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article id="menu" className="rounded-2xl border border-white/[0.07] bg-[#141419] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-extrabold">Popular items</h2>
                  <p className="mb-0 mt-1 text-xs text-[#85858F]">By quantity ordered</p>
                </div>
                <span className="rounded-lg bg-[#E63946]/10 px-2.5 py-1.5 text-[11px] font-extrabold text-[#FF8A93]">{menuItems.length} items</span>
              </div>
              <div className="mt-4 space-y-3">
                {(topItems.length ? topItems : menuItems.slice(0, 3).map((item) => ({ ...item, quantity: 0 }))).map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#202027] text-xs font-extrabold text-[#8E8E98]">0{index + 1}</span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#202027]">
                      {item.image && <img src={item.image} alt="" className="h-full w-full object-contain p-1" />}
                      {!item.image && <Icon name="package" className="h-4 w-4 text-[#797983]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-xs font-bold">{item.name}</p>
                      <p className="mb-0 mt-1 text-[10px] text-[#A1A1AA]">{getProductPriceLabel(item)} <span className="text-[#777781]">· {item.quantity ? `${item.quantity} sold` : "No orders yet"}</span></p>
                    </div>
                    <span className="text-xs font-extrabold text-[#B8B8C0]">{item.quantity}</span>
                  </div>
                ))}
              </div>
              <p className="mb-0 mt-4 border-t border-white/[0.06] pt-3 text-[10px] leading-4 text-[#777781]">Popular items are based on orders saved on this device.</p>
            </article>
          </section>

          <section id="orders" className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141419]">
            <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="m-0 text-base font-extrabold">Recent orders</h2>
                <p className="mb-0 mt-1 text-xs text-[#85858F]">Review orders and update their status.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 sm:w-52">
                  <span className="sr-only">Search orders by number or customer</span>
                  <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777781]" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders..." className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1B1B22] pl-9 pr-3 text-xs text-white outline-none placeholder:text-[#777781] focus:border-[#E63946]/60" />
                </label>
                <label>
                  <span className="sr-only">Filter orders by status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1B1B22] px-3 text-xs font-semibold text-[#C4C4CB] outline-none focus:border-[#E63946]/60 sm:w-auto">
                    {["All statuses", ...orderStatuses].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="px-5 py-12 text-center sm:px-6">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#202027] text-[#92929B]"><Icon name="orders" className="h-6 w-6" /></span>
                <h3 className="mb-0 mt-4 text-sm font-extrabold">{orders.length ? "No matching orders" : "Your orders will show up here"}</h3>
                <p className="mb-0 mt-1 text-xs text-[#85858F]">{orders.length ? "Try a different search or status filter." : "New customer orders will appear here as soon as they are placed."}</p>
                {!orders.length && <Link to="/customer" className="mt-4 inline-flex text-xs font-extrabold text-[#FF727D] no-underline hover:text-white">Open customer menu <span className="ml-1" aria-hidden="true">→</span></Link>}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                      <tr className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#777781]">
                        <th className="px-6 py-3.5">Order</th><th className="px-4 py-3.5">Customer</th><th className="px-4 py-3.5">Items</th><th className="px-4 py-3.5">Total</th><th className="px-4 py-3.5">Status</th><th className="px-6 py-3.5 text-right">Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="border-t border-white/[0.05] text-xs">
                          <td className="px-6 py-4 font-extrabold">#{String(order.id).slice(-6)}</td>
                          <td className="px-4 py-4 text-[#C5C5CC]">{getCustomerName(order)}</td>
                          <td className="max-w-[210px] truncate px-4 py-4 text-[#9999A2]">{getOrderItems(order).map((item) => `${item.name} × ${item.quantity}`).join(", ") || "—"}</td>
                          <td className="px-4 py-4 font-extrabold">{formatMoney(order.total)}</td>
                          <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getOrderStatus(order) === "Completed" ? "bg-emerald-400/10 text-emerald-300" : getOrderStatus(order) === "Cancelled" ? "bg-red-400/10 text-red-300" : "bg-amber-300/10 text-amber-200"}`}>{getOrderStatus(order)}</span></td>
                          <td className="px-6 py-4 text-right">
                            <label>
                              <span className="sr-only">Update status for order {String(order.id).slice(-6)}</span>
                              <select value={getOrderStatus(order)} onChange={(event) => updateOrderStatus(order.id, event.target.value)} className="max-w-[150px] rounded-lg border border-white/[0.08] bg-[#1B1B22] px-2 py-2 text-[10px] font-bold text-[#D1D1D6] outline-none focus:border-[#E63946]/60">
                                {orderStatuses.map((status) => <option key={status}>{status}</option>)}
                              </select>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 p-4 md:hidden">
                  {filteredOrders.map((order) => (
                    <article key={order.id} className="rounded-xl border border-white/[0.06] bg-[#1A1A20] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="m-0 text-xs font-extrabold">Order #{String(order.id).slice(-6)}</p><p className="mb-0 mt-1 text-[11px] text-[#85858F]">{getCustomerName(order)}</p></div>
                        <span className="text-xs font-extrabold text-[#FF8A93]">{formatMoney(order.total)}</span>
                      </div>
                      <p className="mb-3 mt-3 text-[11px] text-[#9999A2]">{getOrderItems(order).map((item) => `${item.name} × ${item.quantity}`).join(", ") || "No item details"}</p>
                      <label className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-[10px] font-bold text-[#85858F]">
                        Status
                        <select value={getOrderStatus(order)} onChange={(event) => updateOrderStatus(order.id, event.target.value)} className="rounded-lg border border-white/[0.08] bg-[#141419] px-2 py-2 text-[10px] font-bold text-[#D1D1D6] outline-none focus:border-[#E63946]/60">
                          {orderStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#686872]">
            <span>Motopot&apos;s Food House · Admin dashboard</span>
            <Link to="/staff" className="font-bold text-[#85858F] no-underline hover:text-white">Back to dashboard</Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
