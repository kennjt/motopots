import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerNavbar from "./customernavbar";

const money = (value) => `₱${Number(value || 0).toFixed(2)}`;

const statusStyles = {
  Pending: "bg-yellow-100 text-yellow-800",
  Preparing: "bg-orange-100 text-orange-800",
  "Ready for Pickup": "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
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
          <h1 className="text-3xl font-extrabold text-[#1F2A44]">My Orders</h1>
          <p className="mt-2 text-gray-600">Track and manage your food orders.</p>
        </div>

        {!orders.length ? (
          <section className="rounded-xl bg-white p-8 text-center shadow-sm sm:p-12">
            <h2 className="text-xl font-bold text-[#1F2A44]">No orders yet</h2>
            <p className="mt-2 text-gray-600">Your delicious order history will appear here.</p>
            <Link
              to="/customer"
              className="mt-6 inline-block rounded-lg bg-[#B3231B] px-6 py-3 font-extrabold text-white transition hover:bg-[#8C1913]"
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
                <article key={order.id} className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-[#1F2A44]">Order #{String(order.id).slice(-6)}</h2>
                      <p className="mt-1 text-sm text-gray-500">{new Date(orderDate).toLocaleString()}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${statusStyles[status] || statusStyles.Pending}`}>
                      {status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(order.items || []).map((item) => (
                      <div key={item.id || item.name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div>
                          <p className="font-bold text-[#1F2A44]">{item.name}</p>
                          <p className="text-gray-500">Quantity: {item.quantity} × {money(item.price)}</p>
                        </div>
                        <span className="font-bold text-[#B3231B]">{money(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-between border-t border-gray-200 pt-4 text-lg font-extrabold text-[#1F2A44]">
                    <span>Total</span>
                    <span className="text-[#B3231B]">{money(order.total)}</span>
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
          className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-xl border-2 border-[#E9A82C] bg-[#F7ECD4] shadow-xl"
        >
          <header className="flex items-center justify-between border-b-2 border-[#E9A82C] bg-[#F7ECD4] px-5 py-4">
            <h2
              id="ordersTitle"
              className="m-0 font-['Alfa_Slab_One',serif] text-xl text-[#1F2A44]"
            >
              My Orders
            </h2>
            <button
              type="button"
              aria-label="Close orders"
              onClick={onClose}
              className="rounded px-2 text-2xl leading-none text-[#2B2118] hover:text-[#B3231B]"
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
    <div className="min-h-screen bg-[#F7ECD4]">
      <CustomerNavbar />
      {orderContent}
    </div>
  );
}

export default MyOrder;
