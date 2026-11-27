import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatMoney } from "../data/menuData";
import carticon from "../assets/cart_icon.svg";
import { showSuccess } from "../utils/swal";
import LogoutConfirmationModal from "./LogoutConfirmationModal";
import { ClipboardList, X } from "lucide-react";
import { useCustomerAuth } from "../auth/customerAuthContext";

function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d={open ? "M6 6l12 12M18 6L6 18" : "M4 6h16M4 12h16M4 18h16"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <circle
        cx="12"
        cy="8"
        r="3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 19c.8-3 3-4.5 6.5-4.5s5.7 1.5 6.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M14 5H6.5A1.5 1.5 0 005 6.5v11A1.5 1.5 0 006.5 19H14M11 12h9m0 0l-3.5-3.5M20 12l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M20.8 8.6c0 5.5-8.8 10.2-8.8 10.2S3.2 14.1 3.2 8.6A4.6 4.6 0 0112 6.3a4.6 4.6 0 018.8 2.3z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function readCustomerName() {
  try {
    const profile = JSON.parse(
      localStorage.getItem("motopots-profile") || "{}",
    );
    const name = typeof profile.name === "string"
      ? profile.name.trim()
      : typeof profile.fullName === "string"
        ? profile.fullName.trim()
        : "";
    return name.split(/\s+/)[0] || "";
  } catch {
    return "";
  }
}

function CustomerNavbar({
  onOrdersClick,
  onProfileClick,
  cartItems = [],
  subtotal = 0,
  onQuantityChange,
  onRemove,
  onNotesChange,
  onCheckout,
  favoriteOrders = [],
  favoriteCount = 0,
  onReorderFavorite,
  onEditFavorite,
  onRemoveFavorite,
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState(readCustomerName);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const navigate = useNavigate();
  const { customer, signOut } = useCustomerAuth();
  const logout = async () => {
    await signOut();
    showSuccess("Logged out successfully");
    navigate("/?login=user");
  };
  const [editingNotes, setEditingNotes] = useState({});
  const displayedCustomerName = customer?.name?.trim().split(/\s+/)[0] || customerName;
  const cartRef = useRef(null);
  const favoritesRef = useRef(null);
  const settingsRef = useRef(null);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const syncCustomerName = () => setCustomerName(readCustomerName());
    const closeOnOutsideClick = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target))
        setCartOpen(false);
      if (favoritesRef.current && !favoritesRef.current.contains(event.target))
        setFavoritesOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(event.target))
        setSettingsMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setCartOpen(false);
        setFavoritesOpen(false);
        setSettingsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("storage", syncCustomerName);
    window.addEventListener("motopots-profile-updated", syncCustomerName);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("storage", syncCustomerName);
      window.removeEventListener("motopots-profile-updated", syncCustomerName);
    };
  }, []);

  const checkout = () => {
    if (!cartItems.length) return;
    onCheckout?.();
    setCartOpen(false);
  };

  const toggleCart = () => {
    setFavoritesOpen(false);
    if (window.matchMedia?.("(max-width: 639px)").matches) {
      setCartOpen(false);
      navigate("/customer/cart");
      return;
    }
    setCartOpen((value) => !value);
  };

  const toggleFavorites = () => {
    setCartOpen(false);
    setSettingsMenuOpen(false);
    setFavoritesOpen((value) => !value);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-transparent py-2.5">
        <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-1 px-3 sm:gap-x-3 sm:px-6 lg:px-5">
          <Link
            to="/customer"
            className="mr-1 inline-flex min-w-0 shrink flex-col leading-none no-underline sm:mr-6"
          >
            <span className="hero-brand italic font-sans text-[1.15rem] font-extrabold sm:text-[1.4rem]">
              Motopot's
            </span>
            <span className="italic hero-accent text-[0.15rem] font-sans font-extrabold text-[#E63946] sm:text-[0.60rem]">
              Food House
            </span>
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2 lg:order-3">
            <div
              aria-label={`Customer: ${customerName || "Customer"}`}
              className="inline-flex min-w-0 max-w-[42vw] shrink items-center gap-1.5 px-1.5 py-2 text-sm font-semibold text-[#F5F5F5] sm:max-w-40 sm:gap-2"
            >
              <UserIcon />
              <span className="min-w-0 truncate">
                {displayedCustomerName || "Customer"}
              </span>
            </div>
            <div ref={cartRef} className="relative">
              <button
                type="button"
                onClick={toggleCart}
                aria-expanded={cartOpen}
                aria-label={`Shopping cart, ${itemCount} items`}
                className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-[#15151C]/80 px-3 text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-[#E63946]/50 hover:bg-[#22222B] hover:shadow-xl"
              >
                <img src={carticon} alt="Cart" className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E63946] px-1 text-[11px] font-extrabold text-white">
                    {itemCount}
                  </span>
                )}
              </button>
              {cartOpen && (
                <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#15151C]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#22222B]/70 px-4 py-3">
                    <h2 className="font-extrabold text-[#F5F5F5]">Your Cart</h2>
                    <span className="text-xs text-[#A1A1AA]">
                      {itemCount} item{itemCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="max-h-[min(55vh,25rem)] overflow-y-auto p-4">
                    {!cartItems.length ? (
                      <p className="py-5 text-center text-sm text-[#A1A1AA]">
                        Your cart is empty.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {cartItems.map((item) => (
                          <div
                            key={item.id}
                            className="border-b border-white/10 pb-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-[#F5F5F5]">
                                  {item.name}
                                </p>
                                {item.details?.length > 0 && (
                                  <p className="mt-1 break-words text-xs text-[#A1A1AA]">
                                    {item.details.join(" · ")}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="mt-1 break-words text-xs italic text-[#D8A6AA]">
                                    Note: {item.notes}
                                  </p>
                                )}
                              </div>
                              <span className="font-heading shrink-0 text-sm font-bold text-[#E63946]">
                                {formatMoney(
                                  (item.finalUnitPrice ?? item.price) *
                                    item.quantity,
                                )}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onQuantityChange(item.id, -1)}
                                  aria-label={`Decrease ${item.name}`}
                                  className="h-7 w-7 rounded-lg bg-[#22222B] font-bold text-[#F5F5F5] hover:bg-[#E63946]"
                                >
                                  −
                                </button>
                                <span className="min-w-5 text-center text-sm">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onQuantityChange(item.id, 1)}
                                  aria-label={`Increase ${item.name}`}
                                  className="h-7 w-7 rounded-lg bg-[#22222B] font-bold text-[#F5F5F5] hover:bg-[#E63946]"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingNotes((current) => ({
                                      ...current,
                                      [item.id]: !current[item.id],
                                    }))
                                  }
                                  className="text-xs font-bold text-[#A1A1AA] hover:text-white"
                                >
                                  {editingNotes[item.id]
                                    ? "Done"
                                    : item.notes
                                      ? "Edit note"
                                      : "Add note"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemove(item.id)}
                                  className="text-xs font-bold text-[#E63946] hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            {editingNotes[item.id] && (
                              <div className="mt-2 overflow-hidden transition-all duration-300">
                                <textarea
                                  value={item.notes || ""}
                                  onChange={(event) =>
                                    onNotesChange?.(item.id, event.target.value)
                                  }
                                  rows="2"
                                  maxLength="240"
                                  aria-label={`Special instructions for ${item.name}`}
                                  placeholder="E.g., No onions, extra sauce..."
                                  className="w-full resize-none rounded-lg border border-white/10 bg-[#22222B] px-3 py-2 text-xs text-[#F5F5F5] outline-none transition focus:border-[#E63946]"
                                />
                                {item.notes && (
                                  <button
                                    type="button"
                                    onClick={() => onNotesChange?.(item.id, "")}
                                    className="mt-1 text-xs font-bold text-[#E63946] hover:underline"
                                  >
                                    Remove note
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/10 bg-[#22222B]/40 p-4">
                    <div className="flex justify-between font-extrabold text-[#F5F5F5]">
                      <span>Total</span>
                      <span className="font-heading font-bold text-[#E63946]">
                        {formatMoney(subtotal)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={checkout}
                      disabled={!cartItems.length}
                      className="mt-3 w-full rounded-xl bg-[#E63946] py-3 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div
              ref={favoritesRef}
              className={favoritesOpen ? "mobile-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" : "hidden"}
              onClick={(event) => {
                if (event.target === event.currentTarget) setFavoritesOpen(false);
              }}
            >
              <button
                type="button"
                onClick={toggleFavorites}
                aria-expanded={favoritesOpen}
                aria-controls="customer-favorites-panel"
                aria-label={`Favorite orders, ${favoriteCount} saved`}
                className="hidden"
              >
                <HeartIcon filled={favoritesOpen || favoriteCount > 0} />
                {favoriteCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E63946] px-1 text-[11px] font-extrabold text-white">
                    {favoriteCount}
                  </span>
                )}
              </button>
              {favoritesOpen && (
                <div
                  id="customer-favorites-panel"
                  className="relative z-50 flex h-[36rem] max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#15151C]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#22222B]/70 px-4 py-3">
                    <div>
                      <h2 className="font-extrabold text-[#F5F5F5]">
                        Favorite Orders
                      </h2>
                      <span className="text-xs text-[#A1A1AA]">
                        {favoriteCount} saved
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Close favorites"
                      onClick={() => setFavoritesOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#A1A1AA] transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-4 focus:ring-[#E63946]/25"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {!favoriteOrders.length ? (
                      <div className="py-7 text-center">
                        <HeartIcon />
                        <p className="mt-2 text-sm text-[#A1A1AA]">
                          No favorite orders yet.
                        </p>
                        <p className="mt-1 text-xs text-[#71717A]">
                          Save an order after checkout to quickly order it
                          again.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {favoriteOrders.map((order) => (
                          <article
                            key={order.id}
                            className="rounded-xl border border-white/10 bg-[#22222B]/50 p-3 transition hover:border-[#E63946]/40"
                          >
                            <div className="flex gap-3">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#15151C]">
                                <img
                                  src={order.items?.[0]?.image}
                                  alt=""
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-[#F5F5F5]">
                                  {order.name ||
                                    order.items?.[0]?.name ||
                                    "Saved order"}
                                </p>
                                <p className="mt-1 text-xs text-[#A1A1AA]">
                                  {order.items?.length > 1
                                    ? `${order.items.length} items`
                                    : order.items?.[0]?.name}{" "}
                                  · {order.orderType}
                                </p>
                                <p className="mt-1 text-xs text-[#A1A1AA]">
                                  {order.items
                                    ?.map(
                                      (item) =>
                                        `${item.variant || "Standard"}${item.flavor ? ` · ${item.flavor}` : ""}${item.addOns?.length ? ` · ${item.addOns.join(", ")}` : ""}${item.notes ? ` · Note: ${item.notes}` : ""} × ${item.quantity}`,
                                    )
                                    .join("; ")}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => onReorderFavorite?.(order)}
                                className="rounded-lg bg-[#E63946] px-2.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-[#C92D3A]"
                              >
                                Reorder
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditFavorite?.(order)}
                                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-[#F5F5F5] transition hover:bg-[#15151C]"
                              >
                                Edit / Customize
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveFavorite?.(order.id)}
                                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-[#FF8B93] transition hover:bg-[#3A2025]"
                              >
                                Remove
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => setSettingsMenuOpen((value) => !value)}
                aria-expanded={settingsMenuOpen}
                aria-controls="customer-settings-menu"
                aria-label={
                  settingsMenuOpen
                    ? "Close settings menu"
                    : "Open settings menu"
                }
                className="flex h-10 min-w-10 items-center justify-center rounded-full border border-white/10 bg-[#15151C]/80 text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-xl transition hover:border-[#E63946]/50 hover:bg-[#22222B] sm:h-11 sm:min-w-11"
              >
                <span className="hidden" aria-hidden="true">
                  •••
                </span>
                <MenuIcon open={settingsMenuOpen} />
              </button>
              <div
                id="customer-settings-menu"
                aria-hidden={!settingsMenuOpen}
                className={`absolute right-0 z-50 mt-2 w-[min(13rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-white/10 bg-[#22222B]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl transition duration-200 ${settingsMenuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
              >
                <button
                  type="button"
                  onClick={toggleFavorites}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-[#F5F5F5] transition hover:bg-[#15151C] hover:text-[#E63946]"
                >
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <HeartIcon filled={favoriteCount > 0} />
                    {favoriteCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E63946] px-1 text-[9px] font-extrabold text-white">
                        {favoriteCount}
                      </span>
                    )}
                  </span>
                  Favorites
                </button>
                <Link
                  to="/customer/orders"
                  onClick={(event) => {
                    setSettingsMenuOpen(false);
                    if (onOrdersClick) {
                      event.preventDefault();
                      onOrdersClick();
                    }
                  }}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#F5F5F5] no-underline transition hover:bg-[#15151C] hover:text-[#E63946]"
                >
                  <ClipboardList aria-hidden="true" className="h-5 w-5" />
                  My Orders
                </Link>
                <Link
                  to="/customer/profile"
                  onClick={(event) => {
                    setSettingsMenuOpen(false);
                    if (onProfileClick) {
                      event.preventDefault();
                      onProfileClick();
                    }
                  }}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#F5F5F5] no-underline transition hover:bg-[#15151C] hover:text-[#E63946]"
                >
                  <UserIcon />
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    setLogoutOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold text-[#FF8B93] transition hover:bg-[#3A2025] hover:text-[#FFB1B7]"
                >
                  <LogoutIcon />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      {logoutOpen && (
        <LogoutConfirmationModal
          onCancel={() => setLogoutOpen(false)}
          onConfirm={logout}
        />
      )}
    </>
  );
}

export default CustomerNavbar;
