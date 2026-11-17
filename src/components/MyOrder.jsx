import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerNavbar from "./customernavbar";
import { formatMoney } from "../data/menuData";
import { ORDERS_UPDATED_EVENT, readOrders, saveOrders } from "../data/orderStorage";

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

function MyOrder({ modal = false, onClose }) {
  const [orders, setOrders] = useState(readOrders);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelNotice, setCancelNotice] = useState("");

  useEffect(() => {
    const syncOrders = () => setOrders(readOrders());
    window.addEventListener("storage", syncOrders);
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    window.addEventListener("focus", syncOrders);
    return () => {
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders);
      window.removeEventListener("focus", syncOrders);
    };
  }, []);

  const canCancel = (order) => ["Pending", "Pending Confirmation"].includes(order.orderStatus || order.status || "Pending");

  const cancelOrder = async () => {
    if (!cancelTarget || cancellingOrderId) return;
    const currentOrders = readOrders();
    const currentOrder = currentOrders.find((order) => String(order.id) === String(cancelTarget.id));
    // Re-check against the latest stored status so a stale page cannot cancel a progressed order.
    if (!currentOrder || !canCancel(currentOrder)) {
      setOrders(currentOrders);
      setCancelTarget(null);
      setCancelNotice("This order can no longer be cancelled.");
      return;
    }
    setCancellingOrderId(currentOrder.id);
    const cancelledOrder = { ...currentOrder, status: "Cancelled", orderStatus: "Cancelled", cancelledAt: new Date().toISOString() };
    const updatedOrders = currentOrders.map((order) => String(order.id) === String(currentOrder.id) ? cancelledOrder : order);
    saveOrders(updatedOrders);
    setOrders(updatedOrders);
    setCancellingOrderId(null);
    setCancelTarget(null);
    setCancelNotice(`Order #${String(currentOrder.id).slice(-6)} was cancelled.`);
  };

  const cancelDialog = cancelTarget && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="cancel-order-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15151C] p-6 shadow-2xl shadow-black/40">
        <h2 id="cancel-order-title" className="text-xl font-extrabold text-[#F5F5F5]">Cancel Order?</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">Are you sure you want to cancel this order? This action cannot be undone.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setCancelTarget(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-[#F5F5F5] transition hover:bg-[#22222B]">Keep Order</button>
          <button type="button" onClick={cancelOrder} disabled={Boolean(cancellingOrderId)} className="rounded-xl bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-60">{cancellingOrderId ? "Cancelling…" : "Yes, Cancel Order"}</button>
        </div>
      </section>
    </div>
  );

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
              const status = order.orderStatus || order.status || "Pending";
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
                          {item.notes && <p className="mt-1 italic text-[#D8A6AA]">Note: {item.notes}</p>}
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
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    {canCancel(order) && <button type="button" onClick={() => setCancelTarget(order)} disabled={cancellingOrderId === order.id} className="rounded-lg border border-red-400/30 px-3 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">{cancellingOrderId === order.id ? "Cancelling…" : "Cancel Order"}</button>}
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
          {cancelNotice && <p role="status" className="px-5 pt-4 text-sm font-bold text-emerald-300">{cancelNotice}</p>}
          {orderContent}
          {cancelDialog}
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#F5F5F5]">
      <CustomerNavbar />
      {cancelNotice && <p role="status" className="mx-auto mt-4 max-w-4xl px-5 text-sm font-bold text-emerald-300">{cancelNotice}</p>}
      {orderContent}
      {cancelDialog}
    </div>
  );
}

export default MyOrder;
