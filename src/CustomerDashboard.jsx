import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Menu from "./components/menu";
import CustomerNavbar from "./components/customernavbar";
import MyOrder from "./components/MyOrder";
import ProfileSettings from "./components/profile";
import CustomerBanner from "./components/CustomerBanner";

const money = (value) => `₱${value.toFixed(2)}`;

function CustomerDashboard() {
  const [activeSection, setActiveSection] = useState("menu");
  const navigate = useNavigate();
  const [showOrders, setShowOrders] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const addToCart = (item) =>
    setCart((current) => ({
      ...current,
      [item.id]: { ...item, quantity: (current[item.id]?.quantity || 0) + 1 },
    }));
  const changeQuantity = (id, amount) =>
    setCart((current) => {
      const nextQuantity = (current[id]?.quantity || 0) + amount;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { ...current[id], quantity: nextQuantity } };
    });
  const removeFromCart = (id) =>
    setCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  const placeOrder = () => {
    if (!cartItems.length) return;
    setOrders((current) => [
      {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        items: cartItems,
        total: subtotal,
        status: "Preparing",
      },
      ...current,
    ]);
    setCart({});
    setActiveSection("orders");
  };
  return (
    <div className="min-h-screen bg-[#FFF]">
      <CustomerNavbar
        onOrdersClick={() => setShowOrders(true)}
        onProfileClick={() => setShowProfile(true)}
      />
      <main className="mx-auto max-w-7xl px-5 py-3">
        <CustomerBanner />
        <div className=" flex items-center">
          <h1 className="text-3xl font-['Alfa_Slab_One',serif] text-[#B3231B]">
            Order Menu
          </h1>
        </div>

        <div className=" flex items-center">
          <p className="text-sm text-gray-600">
            Browse our menu and add items to your cart. When you're ready, place your order!
          </p>
        </div>


        {activeSection === "menu" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div>
              <Menu onAddToCart={addToCart} cart={cart} showAddToCart />
            </div>
            <aside className="h-fit rounded-xl bg-white p-5 shadow lg:sticky lg:top-6">
              <h3 className="text-xl font-bold text-[#B3231B]">
                Your Cart ({cartItems.length})
              </h3>
              {!cartItems.length && (
                <p className="mt-3 text-gray-600">Your cart is empty.</p>
              )}
              <div className="mt-4 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between gap-2 font-bold text-[#2B2118]">
                      <span>{item.name}</span>
                      <span>{money(item.price * item.quantity)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name}`}
                          onClick={() => changeQuantity(item.id, -1)}
                          className="h-7 w-7 rounded bg-[#F7ECD4] font-bold"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.name}`}
                          onClick={() => changeQuantity(item.id, 1)}
                          className="h-7 w-7 rounded bg-[#F7ECD4] font-bold"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="font-bold text-[#B3231B] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-1 border-t pt-4 font-extrabold text-[#1F2A44]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Total</span>
                  <span>{money(subtotal)}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={!cartItems.length}
                onClick={placeOrder}
                className="mt-4 w-full rounded-lg bg-[#B3231B] py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#8C1913]"
              >
                Place Order
              </button>
            </aside>
          </div>
        )}
        {activeSection === "orders" && (
          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-xl font-bold text-[#B3231B]">My Orders</h3>
            {!orders.length ? (
              <p className="mt-3 text-gray-600">You have no orders yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap justify-between gap-2 font-bold text-[#1F2A44]">
                      <span>Order #{String(order.id).slice(-6)}</span>
                      <span>{order.status}</span>
                    </div>
                    <p className="mt-2 text-gray-600">
                      {order.items
                        .map((item) => `${item.name} × ${item.quantity}`)
                        .join(", ")}
                    </p>
                    <p className="mt-2 font-extrabold text-[#B3231B]">
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
