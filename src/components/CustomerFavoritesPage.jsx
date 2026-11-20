import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { formatMoney, menuItems } from "../data/menuData";
import { ImageWithSkeleton } from "./Skeleton";

export default function CustomerFavoritesPage({
  favoriteOrders,
  storeOpen,
  onAddToCart,
  onCustomize,
  onRemove,
}) {
  const favorites = favoriteOrders.flatMap((order) => (order.items || []).map((item, itemIndex) => {
    const product = menuItems.find((menuItem) => menuItem.id === item.productId);
    return {
      ...item,
      favoriteId: order.id,
      itemIndex,
      category: product?.category || "",
      description: product?.description || item.description || "",
      price: item.savedPrice ?? item.finalUnitPrice ?? item.price ?? item.basePrice ?? 0,
    };
  }));

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

      {!favorites.length ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#15151C] px-5 py-10 text-center">
          <p className="m-0 text-base font-bold text-white">No favorites yet</p>
          <p className="mb-4 mt-2 text-sm text-[#A1A1AA]">Save an order to find your favorite foods here.</p>
          <Link to="/customer/menu" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#E63946] px-4 text-sm font-extrabold text-white no-underline transition hover:bg-[#C92D3A]">
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {favorites.map((item) => (
            <article key={`${item.favoriteId}-${item.itemIndex}`} className="rounded-2xl border border-white/[0.08] bg-[#15151C] p-3 sm:p-4">
              <div className="flex gap-3">
                <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-[#22222B]">
                  <ImageWithSkeleton src={item.image} alt={item.name} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 text-sm font-extrabold text-white sm:text-base">{item.name}</h2>
                  {item.category && <p className="mb-0 mt-1 text-[11px] font-semibold text-[#FF929A]">{item.category}</p>}
                  {item.description && <p className="mb-0 mt-1 line-clamp-2 text-xs leading-5 text-[#A1A1AA]">{item.description}</p>}
                  {item.details?.length > 0 && <p className="mb-0 mt-1 text-xs text-[#A1A1AA]">{item.details.join(" · ")}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                <span className="text-xs text-[#A1A1AA]">Saved price</span>
                <span className="text-sm font-extrabold text-[#FF727D]">{formatMoney(item.price)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => onAddToCart(item)} disabled={!storeOpen} className="min-h-10 rounded-lg bg-[#E63946] px-2 text-xs font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50">
                  Add to Cart
                </button>
                <button type="button" onClick={() => onCustomize(item)} className="min-h-10 rounded-lg border border-white/10 bg-[#22222B] px-2 text-xs font-bold text-[#F5F5F5] transition hover:border-[#E63946]/40 hover:bg-[#292930]">
                  Customize &amp; Add
                </button>
              </div>
              <button type="button" onClick={() => onRemove(item.favoriteId, item.itemIndex)} className="mt-2 min-h-9 w-full rounded-lg text-xs font-bold text-[#A1A1AA] transition hover:bg-white/[0.04] hover:text-[#FF727D]">
                Remove from Favorites
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
