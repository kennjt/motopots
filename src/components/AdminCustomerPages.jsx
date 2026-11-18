import { useEffect, useMemo, useState } from "react";
import { ORDERS_UPDATED_EVENT, readOrders } from "../data/orderStorage";
import { formatMoney } from "../data/menuData";

const FAVORITES_KEY = "motopots-favorite-orders";

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export default function AdminCustomerPages({ favorites = false, showHeading = true }) {
  const [orders, setOrders] = useState(readOrders);
  const [savedFavorites, setSavedFavorites] = useState(readFavorites);
  const customers = useMemo(() => {
    const byIdentity = new Map();
    orders.forEach((order) => {
      const customer = typeof order.customer === "object" ? order.customer : { name: order.customer };
      const key = String(customer.email || customer.phone || customer.name || "Guest").trim().toLowerCase();
      const existing = byIdentity.get(key) || {
        id: key,
        name: customer.name || "Guest customer",
        email: customer.email || "—",
        phone: customer.phone || "—",
        orderCount: 0,
        totalSpent: 0,
      };
      existing.orderCount += 1;
      existing.totalSpent += Number(order.total || 0);
      byIdentity.set(key, existing);
    });
    return [...byIdentity.values()].sort((a, b) => b.orderCount - a.orderCount);
  }, [orders]);

  useEffect(() => {
    const syncOrders = () => setOrders(readOrders());
    const syncFavorites = (event) => {
      if (!event.key || event.key === FAVORITES_KEY) setSavedFavorites(readFavorites());
    };
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    window.addEventListener("storage", syncFavorites);
    return () => {
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders);
      window.removeEventListener("storage", syncFavorites);
    };
  }, []);

  if (favorites) {
    return (
      <section>
        {showHeading && <div className="mb-6"><h2 className="m-0 text-2xl font-extrabold">Favorite Orders</h2><p className="mt-1 text-sm text-[#A1A1AA]">Saved customer orders available in this browser.</p></div>}
        {savedFavorites.length ? <div className="grid gap-3 lg:grid-cols-2">{savedFavorites.map((favorite) => <article key={favorite.id} className="rounded-2xl border border-white/[0.08] bg-[#111116] p-4"><h3 className="m-0 font-extrabold">{favorite.name || favorite.items?.[0]?.name || "Saved order"}</h3><p className="mt-2 text-xs text-[#A1A1AA]">{favorite.orderType || "Order"} · {favorite.items?.length || 0} items</p><p className="mb-0 text-sm text-[#D1D1D6]">{favorite.items?.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</p></article>)}</div> : <EmptyState text="No saved favorite orders are available." />}
      </section>
    );
  }

  return (
    <section>
      {showHeading && <div className="mb-6"><h2 className="m-0 text-2xl font-extrabold">Customers</h2><p className="mt-1 text-sm text-[#A1A1AA]">Customer records summarized from saved orders.</p></div>}
      {customers.length ? <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#111116]"><table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr className="border-b border-white/[0.08] text-xs text-[#85858F]">{["Customer", "Email", "Phone", "Orders", "Order total"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-b border-white/[0.05] last:border-0"><td className="px-4 py-3 font-bold">{customer.name}</td><td className="px-4 py-3 text-[#A1A1AA]">{customer.email}</td><td className="px-4 py-3 text-[#A1A1AA]">{customer.phone}</td><td className="px-4 py-3">{customer.orderCount}</td><td className="px-4 py-3 font-bold">{formatMoney(customer.totalSpent)}</td></tr>)}</tbody></table></div> : <EmptyState text="Customer records will appear after orders are placed." />}
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-[#111116] px-5 py-12 text-center text-sm text-[#A1A1AA]">{text}</div>;
}
