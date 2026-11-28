import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { formatMoney, menuItems } from "../../data/menuData";
import { ImageWithSkeleton } from "../common/Skeleton";

export default function CustomerFavoritesPage({
  favoriteOrders,
  storeOpen,
  onAddToCart,
  onReorder,
  onCustomize,
  onRemove,
}) {
  return (
    <section className="mx-auto max-w-4xl pb-6">
      <Link to="/customer/menu" className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#A1A1AA] no-underline transition hover:text-white">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to menu
      </Link>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E63946]/10 text-[#FF727D]">
          <Heart aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF727D]">Saved for later</p>
          <h1 className="mb-0 mt-1 font-heading text-2xl font-bold text-white">Favorites</h1>
        </div>
      </div>

      {!favoriteOrders.length ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#15151C] px-5 py-10 text-center">
          <p className="m-0 text-base font-bold text-white">No favorites yet</p>
          <p className="mb-4 mt-2 text-sm text-[#A1A1AA]">After checkout, save a customized order to find it here.</p>
          <Link to="/customer/menu" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#E63946] px-4 text-sm font-extrabold text-white no-underline transition hover:bg-[#C92D3A]">
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {favoriteOrders.map((order) => {
            const items = order.items || [];
            const total = order.total ?? items.reduce(
              (sum, item) => sum + (item.finalUnitPrice ?? item.price ?? item.savedPrice ?? 0) * (item.quantity || 1),
              0,
            );
            return (
              <article key={order.id} className="rounded-2xl border border-white/[0.08] bg-[#15151C] p-4 sm:p-5">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] pb-3">
                  <div>
                    <h2 className="m-0 text-base font-extrabold text-white">{order.name || items[0]?.name || "Favorite order"}</h2>
                    <p className="mb-0 mt-1 text-xs text-[#A1A1AA]">{order.orderType || "Pickup"}{order.savedAt ? ` · Saved ${new Date(order.savedAt).toLocaleDateString()}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => onRemove(order.id)} className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10">
                    Remove Favorite
                  </button>
                </header>

                <div className="divide-y divide-white/[0.07]">
                  {items.map((item, itemIndex) => {
                    const product = menuItems.find((menuItem) => menuItem.id === item.productId);
                    const unitPrice = item.finalUnitPrice ?? item.price ?? item.savedPrice ?? 0;
                    const quantity = item.quantity || 1;
                    const options = [
                      item.flavor,
                      item.variant,
                      item.variantDetail,
                      ...(item.addOns || []),
                    ].filter(Boolean);
                    return (
                      <div key={`${order.id}-${itemIndex}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#22222B]">
                            <ImageWithSkeleton src={item.image || product?.image} alt={item.name} className="h-full w-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="m-0 text-sm font-extrabold text-white">{item.name}</h3>
                            {options.length > 0 && <p className="mb-0 mt-1 text-xs text-[#A1A1AA]">{options.join(" · ")}</p>}
                            {item.notes && <p className="mb-0 mt-1 text-xs italic text-[#A1A1AA]">Note: {item.notes}</p>}
                            <p className="mb-0 mt-1 text-xs font-semibold text-[#FF929A]">Quantity: {quantity} · {formatMoney(unitPrice)} each</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="text-sm font-extrabold text-[#FF727D]">{formatMoney(unitPrice * quantity)}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => onAddToCart(item)} disabled={!storeOpen} className="min-h-9 rounded-lg bg-[#E63946] px-3 text-xs font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50">
                              Add Item
                            </button>
                            <button type="button" onClick={() => onCustomize(order.id, itemIndex)} className="min-h-9 rounded-lg border border-white/10 bg-[#22222B] px-3 text-xs font-bold text-[#F5F5F5] transition hover:border-[#E63946]/40 hover:bg-[#292930]">
                              Edit Options
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                  <p className="m-0 font-extrabold text-white">Total <span className="ml-2 text-[#FF727D]">{formatMoney(total)}</span></p>
                  <button type="button" onClick={() => onReorder(order)} disabled={!storeOpen} className="min-h-10 rounded-xl bg-[#E63946] px-4 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50">
                    Reorder Favorite
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
