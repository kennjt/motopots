import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerNavbar from "./customernavbar";
import { formatMoney } from "../data/menuData";

const money = formatMoney;

const statusStyles = {
  Pending: "bg-[#22222B] text-[#F5F5F5]",
  Preparing: "bg-[#E63946]/20 text-[#F5F5F5]",
  "Ready for Pickup": "bg-[#22222B] text-[#F5F5F5]",
  Completed: "bg-green-500/20 text-green-300",
  Cancelled: "bg-red-500/20 text-red-300",
};

const paymentStyles = {
  Unpaid: "bg-yellow-500/15 text-yellow-200",
  "Pending Verification": "bg-yellow-500/15 text-yellow-200",
  Paid: "bg-green-500/15 text-green-300",
  Rejected: "bg-red-500/15 text-red-300",
  Refunded: "bg-blue-500/15 text-blue-300",
};

const readOrders = () => {
  try {
    const savedOrders = JSON.parse(localStorage.getItem("motopots-orders") || "[]");
    return Array.isArray(savedOrders) ? savedOrders : [];
  } catch {
    return [];
  }
};

function MyOrder({ modal = false, onClose }) {
  const [orders, setOrders] = useState(readOrders);

  useEffect(() => {
    const syncOrders = () => setOrders(readOrders());
    window.addEventListener("storage", syncOrders);
    window.addEventListener("focus", syncOrders);
    return () => {
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener("focus", syncOrders);
    };
  }, []);

  const orderContent = (
    <main className="mx-auto w-full max-w-4xl px-5 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-[#F5F5F5]">My Orders</h1>
          <p className="mt-2 text-[#A1A1AA]">Track and manage your food orders.</p>
        </div>

        {!orders.length ? (
          <section className="rounded-xl border border-white/10 bg-[#15151C] p-8 text-center shadow-lg shadow-black/20 sm:p-12">
            <h2 className="text-xl font-bold text-[#F5F5F5]">No orders yet</h2>
            <p className="mt-2 text-[#A1A1AA]">Your delicious order history will appear here.</p>
            <Link
              to="/customer"
              className="mt-6 inline-block rounded-lg bg-[#E63946] px-6 py-3 font-extrabold text-white transition hover:bg-[#C92D3A]"
            >
              Browse Menu
            </Link>
          </section>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const orderDate = order.createdAt || order.date || order.id;
              const status = order.status || "Pending";
              return (
                <article key={order.id} className="rounded-xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-[#F5F5F5]">Order #{String(order.id).slice(-6)}</h2>
                      <p className="mt-1 text-sm text-[#A1A1AA]">{new Date(orderDate).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${statusStyles[status] || statusStyles.Pending}`}>
                      {status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className={`rounded-full px-3 py-1 ${paymentStyles[order.paymentStatus] || paymentStyles.Unpaid}`}>Payment: {order.paymentStatus || "Unpaid"}</span>
                    {order.paymentMethod && <span className="rounded-full bg-[#22222B] px-3 py-1 text-[#A1A1AA]">{order.paymentMethod}</span>}
                  </div>
                  <div className="mt-4 space-y-3">
                    {(order.items || []).map((item) => (
                      <div key={item.id || item.name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div>
                          <p className="font-bold text-[#F5F5F5]">{item.name}</p>
                          {!!item.details?.length && <p className="text-[#A1A1AA]">{item.details.join(" • ")}</p>}
                          <p className="text-[#A1A1AA]">Quantity: {item.quantity} × {money(item.finalUnitPrice ?? item.price)}</p>
                        </div>
                        <span className="font-bold text-[#E63946]">{money((item.finalUnitPrice ?? item.price) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-lg font-extrabold text-[#F5F5F5]">
                    <span>Total</span>
                    <span className="text-[#E63946]">{money(order.total)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
    </main>
  );

  if (modal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="ordersTitle"
          className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/10 bg-[#15151C] shadow-xl shadow-black/40"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-[#22222B] px-5 py-4">
            <h2
              id="ordersTitle"
              className="m-0 font-['Alfa_Slab_One',serif] text-xl text-[#F5F5F5]"
            >
              My Orders
            </h2>
            <button
              type="button"
              aria-label="Close orders"
              onClick={onClose}
              className="rounded px-2 text-2xl leading-none text-[#A1A1AA] hover:text-[#E63946]"
            >
              &times;
            </button>
          </header>
          {orderContent}
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#F5F5F5]">
      <CustomerNavbar />
      {orderContent}
    </div>
  );
}

export default MyOrder;
