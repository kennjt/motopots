import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "../data/menuData";
import { ImageWithSkeleton } from "./Skeleton";

export default function CustomerCartPage({
  cartItems,
  subtotal,
  storeOpen,
  onQuantityChange,
  onRemove,
  onCheckout,
}) {
  return (
    <section className="mx-auto max-w-3xl pb-6">
      <Link to="/customer/menu" className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#A1A1AA] no-underline transition hover:text-white">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to menu
      </Link>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF727D]">Your order</p>
          <h1 className="mb-0 mt-1 font-heading text-2xl font-bold text-white">Shopping Cart</h1>
        </div>
        <span className="text-sm font-semibold text-[#A1A1AA]">
          {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
        </span>
      </div>

      {!cartItems.length ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#15151C] px-5 py-10 text-center">
          <p className="m-0 text-base font-bold text-white">Your cart is empty</p>
          <p className="mb-4 mt-2 text-sm text-[#A1A1AA]">Browse the menu and add something delicious.</p>
          <Link to="/customer/menu" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#E63946] px-4 text-sm font-extrabold text-white no-underline transition hover:bg-[#C92D3A]">
            Browse Menu
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {cartItems.map((item) => {
              const unitPrice = item.finalUnitPrice ?? item.price ?? 0;
              return (
                <article key={item.id} className="rounded-2xl border border-white/[0.08] bg-[#15151C] p-3 sm:p-4">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-[#22222B] sm:h-20 sm:w-20">
                      <ImageWithSkeleton src={item.image} alt={item.name} className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="m-0 truncate text-sm font-extrabold text-white sm:text-base">{item.name}</h2>
                          {item.details?.length > 0 && <p className="mb-0 mt-1 break-words text-xs leading-5 text-[#A1A1AA]">{item.details.join(" · ")}</p>}
                          {item.notes && <p className="mb-0 mt-1 break-words text-xs italic text-[#A1A1AA]">Note: {item.notes}</p>}
                        </div>
                        <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#A1A1AA] transition hover:bg-[#E63946]/10 hover:text-[#FF727D]">
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B0B0F]/60 p-1">
                          <button type="button" onClick={() => onQuantityChange(item.id, -1)} aria-label={`Decrease ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-md text-[#D4D4D8] transition hover:bg-[#22222B]">
                            <Minus aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-5 text-center text-sm font-bold text-white">{item.quantity}</span>
                          <button type="button" onClick={() => onQuantityChange(item.id, 1)} aria-label={`Increase ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-md text-[#D4D4D8] transition hover:bg-[#22222B]">
                            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="m-0 text-xs text-[#A1A1AA]">{formatMoney(unitPrice)} each</p>
                          <p className="m-0 mt-0.5 text-sm font-extrabold text-[#FF727D]">{formatMoney(unitPrice * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <section aria-label="Cart total" className="mt-4 rounded-2xl border border-white/[0.08] bg-[#15151C] p-4 shadow-lg shadow-black/20 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[#D4D4D8]">Order total</span>
              <span className="font-heading text-xl font-extrabold text-[#FF727D]">{formatMoney(subtotal)}</span>
            </div>
            {!storeOpen && <p className="mb-0 mt-2 text-xs text-[#A1A1AA]">Checkout is unavailable while the store is closed.</p>}
            <button type="button" onClick={onCheckout} disabled={!cartItems.length || !storeOpen} className="mt-4 min-h-12 w-full rounded-xl bg-[#E63946] px-4 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50">
              Proceed to Checkout
            </button>
          </section>
        </>
      )}
    </section>
  );
}
