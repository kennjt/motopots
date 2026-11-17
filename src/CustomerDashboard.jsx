import { useEffect, useMemo, useState } from "react";
import Menu from "./components/menu";
import CustomerNavbar from "./components/customernavbar";
import MyOrder from "./components/MyOrder";
import ProfileSettings from "./components/profile";
import Checkout from "./components/Checkout";
import FAQ from "./components/faq";
import Footer from "./components/footer";
import { formatMoney, makeCartItem, menuItems } from "./data/menuData";
import { ORDERS_STORAGE_KEY, ORDERS_UPDATED_EVENT, readOrders, saveOrders } from "./data/orderStorage";
import inasal from "./assets/inasal_withoutbg.png";

const money = formatMoney;
const FAVORITE_ORDERS_KEY = "motopots-favorite-orders";

const readFavoriteOrders = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITE_ORDERS_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const savedOrderSignature = (order) => JSON.stringify({
  orderType: order.orderType,
  items: (order.items || []).map((item) => ({ productId: item.productId, variant: item.variant, flavor: item.flavor, addOns: item.addOns || [], notes: item.notes || "", quantity: item.quantity })),
});

function CustomerDashboard() {
  const [activeSection, setActiveSection] = useState("menu");
  const [showOrders, setShowOrders] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [confirmationOrder, setConfirmationOrder] = useState(null);
  const [favoriteOrders, setFavoriteOrders] = useState(readFavoriteOrders);
  const [favoriteName, setFavoriteName] = useState("");
  const [favoriteNotice, setFavoriteNotice] = useState("");
  const [favoriteToEdit, setFavoriteToEdit] = useState(null);
  const [checkoutOrderType, setCheckoutOrderType] = useState("Pickup");
  const [cart, setCart] = useState(() =>
    JSON.parse(localStorage.getItem("motopots-cart") || "{}"),
  );
  const [orders, setOrders] = useState(readOrders);
  useEffect(
    () => localStorage.setItem("motopots-cart", JSON.stringify(cart)),
    [cart],
  );
  useEffect(() => localStorage.setItem(FAVORITE_ORDERS_KEY, JSON.stringify(favoriteOrders)), [favoriteOrders]);
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
  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.finalUnitPrice ?? item.price ?? 0) * item.quantity,
    0,
  );
  const addToCart = (item) => setCart((current) => ({
    ...current,
    [item.id]: { ...item, quantity: (current[item.id]?.quantity || 0) + 1, subtotal: item.finalUnitPrice * ((current[item.id]?.quantity || 0) + 1) },
  }));
  const resolveFavoriteItem = (savedItem) => {
    const product = menuItems.find((item) => item.id === savedItem.productId);
    if (!product) return { error: `${savedItem.name || "An item"} is no longer available.` };
    const variant = product.variants.find((item) => item.label === savedItem.variant && (!savedItem.flavor || item.flavor === savedItem.flavor)) || product.variants.find((item) => item.label === savedItem.variant);
    if (!variant) return { error: `${product.name} no longer has the saved size or flavor.` };
    const savedAddOns = savedItem.addOns || [];
    const addOns = (product.addOns || []).filter((addOn) => savedAddOns.includes(addOn.label)).map((addOn) => addOn.id);
    if (addOns.length !== savedAddOns.length) return { error: `One or more add-ons for ${product.name} are no longer available.` };
    return { product, selection: { variantId: variant.id, flavor: savedItem.flavor || variant.flavor, quantity: savedItem.variant || variant.label, addOns, notes: savedItem.notes || "" } };
  };
  const reorderFavorite = (savedOrder) => {
    const resolved = savedOrder.items.map(resolveFavoriteItem);
    const error = resolved.find((item) => item.error);
    if (error) {
      window.alert(error.error);
      return;
    }
    setCart((current) => resolved.reduce((next, item, index) => {
      const cartItem = makeCartItem(item.product, item.selection);
      const savedItem = savedOrder.items[index];
      cartItem.quantity = savedItem.quantity || 1;
      cartItem.subtotal = cartItem.finalUnitPrice * cartItem.quantity;
      return { ...next, [cartItem.id]: { ...cartItem, quantity: (next[cartItem.id]?.quantity || 0) + cartItem.quantity, subtotal: cartItem.finalUnitPrice * ((next[cartItem.id]?.quantity || 0) + cartItem.quantity) } };
    }, { ...current }));
    setCheckoutOrderType(savedOrder.orderType || "Pickup");
    setActiveSection("menu");
    setFavoriteNotice("Saved order added to your cart.");
  };
  const editFavorite = (savedOrder) => {
    const firstItem = savedOrder.items?.[0];
    const resolved = firstItem && resolveFavoriteItem(firstItem);
    if (!resolved || resolved.error) {
      window.alert(resolved?.error || "This saved order is unavailable.");
      return;
    }
    setCheckoutOrderType(savedOrder.orderType || "Pickup");
    setFavoriteToEdit(firstItem);
    setActiveSection("menu");
  };
  const removeFavorite = (favoriteId) => setFavoriteOrders((current) => current.filter((order) => order.id !== favoriteId));
  const saveConfirmationAsFavorite = () => {
    if (!confirmationOrder) return;
    const snapshot = { ...confirmationOrder, id: `favorite-${Date.now()}`, name: favoriteName.trim(), savedAt: new Date().toISOString(), items: confirmationOrder.items.map((item) => ({ ...item, savedPrice: item.finalUnitPrice ?? item.price })) };
    if (favoriteOrders.some((order) => savedOrderSignature(order) === savedOrderSignature(snapshot))) {
      setFavoriteNotice("This order is already in your favorites.");
      return;
    }
    setFavoriteOrders((current) => [snapshot, ...current]);
    setFavoriteNotice("Order added to your favorites!");
    setFavoriteName("");
  };
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
  const updateCartNotes = (id, notes) =>
    setCart((current) => ({ ...current, [id]: { ...current[id], notes } }));
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
    const updatedOrders = [order, ...readOrders()];
    saveOrders(updatedOrders);
    setOrders(updatedOrders);
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
        onNotesChange={updateCartNotes}
        onCheckout={beginCheckout}
        favoriteOrders={favoriteOrders}
        favoriteCount={favoriteOrders.length}
        onReorderFavorite={reorderFavorite}
        onEditFavorite={editFavorite}
        onRemoveFavorite={removeFavorite}
      />
      <main className="mx-auto max-w-7xl px-5 py-3">
        {activeSection === "menu" && (
          <>
            <section
              id="home"
              className="mp-hero relative isolate flex min-h-[calc(100svh-76px)] items-center overflow-hidden py-8 sm:py-5"
            >
              <div className="mx-auto w-full max-w-6xl px-1 sm:px-2">
                <div className="grid grid-cols-1 items-center gap-8 sm:gap-8 lg:grid-cols-12">
                  <div className="order-2 min-w-0 lg:order-1 lg:col-span-7">
                    <p className="mb-2 text-sm font-extrabold uppercase tracking-[3px] text-[#E63946]">
                      Welcome to
                    </p>
                    <h1 className="mb-1 leading-[0.95]">
                      <span className="block font-['Alfa_Slab_One',serif] text-[clamp(25px,7vw,60px)] text-[#F5F5F5] [text-shadow:3px_3px_0_#E63946]">
                        Motopot&apos;s
                      </span>
                      <span className="mt-3 block font-['Alfa_Slab_One',serif] text-[clamp(25px,5vw,40px)] italic text-[#F5F5F5]">
                        Food House
                      </span>
                    </h1>
                    <p className="mb-3 mt-3 max-w-[780px] text-lg leading-[1.55] text-[#A1A1AA] sm:text-xl">
                      Grilled, sizzling and sweet, all in one place. Order your
                      favorites online and we&apos;ll get them ready for you.
                    </p>
                    <ul className="mb-6 flex list-none flex-wrap gap-2 p-0">
                      {["Bacolod Chicken Inasal", "Takoyaki", "Halo-Halo"].map((item) => (
                        <li key={item} className="rounded-full border border-white/10 bg-[#22222B] px-3 py-1 text-sm font-extrabold text-[#F5F5F5]">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a href="#customer-menu" className="min-h-11 rounded-xl border border-[#E63946] bg-[#E63946] px-4 py-2 text-lg font-extrabold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-[#C92D3A]">
                        Order Now
                      </a>
                      <a href="#customer-menu" className="min-h-11 rounded-xl border border-white/10 bg-[#15151C] px-4 py-2 text-lg font-extrabold text-[#F5F5F5] no-underline transition-all hover:-translate-y-0.5 hover:border-[#E63946] hover:bg-[#22222B]">
                        View Menu
                      </a>
                    </div>
                  </div>
                  <div className="order-1 flex min-w-0 justify-center lg:order-2 lg:col-span-5 lg:justify-end">
                    <div className="w-full max-w-[500px] overflow-hidden">
                      <img src={inasal} alt="Bacolod chicken inasal served with rice" className="block h-auto w-full object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="customer-menu" className="relative z-10 min-h-screen w-full py-12">
              <div className="mx-auto w-full max-w-6xl text-center">
                <h2 className="mb-1 font-['Alfa_Slab_One',serif] text-3xl text-[#F5F5F5] sm:text-4xl">Our Menu</h2>
                <p className="mb-3 text-base leading-[1.55] text-[#A1A1AA]">Choose your favorites, customize your order, and add them to your cart.</p>
                <Menu onAddToCart={addToCart} cart={cart} showAddToCart favoriteToEdit={favoriteToEdit} onFavoriteEditHandled={() => setFavoriteToEdit(null)} />
              </div>
            </section>
            <section id="customer-about" className="mb-10 bg-[#15151C]/60 px-4 py-10 sm:px-6 lg:px-4">
              <h2 className="mb-8 text-center font-['Alfa_Slab_One',serif] text-3xl text-[#F5F5F5] sm:mb-12 sm:text-4xl">
                About Us
              </h2>
              <div className="mx-auto w-full max-w-6xl">
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                  <div className="min-w-0 lg:col-span-7">
                    <h2 className="mb-1 leading-[0.95]">
                      <span className="block font-['Alfa_Slab_One',serif] text-[clamp(25px,7vw,50px)] text-[#F5F5F5] [text-shadow:3px_3px_0_#E63946]">
                        Motopot&apos;s
                      </span>
                      <span className="mt-3 block font-['Alfa_Slab_One',serif] text-[clamp(25px,5vw,30px)] italic text-[#F5F5F5]">
                        Food House
                      </span>
                    </h2>
                    <p className="mb-3 mt-3 max-w-[780px] text-lg leading-[1.55] text-[#A1A1AA]">
                      Enjoy Bacolod Chicken Inasal, freshly made Takoyaki, and
                      sweet Halo-Halo. Browse our menu and place your order
                      online for pickup.
                    </p>
                  </div>
                  <div className="min-w-0 lg:col-span-5">
                    <FAQ />
                  </div>
                </div>
              </div>
            </section>
            <Footer />
          </>
        )}
        {activeSection === "checkout" && <Checkout cartItems={cartItems} subtotal={subtotal} initialOrderType={checkoutOrderType} onBack={() => setActiveSection("menu")} onSubmit={placeOrder} submitting={submittingOrder} />}
        {activeSection === "confirmation" && confirmationOrder && (
          <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#15151C] p-6 shadow-lg shadow-black/20 sm:p-10">
            <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-3xl text-green-300">✓</div><h1 className="mt-4 text-3xl font-extrabold text-[#F5F5F5]">Order Submitted</h1><p className="mt-2 text-[#A1A1AA]">Order #{String(confirmationOrder.id).slice(-6)} was received.</p></div>
            <div className="mt-8 grid gap-4 rounded-xl bg-[#22222B]/60 p-4 text-sm sm:grid-cols-2"><p><span className="text-[#A1A1AA]">Customer</span><br /><strong>{confirmationOrder.customer.name}</strong></p><p><span className="text-[#A1A1AA]">Order date</span><br /><strong>{new Date(confirmationOrder.createdAt).toLocaleString()}</strong></p><p><span className="text-[#A1A1AA]">Payment</span><br /><strong>{confirmationOrder.paymentMethod}</strong></p><p><span className="text-[#A1A1AA]">Payment status</span><br /><strong className="text-[#E63946]">{confirmationOrder.paymentStatus}</strong></p><p><span className="text-[#A1A1AA]">Order status</span><br /><strong>{confirmationOrder.orderStatus}</strong></p><p><span className="text-[#A1A1AA]">Total</span><br /><strong className="text-[#E63946]">{money(confirmationOrder.total)}</strong></p></div>
            {confirmationOrder.paymentMethod === "GCash" && <p className="mt-5 rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">Your GCash payment is pending verification. It will not be marked as paid until authorized staff confirms it.</p>}
            <div className="mt-6 space-y-3">{confirmationOrder.items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-white/10 pb-3 text-sm"><div><p className="font-bold text-[#F5F5F5]">{item.name} × {item.quantity}</p><p className="text-[#A1A1AA]">{item.details?.join(" · ")}</p>{item.notes && <p className="mt-1 italic text-[#D8A6AA]">Note: {item.notes}</p>}</div><span className="font-bold text-[#E63946]">{money(item.subtotal)}</span></div>)}</div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={() => setShowOrders(true)} className="rounded-xl bg-[#E63946] px-5 py-3 font-bold text-white hover:bg-[#C92D3A]">View My Orders</button><button type="button" onClick={() => setActiveSection("menu")} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-[#F5F5F5] hover:bg-[#22222B]">Back to Menu</button><button type="button" onClick={() => setActiveSection("menu")} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-[#F5F5F5] hover:bg-[#22222B]">Back to Home</button></div>
          </section>
        )}
        {activeSection === "confirmation" && confirmationOrder && (
          <section className="mx-auto mt-5 max-w-3xl rounded-2xl border border-[#E63946]/25 bg-gradient-to-br from-[#E63946]/10 to-[#22222B]/70 p-5 text-center shadow-lg shadow-black/20">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E63946]/15 text-[#FF8B93]"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6"><path d="M20.8 8.6c0 5.5-8.8 10.2-8.8 10.2S3.2 14.1 3.2 8.6A4.6 4.6 0 0112 6.3a4.6 4.6 0 018.8 2.3z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg></div>
            <h2 className="mt-3 text-lg font-extrabold text-[#F5F5F5]">Enjoy this order? Save it to Favorites!</h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">Save your customized order and easily order it again next time.</p>
            <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row"><input value={favoriteName} onChange={(event) => setFavoriteName(event.target.value)} placeholder="Name this order (optional)" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#15151C] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none placeholder:text-[#71717A] focus:border-[#E63946]" /><button type="button" onClick={saveConfirmationAsFavorite} className="rounded-xl bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#C92D3A]">Add to Favorite Orders</button></div>
            {favoriteNotice && <p role="status" className="mt-3 text-sm font-bold text-emerald-300">{favoriteNotice}</p>}
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
