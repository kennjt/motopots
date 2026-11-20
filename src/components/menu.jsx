import { useEffect, useState } from "react";
import { categories, formatMoney, getVariant, loadMenuCatalog, makeCartItem, menuItems } from "../data/menuData";
import { ImageWithSkeleton } from "./Skeleton";

function Menu({ onAddToCart, cart = {}, showAddToCart = false, favoriteToEdit, onFavoriteEditHandled }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selection, setSelection] = useState({});
  const [catalogItems, setCatalogItems] = useState(() => [...menuItems]);
  useEffect(() => {
    loadMenuCatalog();
    const syncCatalog = () => setCatalogItems([...menuItems]);
    window.addEventListener("motopots-menu-updated", syncCatalog);
    return () => window.removeEventListener("motopots-menu-updated", syncCatalog);
  }, []);
  const filteredItems = catalogItems.filter((item) => item.available !== false && (activeCategory === "All" || item.category === activeCategory) && item.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!favoriteToEdit) return;
    const product = menuItems.find((item) => item.id === favoriteToEdit.productId);
    if (!product) return;
    const variant = product.variants.find((item) => item.label === favoriteToEdit.variant && (!favoriteToEdit.flavor || item.flavor === favoriteToEdit.flavor)) || product.variants.find((item) => item.label === favoriteToEdit.variant);
    if (!variant) return;
    const addOns = (product.addOns || []).filter((addOn) => (favoriteToEdit.addOns || []).includes(addOn.label)).map((addOn) => addOn.id);
    // This effect intentionally hydrates the existing customization modal from a saved order.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedProduct(product);
    setSelection({ variantId: variant.id, flavor: favoriteToEdit.flavor || variant.flavor, quantity: favoriteToEdit.variant || variant.label, addOns, notes: favoriteToEdit.notes || "" });
    onFavoriteEditHandled?.();
  }, [favoriteToEdit, onFavoriteEditHandled]);

  const openProduct = (product) => {
    const first = product.variants[0];
    setSelectedProduct(product);
    setSelection({ variantId: first.id, flavor: product.flavors?.[0] || first.flavor, quantity: product.quantities?.[0] || first.label, addOns: [], notes: "" });
  };
  const currentVariant = selectedProduct && getVariant(selectedProduct, selection);
  const canAdd = selectedProduct && currentVariant && (!selectedProduct.flavors || selection.flavor) && (!selectedProduct.quantities || selection.quantity);
  const submit = () => { if (!canAdd) return; onAddToCart(makeCartItem(selectedProduct, selection)); setSelectedProduct(null); };
  const priceSummary = (item) => (
    <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto pr-1 text-left">
      {item.variants.map((variant) => (
        <div key={variant.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#22222B]/80 px-2.5 py-1.5 text-xs">
          <span className="min-w-0 whitespace-normal break-words text-[#A1A1AA]">{variant.flavor ? `${variant.flavor} · ` : ""}{variant.label}</span>
          <span className="font-heading shrink-0 font-bold text-[#F5F5F5]">{formatMoney(variant.price)}</span>
        </div>
      ))}
    </div>
  );
  const sizeOptions = selectedProduct?.quantities
    ? selectedProduct.quantities.map((label) => ({ id: label, label }))
    : selectedProduct?.variants.filter((variant, index, variants) => variants.findIndex((entry) => entry.label === variant.label && entry.price === variant.price) === index) || [];

  return (
    <section className="min-h-screen bg-transparent px-0 py-5 sm:px-2">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">{categories.map((category) => <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`font-heading shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${activeCategory === category ? "bg-[#E63946] text-white shadow-lg shadow-[#E63946]/20" : "border border-white/10 bg-[#22222B] text-[#F5F5F5] hover:bg-[#15151C]"}`}>{category}</button>)}</div>
          <div className="w-full lg:max-w-[360px]"><input type="text" placeholder="Search the menu..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search menu items" className="w-full rounded-xl border border-white/10 bg-[#15151C] px-5 py-3 text-sm text-[#F5F5F5] outline-none transition-all placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20" /></div>
        </div>
        {filteredItems.length ? <div className="grid grid-cols-1 gap-x-8 gap-y-20 pt-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredItems.map((item) => <article key={item.id} className="group relative flex min-h-[250px] flex-col overflow-visible rounded-2xl border border-white/10 bg-[#15151C] px-5 pb-5 pt-28 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-2 hover:border-[#E63946]/40 hover:shadow-xl hover:shadow-black/30">
          <div className="absolute -top-20 left-1/2 z-10 flex h-[190px] w-[190px] -translate-x-1/2 items-center justify-center"><ImageWithSkeleton src={item.image} alt={item.name} className="object-contain drop-shadow-[0_12px_15px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-2" skeletonClassName="rounded-full" /></div>
          <div className="mt-auto flex flex-col gap-3 transition-all duration-300 lg:group-hover:opacity-0"><h3 className="text-center text-lg font-extrabold leading-tight text-[#F5F5F5]">{item.name}</h3><span className="mx-auto w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-[#A1A1AA]">{item.category}</span>{showAddToCart && <button type="button" onClick={() => openProduct(item)} className="flex h-10 w-10 shrink-0 self-end items-center justify-center rounded-xl bg-[#E63946] text-white transition-all duration-300 hover:scale-105 hover:bg-[#C92D3A] active:scale-95" aria-label={`Customize ${item.name}`}><span className="text-xl">+</span></button>}</div>
          <div className="pointer-events-none mt-4 flex flex-1 flex-col justify-end gap-3 opacity-100 transition-all duration-300 lg:absolute lg:inset-x-5 lg:bottom-5 lg:mt-0 lg:translate-y-3 lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100">{!showAddToCart && <div className="rounded-xl border border-white/10 bg-[#15151C]/90 p-2 shadow-lg shadow-black/20">{priceSummary(item)}</div>}{showAddToCart && <button type="button" onClick={() => openProduct(item)} className="pointer-events-auto w-full rounded-xl bg-[#E63946] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#C92D3A]">{Object.values(cart).some((cartItem) => cartItem.productId === item.id) ? "Customize & Add Again" : "Customize & Add"}</button>}</div>
        </article>)}</div> : <div className="py-20 text-center"><h3 className="text-2xl font-bold text-[#F5F5F5]">No menu items found</h3><p className="mt-2 text-[#A1A1AA]">Try another search or select a different category.</p><button type="button" onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-5 rounded-xl bg-[#E63946] px-5 py-2.5 font-bold text-white hover:bg-[#C92D3A]">Clear Filters</button></div>}
      </div>
      {selectedProduct && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelectedProduct(null)}><section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold text-[#F5F5F5]">{selectedProduct.name}</h2><p className="mt-1 text-sm text-[#A1A1AA]">Choose your order details.</p></div><button type="button" onClick={() => setSelectedProduct(null)} aria-label="Close customization" className="text-2xl text-[#A1A1AA] hover:text-[#E63946]">×</button></div>
        {selectedProduct.flavors && <fieldset className="mt-5"><legend className="mb-2 font-bold text-[#F5F5F5]">Flavor</legend><div className="grid grid-cols-2 gap-2">{selectedProduct.flavors.map((flavor) => <button key={flavor} type="button" onClick={() => setSelection((current) => ({ ...current, flavor }))} className={`rounded-lg border px-3 py-2 text-left text-sm ${selection.flavor === flavor ? "border-[#E63946] bg-[#E63946]/20 text-white" : "border-white/10 bg-[#22222B] text-[#A1A1AA]"}`}>{flavor}</button>)}</div></fieldset>}
        {(selectedProduct.quantities || selectedProduct.variants.length > 1) && <fieldset className="mt-5"><legend className="mb-2 font-bold text-[#F5F5F5]">{selectedProduct.quantities ? "Quantity" : "Size / serving"}</legend><div className="grid grid-cols-2 gap-2">{sizeOptions.map((option) => { const variant = selectedProduct.quantities ? null : option; const value = option.label; return <button key={option.id} type="button" onClick={() => setSelection((current) => ({ ...current, quantity: value, ...(variant ? { variantId: variant.id } : {}) }))} className={`rounded-lg border px-3 py-2 text-left text-sm ${selection.quantity === value && (!variant || selection.variantId === variant.id) ? "border-[#E63946] bg-[#E63946]/20 text-white" : "border-white/10 bg-[#22222B] text-[#A1A1AA]"}`}>{value}{variant && <span className="font-heading float-right font-bold">{formatMoney(variant.price)}{variant.detail ? ` (${variant.detail})` : ""}</span>}</button>; })}</div></fieldset>}
        {selectedProduct.addOns && <fieldset className="mt-5"><legend className="mb-2 font-bold text-[#F5F5F5]">Add-ons (+₱10.00 each)</legend><div className="space-y-2">{selectedProduct.addOns.map((addOn) => { const checked = selection.addOns?.includes(addOn.id); return <label key={addOn.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-[#22222B] px-3 py-2 text-sm text-[#F5F5F5]"><span>{addOn.label}</span><input type="checkbox" checked={checked} onChange={() => setSelection((current) => ({ ...current, addOns: checked ? current.addOns.filter((id) => id !== addOn.id) : [...current.addOns, addOn.id] }))} /></label>; })}</div></fieldset>}
        <div className="mt-5 rounded-xl border border-white/10 bg-[#22222B]/60 p-3 transition-all duration-300 focus-within:border-[#E63946]/50 focus-within:bg-[#22222B]"><label htmlFor="special-instructions" className="block text-sm font-bold text-[#F5F5F5]">Special Instructions <span className="font-normal text-[#A1A1AA]">(Optional)</span></label><textarea id="special-instructions" rows="2" maxLength="240" value={selection.notes || ""} onChange={(event) => setSelection((current) => ({ ...current, notes: event.target.value }))} placeholder="E.g., No onions, extra sauce, sauce on the side..." className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#15151C] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none transition placeholder:text-[#777781] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20" /></div>
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4"><span className="font-bold text-[#A1A1AA]">Unit total</span><span className="font-heading text-2xl font-bold text-[#E63946]">{formatMoney((currentVariant?.price || 0) + (selection.addOns || []).length * 10)}</span></div><button type="button" disabled={!canAdd} onClick={submit} className="mt-4 w-full rounded-xl bg-[#E63946] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#C92D3A]">Add to Cart</button>
      </section></div>}
    </section>
  );
}
export default Menu;
