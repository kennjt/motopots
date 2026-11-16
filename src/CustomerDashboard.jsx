import { useEffect, useMemo, useState } from "react";
import Menu from "./components/menu";
import CustomerNavbar from "./components/customernavbar";
import MyOrder from "./components/MyOrder";
import ProfileSettings from "./components/profile";
import Checkout from "./components/Checkout";
import { formatMoney } from "./data/menuData";

const money = formatMoney;

function CustomerDashboard() {
  const [activeSection, setActiveSection] = useState("menu");
  const [showOrders, setShowOrders] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [confirmationOrder, setConfirmationOrder] = useState(null);
  const [cart, setCart] = useState(() =>
    JSON.parse(localStorage.getItem("motopots-cart") || "{}"),
  );
  const [orders, setOrders] = useState(() =>
    JSON.parse(localStorage.getItem("motopots-orders") || "[]"),
  );
  useEffect(
    () => localStorage.setItem("motopots-cart", JSON.stringify(cart)),
    [cart],
  );
  useEffect(
    () => localStorage.setItem("motopots-orders", JSON.stringify(orders)),
    [orders],
  );
  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.finalUnitPrice ?? item.price ?? 0) * item.quantity,
    0,
  );
  const addToCart = (item) => setCart((current) => ({
    ...current,
    [item.id]: { ...item, quantity: (current[item.id]?.quantity || 0) + 1, subtotal: item.finalUnitPrice * ((current[item.id]?.quantity || 0) + 1) },
  }));
  const changeQuantity = (id, amount) =>
    setCart((current) => {
      const nextQuantity = (current[id]?.quantity || 0) + amount;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { ...current[id], quantity: nextQuantity, subtotal: (current[id].finalUnitPrice ?? current[id].price) * nextQuantity } };
    });
  const removeFromCart = (id) =>
    setCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  const beginCheckout = () => {
    if (cartItems.length) setActiveSection("checkout");
  };
  const placeOrder = async (paymentData) => {
    if (!cartItems.length || submittingOrder) return;
    setSubmittingOrder(true);
    const order = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      customer: paymentData.customer,
      orderType: paymentData.orderType,
      items: cartItems.map((item) => ({ ...item, subtotal: (item.finalUnitPrice ?? item.price) * item.quantity })),
      total: subtotal,
      paymentMethod: paymentData.paymentMethod,
      paymentStatus: paymentData.paymentMethod === "GCash" ? "Pending Verification" : "Unpaid",
      paymentReference: paymentData.referenceNumber || "",
      paymentProof: paymentData.proof || null,
      orderStatus: "Pending",
      status: "Pending",
    };
    setOrders((current) => [order, ...current]);
    setCart({});
    setConfirmationOrder(order);
    setActiveSection("confirmation");
    setSubmittingOrder(false);
  };
  return (
    <div className="min-h-screen text-[#F5F5F5]">
      <CustomerNavbar
        onOrdersClick={() => setShowOrders(true)}
        onProfileClick={() => setShowProfile(true)}
        cartItems={cartItems}
        subtotal={subtotal}
        onQuantityChange={changeQuantity}
        onRemove={removeFromCart}
        onCheckout={beginCheckout}
      />
      <main className="mx-auto max-w-7xl px-5 py-3">
        <div className=" flex items-center">
          <h1 className="text-3xl font-['Alfa_Slab_One',serif] text-[#F5F5F5]">
            Order Menu
          </h1>
        </div>

        <div className=" flex items-center">
          <p className="text-sm text-[#A1A1AA]">
            Browse our menu and add items to your cart. When you're ready, place your order!
          </p>
        </div>


        {activeSection === "menu" && <Menu onAddToCart={addToCart} cart={cart} showAddToCart />}
        {activeSection === "checkout" && <Checkout cartItems={cartItems} subtotal={subtotal} onBack={() => setActiveSection("menu")} onSubmit={placeOrder} submitting={submittingOrder} />}
        {activeSection === "confirmation" && confirmationOrder && (
          <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#15151C] p-6 shadow-lg shadow-black/20 sm:p-10">
            <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-3xl text-green-300">✓</div><h1 className="mt-4 text-3xl font-extrabold text-[#F5F5F5]">Order Submitted</h1><p className="mt-2 text-[#A1A1AA]">Order #{String(confirmationOrder.id).slice(-6)} was received.</p></div>
            <div className="mt-8 grid gap-4 rounded-xl bg-[#22222B]/60 p-4 text-sm sm:grid-cols-2"><p><span className="text-[#A1A1AA]">Customer</span><br /><strong>{confirmationOrder.customer.name}</strong></p><p><span className="text-[#A1A1AA]">Order date</span><br /><strong>{new Date(confirmationOrder.createdAt).toLocaleString()}</strong></p><p><span className="text-[#A1A1AA]">Payment</span><br /><strong>{confirmationOrder.paymentMethod}</strong></p><p><span className="text-[#A1A1AA]">Payment status</span><br /><strong className="text-[#E63946]">{confirmationOrder.paymentStatus}</strong></p><p><span className="text-[#A1A1AA]">Order status</span><br /><strong>{confirmationOrder.orderStatus}</strong></p><p><span className="text-[#A1A1AA]">Total</span><br /><strong className="text-[#E63946]">{money(confirmationOrder.total)}</strong></p></div>
            {confirmationOrder.paymentMethod === "GCash" && <p className="mt-5 rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">Your GCash payment is pending verification. It will not be marked as paid until authorized staff confirms it.</p>}
            <div className="mt-6 space-y-3">{confirmationOrder.items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-white/10 pb-3 text-sm"><div><p className="font-bold text-[#F5F5F5]">{item.name} × {item.quantity}</p><p className="text-[#A1A1AA]">{item.details?.join(" · ")}</p></div><span className="font-bold text-[#E63946]">{money(item.subtotal)}</span></div>)}</div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={() => setShowOrders(true)} className="rounded-xl bg-[#E63946] px-5 py-3 font-bold text-white hover:bg-[#C92D3A]">View My Orders</button><button type="button" onClick={() => setActiveSection("menu")} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-[#F5F5F5] hover:bg-[#22222B]">Back to Menu</button><a href="/" className="rounded-xl border border-white/10 px-5 py-3 text-center font-bold text-[#F5F5F5] hover:bg-[#22222B]">Back to Home</a></div>
          </section>
        )}
        {activeSection === "orders" && (
          <section className="rounded-xl border border-white/10 bg-[#15151C] p-6 shadow-lg shadow-black/20">
            <h3 className="text-xl font-bold text-[#E63946]">My Orders</h3>
            {!orders.length ? (
              <p className="mt-3 text-[#A1A1AA]">You have no orders yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-lg border border-white/10 bg-[#22222B]/50 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2 font-bold text-[#F5F5F5]">
                      <span>Order #{String(order.id).slice(-6)}</span>
                      <span>{order.status}</span>
                    </div>
                    <p className="mt-2 text-[#A1A1AA]">
                      {order.items
                        .map((item) => `${item.name} × ${item.quantity}`)
                        .join(", ")}
                    </p>
                    <p className="mt-2 font-extrabold text-[#E63946]">
                      Total: {money(order.total)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      {showOrders && (
        <MyOrder modal onClose={() => setShowOrders(false)} />
      )}
      {showProfile && (
        <ProfileSettings modal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
export default CustomerDashboard;
