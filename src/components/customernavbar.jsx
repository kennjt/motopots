import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../data/menuData";

function CustomerNavbar({ onOrdersClick, onProfileClick, cartItems = [], subtotal = 0, onQuantityChange, onRemove, onCheckout }) {
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef(null);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) setCartOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setCartOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const checkout = () => {
    if (!cartItems.length) return;
    onCheckout?.();
    setCartOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 bg-transparent py-2.5">
      <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-3 px-5 sm:px-6 lg:px-5">
        <Link to="/customer" className="mr-2 inline-flex shrink-0 flex-col leading-none no-underline sm:mr-6">
          <span className="font-['Alfa_Slab_One',serif] text-[1.4rem] tracking-[1px] text-[#E63946] [text-shadow:2px_2px_0_#000000]">MOTOPOT&apos;S</span>
          <span className="mt-1 self-start bg-[#22222B] px-2 py-0.5 font-['Alfa_Slab_One',serif] text-[0.65rem] italic text-[#F5F5F5]">FOOD HOUSE</span>
        </Link>

        <div className="flex items-center gap-2 lg:order-3">
          <div ref={cartRef} className="relative">
            <button type="button" onClick={() => setCartOpen((value) => !value)} aria-expanded={cartOpen} aria-label={`Shopping cart, ${itemCount} items`} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-[#15151C]/80 px-3 text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-[#E63946]/50 hover:bg-[#22222B] hover:shadow-xl">
              <span aria-hidden="true" className="text-lg">🛒</span>
              {itemCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E63946] px-1 text-[11px] font-extrabold text-white">{itemCount}</span>}
            </button>
            {cartOpen && <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#15151C]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#22222B]/70 px-4 py-3"><h2 className="font-extrabold text-[#F5F5F5]">Your Cart</h2><span className="text-xs text-[#A1A1AA]">{itemCount} item{itemCount === 1 ? "" : "s"}</span></div>
              <div className="max-h-[min(55vh,25rem)] overflow-y-auto p-4">
                {!cartItems.length ? <p className="py-5 text-center text-sm text-[#A1A1AA]">Your cart is empty.</p> : <div className="space-y-3">{cartItems.map((item) => <div key={item.id} className="border-b border-white/10 pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold text-[#F5F5F5]">{item.name}</p>{item.details?.length > 0 && <p className="mt-1 break-words text-xs text-[#A1A1AA]">{item.details.join(" · ")}</p>}</div><span className="shrink-0 text-sm font-bold text-[#E63946]">{formatMoney((item.finalUnitPrice ?? item.price) * item.quantity)}</span></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => onQuantityChange(item.id, -1)} aria-label={`Decrease ${item.name}`} className="h-7 w-7 rounded-lg bg-[#22222B] font-bold text-[#F5F5F5] hover:bg-[#E63946]">−</button><span className="min-w-5 text-center text-sm">{item.quantity}</span><button type="button" onClick={() => onQuantityChange(item.id, 1)} aria-label={`Increase ${item.name}`} className="h-7 w-7 rounded-lg bg-[#22222B] font-bold text-[#F5F5F5] hover:bg-[#E63946]">+</button></div><button type="button" onClick={() => onRemove(item.id)} className="text-xs font-bold text-[#E63946] hover:underline">Remove</button></div></div>)}</div>}
              </div>
              <div className="border-t border-white/10 bg-[#22222B]/40 p-4"><div className="flex justify-between font-extrabold text-[#F5F5F5]"><span>Total</span><span className="text-[#E63946]">{formatMoney(subtotal)}</span></div><button type="button" onClick={checkout} disabled={!cartItems.length} className="mt-3 w-full rounded-xl bg-[#E63946] py-3 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50">Checkout</button></div>
            </div>}
          </div>
          <Link to="/customer/orders" onClick={onOrdersClick ? (event) => { event.preventDefault(); onOrdersClick(); } : undefined} className="hidden min-h-11 rounded-full border border-white/10 bg-[#15151C]/80 px-4 py-2 text-sm font-medium text-[#F5F5F5] shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:border-[#E63946]/50 hover:bg-[#22222B] sm:inline-flex sm:items-center">My Orders</Link>
          <Link to="/customer/profile" onClick={onProfileClick ? (event) => { event.preventDefault(); onProfileClick(); } : undefined} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#22222B] transition hover:bg-[#15151C]" aria-label="Profile Settings"><img src="/src/assets/person_icon.svg" alt="Profile" className="h-6 w-6 invert" /></Link>
        </div>
      </div>
    </nav>
  );
}

export default CustomerNavbar;
