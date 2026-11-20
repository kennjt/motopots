import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Menu from "./components/menu";
import CustomerNavbar from "./components/customernavbar";
import CustomerCartPage from "./components/CustomerCartPage";
import CustomerFavoritesPage from "./components/CustomerFavoritesPage";
import MyOrder from "./components/MyOrder";
import ProfileSettings from "./components/profile";
import Checkout from "./components/Checkout";
import FAQ from "./components/faq";
import Footer from "./components/footer";
import { formatMoney, makeCartItem, menuItems } from "./data/menuData";
import { readStoreStatus, readSchedule } from "./data/adminSettingsStorage";
import { ORDERS_STORAGE_KEY, ORDERS_UPDATED_EVENT, readOrders, saveOrders } from "./data/orderStorage";
import inasal from "./assets/inasal_withoutbg.png";
import { ImageWithSkeleton } from "./components/Skeleton";
import { showClosedStore, showConfirm, showError, showInfo, showSuccess } from "./utils/swal";

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

const toMinutes = (time) => {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

const formatTime = (time) => {
  const minutes = toMinutes(time);
  if (minutes === null) return "";
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours % 12 || 12}:${String(mins).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

const getNextOpening = (schedule) => {
  if (!schedule) return null;
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const getPart = (type) => dateParts.find((part) => part.type === type)?.value;
  const currentMinutes = Number(getPart("hour")) * 60 + Number(getPart("minute"));
  const todayDate = new Date(`${getPart("year")}-${getPart("month")}-${getPart("day")}T12:00:00Z`);

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(todayDate);
    candidate.setUTCDate(todayDate.getUTCDate() + offset);
    const dayName = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
    }).format(candidate);
    const entry = schedule[dayName];
    if (!entry?.enabled || !entry.opening) continue;

    const openingMinutes = toMinutes(entry.opening);
    const closingMinutes = toMinutes(entry.closing);
    if (offset === 0 && candidate.toISOString().slice(0, 10) === todayDate.toISOString().slice(0, 10)) {
      if (openingMinutes !== null && currentMinutes < openingMinutes) {
        return { dayName, date: candidate, opening: entry.opening, offset: 0 };
      }
      if (closingMinutes !== null) {
        if (closingMinutes > openingMinutes && currentMinutes < closingMinutes) {
          continue;
        }
        if (closingMinutes < openingMinutes && currentMinutes < closingMinutes) {
          continue;
        }
      }
      continue;
    }

    if (offset > 0) return { dayName, date: candidate, opening: entry.opening, offset };
  }
  return null;
};

function FavoriteHeart({ filled = false }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M20.8 8.6c0 5.5-8.8 10.2-8.8 10.2S3.2 14.1 3.2 8.6A4.6 4.6 0 0112 6.3a4.6 4.6 0 018.8 2.3z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function CustomerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMenuPage = location.pathname === "/customer/menu";
  const isCartPage = location.pathname === "/customer/cart";
  const isFavoritesPage = location.pathname === "/customer/favorites";
  const isCheckoutPage = location.pathname === "/customer/checkout";
  const isDedicatedPage = isCartPage || isFavoritesPage || isCheckoutPage;
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
  const [storeStatus, setStoreStatus] = useState("closed");
  const closedPopupShownRef = useRef(false);
  const [nextOpening, setNextOpening] = useState("");
  const [cart, setCart] = useState(() =>
    JSON.parse(localStorage.getItem("motopots-cart") || "{}"),
  );
  const [orders, setOrders] = useState(readOrders);
  useEffect(() => {
    if (location.pathname !== "/customer/order" && !isMenuPage) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("customer-menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isMenuPage, location.pathname]);
  useEffect(
    () => localStorage.setItem("motopots-cart", JSON.stringify(cart)),
    [cart],
  );
  useEffect(() => localStorage.setItem(FAVORITE_ORDERS_KEY, JSON.stringify(favoriteOrders)), [favoriteOrders]);
  useEffect(() => {
    const syncStoreStatus = async () => {
      const status = await readStoreStatus();
      setStoreStatus(status);
      if (status === "closed") {
        let schedule = null;
        try {
          schedule = await readSchedule();
        } catch (error) {
          console.error("Unable to read the store operating schedule.", error);
        }
        const nextOpeningInfo = getNextOpening(schedule);
        let openingLabel = "";
        if (nextOpeningInfo) {
          const dateLabel = nextOpeningInfo.offset === 0
            ? "today"
            : nextOpeningInfo.offset === 1
              ? "tomorrow"
              : new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "long", month: "short", day: "numeric" }).format(nextOpeningInfo.date);
          openingLabel = `${dateLabel} (${nextOpeningInfo.dayName}) at ${formatTime(nextOpeningInfo.opening)}`;
          setNextOpening(openingLabel);
        } else {
          setNextOpening("");
        }

        if (!closedPopupShownRef.current) {
          closedPopupShownRef.current = true;
          showClosedStore(
            "Store Currently Closed",
            openingLabel
              ? `We're currently closed. We'll be open ${openingLabel}.`
              : "We're currently closed. Please check back for our next operating schedule.",
          );
        }
      } else {
        setNextOpening("");
      }
    };
    syncStoreStatus();
    const interval = window.setInterval(syncStoreStatus, 5000);
    const handleStorage = (event) => {
      if (event.key === "motopots-store-status") syncStoreStatus();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
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
  const addToCart = (item) => {
    if (storeStatus === "closed") {
      showError("Store is closed", "Sorry, we're currently closed and not accepting orders.");
      return;
    }
    setCart((current) => ({
      ...current,
      [item.id]: { ...item, quantity: (current[item.id]?.quantity || 0) + 1, subtotal: item.finalUnitPrice * ((current[item.id]?.quantity || 0) + 1) },
    }));
    showSuccess("Added to cart successfully", item.name);
  };
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
    if (storeStatus === "closed") {
      showError("Store is closed", "Sorry, we're currently closed and not accepting orders.");
      return;
    }
    const resolved = savedOrder.items.map(resolveFavoriteItem);
    const error = resolved.find((item) => item.error);
    if (error) {
      showError("Unable to reorder", error.error);
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
    if (isFavoritesPage) navigate("/customer/cart");
    setFavoriteNotice("Saved order added to your cart.");
    showSuccess("Added to cart successfully");
  };
  const editFavorite = (savedOrder) => {
    const firstItem = savedOrder.items?.[0];
    const resolved = firstItem && resolveFavoriteItem(firstItem);
    if (!resolved || resolved.error) {
      showError("Saved order unavailable", resolved?.error || "This saved order is unavailable.");
      return;
    }
    setCheckoutOrderType(savedOrder.orderType || "Pickup");
    setFavoriteToEdit(firstItem);
    setActiveSection("menu");
    if (isFavoritesPage) navigate("/customer/menu");
  };
  const removeFavorite = (favoriteId) => setFavoriteOrders((current) => current.filter((order) => order.id !== favoriteId));
  const removeFavoriteItem = (favoriteId, itemIndex) => {
    setFavoriteOrders((current) => current.flatMap((order) => {
      if (order.id !== favoriteId) return [order];
      const items = (order.items || []).filter((_, index) => index !== itemIndex);
      if (!items.length) return [];
      const total = items.reduce(
        (sum, item) => sum + (item.subtotal ?? (item.finalUnitPrice ?? item.price ?? item.savedPrice ?? 0) * (item.quantity || 1)),
        0,
      );
      return [{ ...order, items, total }];
    }));
  };
  const addFavoriteItemToCart = (savedItem) => {
    if (storeStatus === "closed") {
      showError("Store is closed", "Sorry, we're currently closed and not accepting orders.");
      return;
    }
    const resolved = resolveFavoriteItem(savedItem);
    if (resolved.error) {
      showError("Unable to add favorite", resolved.error);
      return;
    }
    const cartItem = makeCartItem(resolved.product, resolved.selection);
    const quantity = savedItem.quantity || 1;
    setCart((current) => {
      const nextQuantity = (current[cartItem.id]?.quantity || 0) + quantity;
      return {
        ...current,
        [cartItem.id]: {
          ...cartItem,
          quantity: nextQuantity,
          subtotal: cartItem.finalUnitPrice * nextQuantity,
        },
      };
    });
    showSuccess("Added to cart successfully", cartItem.name);
  };
  const customizeFavoriteItem = (savedItem) => {
    if (storeStatus === "closed") {
      showError("Store is closed", "Sorry, we're currently closed and not accepting orders.");
      return;
    }
    const resolved = resolveFavoriteItem(savedItem);
    if (resolved.error) {
      showError("Favorite item unavailable", resolved.error);
      return;
    }
    setFavoriteToEdit(savedItem);
    setActiveSection("menu");
    navigate("/customer/menu");
  };
  const confirmationFavorite = confirmationOrder && favoriteOrders.find((order) => savedOrderSignature(order) === savedOrderSignature(confirmationOrder));
  const saveConfirmationAsFavorite = () => {
    if (!confirmationOrder) return;
    const snapshot = { ...confirmationOrder, id: `favorite-${Date.now()}`, name: favoriteName.trim(), savedAt: new Date().toISOString(), items: confirmationOrder.items.map((item) => ({ ...item, savedPrice: item.finalUnitPrice ?? item.price })) };
    if (favoriteOrders.some((order) => savedOrderSignature(order) === savedOrderSignature(snapshot))) {
      setFavoriteNotice("This order is already in your favorites.");
      showInfo("Already saved", "This order is already in your favorites.");
      return;
    }
    setFavoriteOrders((current) => [snapshot, ...current]);
    setFavoriteNotice("Order added to your favorites!");
    showSuccess("Added to favorites successfully");
    setFavoriteName("");
  };
  const removeConfirmationFavorite = () => {
    if (!confirmationFavorite) return;
    removeFavorite(confirmationFavorite.id);
    setFavoriteNotice("Order removed from your favorites.");
    showSuccess("Removed from favorites successfully");
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
  const removeFromCart = async (id) => {
    const result = await showConfirm({ title: "Remove this item?", text: "Are you sure you want to remove this item from your cart?", confirmText: "Yes, remove", cancelText: "Keep item" });
    if (!result.isConfirmed) return;
    setCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    showSuccess("Item removed from cart");
  };
  const beginCheckout = () => {
    if (storeStatus === "closed") {
      showError("Store is closed", "Sorry, we're currently closed and not accepting orders.");
      return;
    }
    if (cartItems.length) navigate("/customer/checkout");
  };
  const updateCartNotes = (id, notes) =>
    setCart((current) => ({ ...current, [id]: { ...current[id], notes } }));
  const placeOrder = async (paymentData) => {
    const latestStatus = await readStoreStatus();
    if (latestStatus === "closed") {
      setStoreStatus("closed");
      showError("Store is closed", "Sorry, we're currently closed and not accepting orders.");
      setSubmittingOrder(false);
      return;
    }
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
      deliveryAddressId: paymentData.deliveryAddressId || null,
      deliveryAddress: paymentData.deliveryAddress ? { ...paymentData.deliveryAddress } : null,
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
        <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-extrabold ${storeStatus === "open" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-[#E63946]/30 bg-[#E63946]/10 text-[#FF727D]"}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${storeStatus === "open" ? "bg-emerald-400" : "bg-[#E63946]"}`} />
          {storeStatus === "open" ? "OPEN NOW" : "CLOSED"}
          {storeStatus === "closed" && <span className="ml-1 font-semibold text-[#D1D1D6]">— Sorry, we're currently closed and not accepting orders.{nextOpening ? ` Next opening: ${nextOpening}.` : ""}</span>}
        </div>
        {isCartPage && (
          <CustomerCartPage
            cartItems={cartItems}
            subtotal={subtotal}
            storeOpen={storeStatus === "open"}
            onQuantityChange={changeQuantity}
            onRemove={removeFromCart}
            onCheckout={beginCheckout}
          />
        )}
        {isFavoritesPage && (
          <CustomerFavoritesPage
            favoriteOrders={favoriteOrders}
            storeOpen={storeStatus === "open"}
            onAddToCart={addFavoriteItemToCart}
            onCustomize={customizeFavoriteItem}
            onRemove={removeFavoriteItem}
          />
        )}
        {isCheckoutPage && activeSection !== "confirmation" && (
          <Checkout
            cartItems={cartItems}
            subtotal={subtotal}
            initialOrderType={checkoutOrderType}
            onBack={() => navigate("/customer/cart")}
            onSubmit={placeOrder}
            submitting={submittingOrder || storeStatus === "closed"}
            storeOpen={storeStatus === "open"}
          />
        )}
        {!isDedicatedPage && activeSection === "menu" && (
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
                      <span className="block font-display text-[clamp(25px,7vw,60px)] text-[#F5F5F5] [text-shadow:3px_3px_0_#E63946]">
                        Motopot&apos;s
                      </span>
                      <span className="mt-3 block font-display text-[clamp(25px,5vw,40px)] italic text-[#F5F5F5]">
                        Food House
                      </span>
                    </h1>
                    <p className="mb-3 mt-3 max-w-[780px] text-lg leading-[1.55] text-[#A1A1AA] sm:text-xl">
                      Grilled, sizzling and sweet, all in one place. Order your
                      favorites online and we&apos;ll get them ready for you.
                    </p>
                    <ul className="mb-0 flex list-none flex-wrap gap-2 p-0">
                      {["Bacolod Chicken Inasal", "Takoyaki", "Halo-Halo"].map((item) => (
                        <li key={item} className="rounded-full border border-white/10 bg-[#22222B] px-3 py-1 text-sm font-extrabold text-[#F5F5F5]">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      <Link
                        to="/customer/order"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E63946] bg-[#E63946] px-4 py-2 text-base font-extrabold text-white no-underline transition-all hover:-translate-y-0.5 hover:bg-[#C92D3A] sm:text-lg"
                      >
                        Order Now
                      </Link>
                    </div>
                  </div>
                  <div className="order-1 flex min-w-0 justify-center lg:order-2 lg:col-span-5 lg:justify-end">
                    <div className="w-full max-w-[500px] overflow-hidden">
                      <ImageWithSkeleton src={inasal} alt="Bacolod chicken inasal served with rice" className="block h-auto w-full object-contain" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="customer-menu" className="relative z-10 min-h-screen w-full py-12">
              <div className="mx-auto w-full max-w-6xl text-center">
                <h2 className="mb-1 font-heading text-3xl text-[#F5F5F5] sm:text-4xl">Our Menu</h2>
                <p className="mb-3 text-base leading-[1.55] text-[#A1A1AA]">{isMenuPage ? "Browse products by category and compare descriptions and prices." : "Choose your favorites, customize your order, and add them to your cart."}</p>
                <Menu onAddToCart={addToCart} cart={cart} showAddToCart={!isMenuPage && storeStatus === "open"} browseMode={isMenuPage} favoriteToEdit={favoriteToEdit} onFavoriteEditHandled={() => setFavoriteToEdit(null)} />
              </div>
            </section>
            <section id="customer-about" className="mb-10 bg-[#15151C]/60 px-4 py-10 sm:px-6 lg:px-4">
              <h2 className="mb-8 text-center font-heading text-3xl text-[#F5F5F5] sm:mb-12 sm:text-4xl">
                About Us
              </h2>
              <div className="mx-auto w-full max-w-6xl">
                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                  <div className="min-w-0 lg:col-span-7">
                    <h2 className="mb-1 leading-[0.95]">
                      <span className="block font-display text-[clamp(25px,7vw,50px)] text-[#F5F5F5] [text-shadow:3px_3px_0_#E63946]">
                        Motopot&apos;s
                      </span>
                      <span className="mt-3 block font-display text-[clamp(25px,5vw,30px)] italic text-[#F5F5F5]">
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
        {!isDedicatedPage && activeSection === "checkout" && <Checkout cartItems={cartItems} subtotal={subtotal} initialOrderType={checkoutOrderType} onBack={() => setActiveSection("menu")} onSubmit={placeOrder} submitting={submittingOrder || storeStatus === "closed"} storeOpen={storeStatus === "open"} />}
        {activeSection === "confirmation" && confirmationOrder && (
          <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#15151C] p-6 shadow-lg shadow-black/20 sm:p-10">
            <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-3xl text-green-300">✓</div><h1 className="mt-4 text-3xl font-extrabold text-[#F5F5F5]">Order Submitted</h1><p className="mt-2 text-[#A1A1AA]">Order #{String(confirmationOrder.id).slice(-6)} was received.</p></div>
            <div className="mt-8 grid gap-4 rounded-xl bg-[#22222B]/60 p-4 text-sm sm:grid-cols-2"><p><span className="text-[#A1A1AA]">Customer</span><br /><strong>{confirmationOrder.customer.name}</strong></p><p><span className="text-[#A1A1AA]">Order date</span><br /><strong>{new Date(confirmationOrder.createdAt).toLocaleString()}</strong></p><p><span className="text-[#A1A1AA]">Payment</span><br /><strong>{confirmationOrder.paymentMethod}</strong></p><p><span className="text-[#A1A1AA]">Payment status</span><br /><strong className="text-[#E63946]">{confirmationOrder.paymentStatus}</strong></p><p><span className="text-[#A1A1AA]">Order status</span><br /><strong>{confirmationOrder.orderStatus}</strong></p><p><span className="text-[#A1A1AA]">Total</span><br /><strong className="text-[#E63946]">{money(confirmationOrder.total)}</strong></p></div>
            {confirmationOrder.orderType === "Delivery" && confirmationOrder.deliveryAddress && <div className="mt-4 rounded-xl border border-[#E63946]/25 bg-[#E63946]/5 p-4 text-sm"><p className="font-extrabold text-[#F5F5F5]">Delivery address · {confirmationOrder.deliveryAddress.label}</p><p className="mt-1 text-[#A1A1AA]">{[confirmationOrder.deliveryAddress.houseNumber, confirmationOrder.deliveryAddress.street, confirmationOrder.deliveryAddress.subdivision, confirmationOrder.deliveryAddress.barangay, confirmationOrder.deliveryAddress.city, confirmationOrder.deliveryAddress.province, confirmationOrder.deliveryAddress.region, confirmationOrder.deliveryAddress.postalCode].filter(Boolean).join(", ")}</p>{confirmationOrder.deliveryAddress.landmark && <p className="mt-1 text-[#A1A1AA]">Landmark: {confirmationOrder.deliveryAddress.landmark}</p>}</div>}
            {confirmationOrder.paymentMethod === "GCash" && <p className="mt-5 rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">Your GCash payment is pending verification. It will not be marked as paid until authorized staff confirms it.</p>}
            <div className="mt-6 space-y-3">{confirmationOrder.items.map((item) => <div key={item.id} className="flex justify-between gap-4 border-b border-white/10 pb-3 text-sm"><div><p className="font-bold text-[#F5F5F5]">{item.name} × {item.quantity}</p><p className="text-[#A1A1AA]">{item.details?.join(" · ")}</p>{item.notes && <p className="mt-1 italic text-[#D8A6AA]">Note: {item.notes}</p>}</div><span className="font-bold text-[#E63946]">{money(item.subtotal)}</span></div>)}</div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={() => setShowOrders(true)} className="rounded-xl bg-[#E63946] px-5 py-3 font-bold text-white hover:bg-[#C92D3A]">View My Orders</button><button type="button" onClick={() => isCheckoutPage ? navigate("/customer/menu") : setActiveSection("menu")} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-[#F5F5F5] hover:bg-[#22222B]">Back to Menu</button><button type="button" onClick={() => isCheckoutPage ? navigate("/customer") : setActiveSection("menu")} className="rounded-xl border border-white/10 px-5 py-3 font-bold text-[#F5F5F5] hover:bg-[#22222B]">Back to Home</button></div>
          </section>
        )}
        {activeSection === "confirmation" && confirmationOrder && (
          <section className="mx-auto mt-5 max-w-3xl rounded-2xl border border-[#E63946]/25 bg-gradient-to-br from-[#E63946]/10 to-[#22222B]/70 p-5 text-center shadow-lg shadow-black/20">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#E63946]/15 text-[#FF8B93]"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6"><path d="M20.8 8.6c0 5.5-8.8 10.2-8.8 10.2S3.2 14.1 3.2 8.6A4.6 4.6 0 0112 6.3a4.6 4.6 0 018.8 2.3z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg></div>
            <h2 className="mt-3 text-lg font-extrabold text-[#F5F5F5]">Enjoy this order? Save it to Favorites!</h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">Save your customized order and easily order it again next time.</p>
            <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row"><input value={favoriteName} onChange={(event) => setFavoriteName(event.target.value)} disabled={Boolean(confirmationFavorite)} placeholder="Name this order (optional)" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#15151C] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none placeholder:text-[#71717A] focus:border-[#E63946] disabled:cursor-not-allowed disabled:opacity-60" /><button type="button" onClick={confirmationFavorite ? removeConfirmationFavorite : saveConfirmationAsFavorite} aria-pressed={Boolean(confirmationFavorite)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white transition ${confirmationFavorite ? "border border-[#E63946]/40 bg-[#E63946]/15 text-[#FF8B93] hover:bg-[#E63946]/25" : "bg-[#E63946] hover:bg-[#C92D3A]"}`}><FavoriteHeart filled={Boolean(confirmationFavorite)} />{confirmationFavorite ? "Saved to Favorites" : "Add to Favorite Orders"}</button></div>
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
