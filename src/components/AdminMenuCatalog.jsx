import { useEffect, useMemo, useState } from "react";
import { categories, formatMoney, menuItems, saveMenuCatalog } from "../data/menuData";
import { ImageWithSkeleton } from "./Skeleton";
import { showConfirm, showError, showSuccess } from "../utils/swal";

const emptyProduct = {
  name: "",
  description: "",
  image: "",
  category: "",
  available: true,
  variants: [{ id: "regular", label: "Regular", price: "" }],
  flavors: [],
  addOns: [],
};

export default function AdminMenuCatalog({ view = "catalog", showHeading = true }) {
  const [items, setItems] = useState(() => [...menuItems]);
  const [categoryList, setCategoryList] = useState(() => categories.filter((category) => category !== "All"));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");
  const [sort, setSort] = useState("name");
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyProduct);
  const [flavorText, setFlavorText] = useState("");
  const [addOnText, setAddOnText] = useState("");

  useEffect(() => {
    const syncCatalog = () => {
      setItems([...menuItems]);
      setCategoryList(categories.filter((category) => category !== "All"));
    };
    window.addEventListener("motopots-menu-updated", syncCatalog);
    return () => window.removeEventListener("motopots-menu-updated", syncCatalog);
  }, []);

  const persist = (nextItems, nextCategories = categoryList) => {
    saveMenuCatalog(nextItems, nextCategories);
    setItems([...nextItems]);
    setCategoryList([...nextCategories]);
  };

  const availableCount = items.filter((item) => item.available !== false).length;
  const unavailableCount = items.length - availableCount;

  const filteredItems = useMemo(() => {
    const result = items.filter((item) =>
      item.name.toLowerCase().includes(search.trim().toLowerCase())
      && (categoryFilter === "All" || item.category === categoryFilter)
      && (availabilityFilter === "All" || (availabilityFilter === "Available" ? item.available !== false : item.available === false))
    );
    return result.sort((a, b) => {
      if (sort === "price-low") return Math.min(...a.variants.map((variant) => Number(variant.price))) - Math.min(...b.variants.map((variant) => Number(variant.price)));
      if (sort === "price-high") return Math.min(...b.variants.map((variant) => Number(variant.price))) - Math.min(...a.variants.map((variant) => Number(variant.price)));
      if (sort === "category") return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
  }, [items, search, categoryFilter, availabilityFilter, sort]);

  const openAdd = () => {
    setEditingId(null);
    setDraft({ ...emptyProduct, category: categoryList[0] || "" });
    setFlavorText("");
    setAddOnText("");
    setEditorOpen(true);
  };

  const openEdit = (product) => {
    setEditingId(product.id);
    setDraft({
      ...product,
      available: product.available !== false,
      variants: product.variants.map((variant) => ({ ...variant, price: String(variant.price) })),
      flavors: [...(product.flavors || [])],
      addOns: (product.addOns || []).map((addOn) => ({ ...addOn, price: String(addOn.price) })),
    });
    setFlavorText((product.flavors || []).join(", "));
    setAddOnText((product.addOns || []).map((addOn) => `${addOn.label}:${addOn.price}`).join(", "));
    setEditorOpen(true);
  };

  const updateVariant = (index, field, value) => {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant),
    }));
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.category || !draft.description.trim()) {
      showError("Required fields missing", "Enter a product name, description, and category.");
      return;
    }
    if (draft.variants.length === 0 || draft.variants.some((variant) => !variant.label.trim() || !Number.isFinite(Number(variant.price)) || Number(variant.price) < 0)) {
      showError("Invalid prices", "Add at least one size and enter a valid price.");
      return;
    }
    const flavors = flavorText.split(",").map((flavor) => flavor.trim()).filter(Boolean);
    const addOns = addOnText.split(",").map((entry) => {
      const separator = entry.lastIndexOf(":");
      return separator >= 0 ? { id: entry.slice(0, separator).trim().toLowerCase().replaceAll(" ", "-"), label: entry.slice(0, separator).trim(), price: Number(entry.slice(separator + 1).trim()) } : null;
    }).filter((addOn) => addOn?.label && Number.isFinite(addOn.price) && addOn.price >= 0);
    const product = {
      ...draft,
      id: editingId || crypto.randomUUID(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category,
      available: draft.available,
      variants: draft.variants.map((variant) => ({ ...variant, label: variant.label.trim(), price: Number(variant.price) })),
      flavors: flavors.length ? flavors : undefined,
      addOns: addOns.length ? addOns : undefined,
    };
    const nextItems = editingId ? items.map((item) => item.id === editingId ? product : item) : [...items, product];
    persist(nextItems);
    setEditorOpen(false);
    showSuccess(editingId ? "Product updated successfully!" : "Product added successfully!");
  };

  const deleteProduct = async (product) => {
    const result = await showConfirm({
      title: "Delete product?",
      text: `${product.name} will be removed from the menu.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      icon: "warning",
    });
    if (!result.isConfirmed) return;
    persist(items.filter((item) => item.id !== product.id));
    showSuccess("Product deleted successfully");
  };

  const toggleAvailability = (product) => {
    const nextItems = items.map((item) => item.id === product.id ? { ...item, available: item.available === false } : item);
    persist(nextItems);
    showSuccess(product.available === false ? "Product is now available!" : "Product is now unavailable");
  };

  const addCategory = async () => {
    const result = await import("sweetalert2").then(({ default: Swal }) => Swal.fire({
      title: "Add category",
      input: "text",
      inputPlaceholder: "Category name",
      showCancelButton: true,
      confirmButtonText: "Add",
      background: "#22222B",
      color: "#F5F5F5",
    }));
    if (!result.isConfirmed) return;
    const name = result.value?.trim();
    if (!name) return;
    if (categoryList.some((category) => category.toLowerCase() === name.toLowerCase())) {
      showError("Duplicate category", "That category already exists.");
      return;
    }
    persist(items, [...categoryList, name]);
    showSuccess("Category added successfully");
  };

  const editCategory = async (category) => {
    const result = await import("sweetalert2").then(({ default: Swal }) => Swal.fire({
      title: "Edit category",
      input: "text",
      inputValue: category,
      showCancelButton: true,
      confirmButtonText: "Save",
      background: "#22222B",
      color: "#F5F5F5",
    }));
    if (!result.isConfirmed) return;
    const name = result.value?.trim();
    if (!name) {
      showError("Category name required", "Enter a category name.");
      return;
    }
    if (categoryList.some((item) => item !== category && item.toLowerCase() === name.toLowerCase())) {
      showError("Duplicate category", "That category already exists.");
      return;
    }
    if (name === category) return;
    const nextCategories = categoryList.map((item) => item === category ? name : item);
    const nextItems = items.map((item) => item.category === category ? { ...item, category: name } : item);
    persist(nextItems, nextCategories);
    showSuccess("Category updated successfully");
  };

  const deleteCategory = async (category) => {
    if (items.some((item) => item.category === category)) {
      showError("Category is in use", "Move or delete products assigned to this category first.");
      return;
    }
    const result = await showConfirm({ title: "Delete category?", text: category, confirmText: "Delete", cancelText: "Cancel" });
    if (!result.isConfirmed) return;
    persist(items, categoryList.filter((item) => item !== category));
    showSuccess("Category deleted successfully");
  };

  return (
    <section id="menu" className="scroll-mt-24">
      {showHeading && (
        <div className="mb-5">
          <h2 className="m-0 text-2xl font-extrabold">{view === "categories" ? "Categories" : view === "customizations" ? "Customizations" : "Menu Catalog"}</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">{view === "categories" ? "Create, rename, and organize menu categories." : view === "customizations" ? "Manage sizes, flavors, and add-ons for each menu item." : "Manage your food and beverage products, pricing, variations, and availability."}</p>
        </div>
      )}
      {view === "catalog" && <>
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[["Total Products", items.length], ["Available Products", availableCount], ["Unavailable Products", unavailableCount], ["Total Categories", categoryList.length]].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
              <p className="mb-0 text-[10px] font-extrabold uppercase tracking-[1px] text-[#85858F]">{label}</p>
              <p className="mb-0 mt-3 text-2xl font-extrabold">{value}</p>
            </article>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141419]">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:p-5 xl:flex-row xl:items-center">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#1B1B22] px-3 text-xs text-white outline-none placeholder:text-[#777781] focus:border-[#E63946]/60" />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-xl border border-white/[0.08] bg-[#1B1B22] px-3 text-xs text-[#C4C4CB]">
            <option>All</option>{categoryList.map((category) => <option key={category}>{category}</option>)}
          </select>
          <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="h-10 rounded-xl border border-white/[0.08] bg-[#1B1B22] px-3 text-xs text-[#C4C4CB]">
            {["All", "Available", "Unavailable"].map((option) => <option key={option}>{option}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-xl border border-white/[0.08] bg-[#1B1B22] px-3 text-xs text-[#C4C4CB]">
            <option value="name">Sort: Name</option><option value="category">Sort: Category</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option>
          </select>
          <button type="button" onClick={openAdd} disabled={!categoryList.length} title={!categoryList.length ? "Create a category before adding a product." : undefined} className="h-10 shrink-0 rounded-xl bg-[#E63946] px-4 text-xs font-extrabold text-white hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50">Add New Product</button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="m-0 font-extrabold">
              {items.length ? "No products match these filters" : "No menu items have been added"}
            </p>
            <p className="mt-1 text-xs text-[#85858F]">
              {items.length
                ? "Try changing the search or filters."
                : categoryList.length
                  ? "Add a product to make it available in the customer menu."
                  : "Create a category before adding your first product."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead><tr className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#777781]"><th className="px-5 py-3.5">Product Image</th><th className="px-4 py-3.5">Product Name</th><th className="px-4 py-3.5">Category</th><th className="px-4 py-3.5">Price / Starting Price</th><th className="px-4 py-3.5">Availability</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead>
              <tbody>{filteredItems.map((product) => (
                <tr key={product.id} className="border-t border-white/[0.05] text-xs">
                  <td className="px-5 py-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#202027]">{product.image ? <ImageWithSkeleton src={product.image} alt={product.name} className="h-full w-full object-contain p-1" /> : <span className="text-[#777781]">—</span>}</div></td>
                  <td className="px-4 py-3 font-extrabold">{product.name}</td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{product.category}</td>
                  <td className="px-4 py-3 font-extrabold">{formatMoney(Math.min(...product.variants.map((variant) => Number(variant.price))))}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => toggleAvailability(product)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${product.available !== false ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>{product.available !== false ? "Available" : "Unavailable"}</button></td>
                  <td className="px-5 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => setDetailsProduct(product)} className="text-[11px] font-bold text-[#C4C4CB] hover:text-white">View</button><button type="button" onClick={() => openEdit(product)} className="text-[11px] font-bold text-[#FF727D]">Edit</button><button type="button" onClick={() => deleteProduct(product)} className="text-[11px] font-bold text-[#85858F] hover:text-[#FF727D]">Delete</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        </div>
      </>}

      {view === "categories" && (
        <section className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-[#A1A1AA]">{categoryList.length} {categoryList.length === 1 ? "category" : "categories"}</p>
            <button type="button" onClick={addCategory} className="h-10 rounded-xl bg-[#E63946] px-4 text-xs font-extrabold text-white hover:bg-[#C92D3A]">Add Category</button>
          </div>
          {categoryList.length === 0 ? (
            <p className="m-0 py-8 text-center text-sm text-[#A1A1AA]">No categories have been created.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categoryList.map((category) => {
                const productCount = items.filter((item) => item.category === category).length;
                return (
                  <article key={category} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1B1B22] p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="m-0 truncate text-sm font-extrabold">{category}</h3>
                      <p className="mb-0 mt-1 text-xs text-[#85858F]">{productCount} {productCount === 1 ? "product" : "products"}</p>
                    </div>
                    <button type="button" onClick={() => editCategory(category)} className="text-xs font-bold text-[#FF727D] hover:text-white">Edit</button>
                    <button type="button" onClick={() => deleteCategory(category)} aria-label={`Delete ${category}`} className="text-lg text-[#85858F] hover:text-[#FF727D]">&times;</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {view === "customizations" && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141419]">
          <div className="border-b border-white/[0.07] px-4 py-3 text-xs text-[#A1A1AA] sm:px-5">
            Customization options are stored with each product. Edit a product to update its sizes, flavors, and add-ons.
          </div>
          {items.length === 0 ? (
            <p className="m-0 px-5 py-10 text-center text-sm text-[#A1A1AA]">No menu items are available to customize.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {items.map((product) => (
                <article key={product.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-sm font-extrabold">{product.name}</h3>
                      <span className="rounded-full bg-white/[0.05] px-2 py-1 text-[10px] text-[#A1A1AA]">{product.category}</span>
                    </div>
                    <p className="mb-0 mt-2 text-xs leading-5 text-[#A1A1AA]">
                      <span className="text-[#D1D1D6]">Sizes:</span> {(product.variants || []).map((variant) => variant.label).join(", ") || "None"}
                      {" · "}<span className="text-[#D1D1D6]">Flavors:</span> {(product.flavors || []).join(", ") || "None"}
                      {" · "}<span className="text-[#D1D1D6]">Add-ons:</span> {(product.addOns || []).map((addOn) => addOn.label).join(", ") || "None"}
                    </p>
                  </div>
                  <button type="button" onClick={() => openEdit(product)} className="self-start rounded-lg border border-[#E63946]/30 px-3 py-2 text-xs font-bold text-[#FF727D] hover:bg-[#E63946]/10 sm:self-center">Edit Options</button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}>
          <form onSubmit={saveProduct} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between"><div><h3 className="m-0 text-xl font-extrabold">{editingId ? "Edit Product" : "Add New Product"}</h3></div><button type="button" onClick={() => setEditorOpen(false)} className="text-2xl text-[#A1A1AA]">&times;</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#A1A1AA] sm:col-span-2">Product Name<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} required className="mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-white" /></label>
              <label className="text-xs font-bold text-[#A1A1AA] sm:col-span-2">Product Description<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} required rows="3" className="mt-1 block w-full resize-none rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-white" /></label>
              <label className="text-xs font-bold text-[#A1A1AA]">Category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-white"><option value="">Select category</option>{categoryList.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="text-xs font-bold text-[#A1A1AA]">Availability<select value={draft.available ? "Available" : "Unavailable"} onChange={(event) => setDraft((current) => ({ ...current, available: event.target.value === "Available" }))} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-white"><option>Available</option><option>Unavailable</option></select></label>
              <label className="text-xs font-bold text-[#A1A1AA] sm:col-span-2">Product Image<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setDraft((current) => ({ ...current, image: String(reader.result) })); reader.readAsDataURL(file); }} className="mt-1 block w-full text-xs text-[#A1A1AA]" /></label>
              <div className="sm:col-span-2"><div className="mb-2 flex items-center justify-between"><p className="m-0 text-sm font-extrabold">Sizes / Variations</p><button type="button" onClick={() => setDraft((current) => ({ ...current, variants: [...current.variants, { id: crypto.randomUUID(), label: "", price: "" }] }))} className="text-xs font-bold text-[#FF727D]">+ Add Size</button></div>{draft.variants.map((variant, index) => <div key={variant.id} className="mb-2 grid grid-cols-[1fr_120px_32px] gap-2"><input value={variant.label} onChange={(event) => updateVariant(index, "label", event.target.value)} placeholder="Size / Serving" className="rounded-lg border border-white/10 bg-[#22222B] px-3 py-2 text-sm text-white" /><input type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder="Price" className="rounded-lg border border-white/10 bg-[#22222B] px-3 py-2 text-sm text-white" /><button type="button" onClick={() => setDraft((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) }))} className="text-[#85858F] hover:text-[#FF727D]">&times;</button></div>)}</div>
              <label className="text-xs font-bold text-[#A1A1AA]">Flavors <span className="font-normal">(comma separated)</span><input value={flavorText} onChange={(event) => setFlavorText(event.target.value)} placeholder="Cheese, Barbeque" className="mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-white" /></label>
              <label className="text-xs font-bold text-[#A1A1AA]">Add-ons <span className="font-normal">(Name:Price, ...)</span><input value={addOnText} onChange={(event) => setAddOnText(event.target.value)} placeholder="Extra Rice:15, Egg:20" className="mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-white" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-[#A1A1AA]">Cancel</button><button type="submit" className="rounded-lg bg-[#E63946] px-5 py-2.5 text-sm font-extrabold text-white">{editingId ? "Save Changes" : "Add Product"}</button></div>
          </form>
        </div>
      )}

      {detailsProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && setDetailsProduct(null)}>
          <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-2xl sm:p-6">
            <div className="flex justify-between gap-4"><h3 className="m-0 text-xl font-extrabold">{detailsProduct.name}</h3><button type="button" onClick={() => setDetailsProduct(null)} className="text-2xl text-[#A1A1AA]">&times;</button></div>
            <p className="mt-3 text-sm text-[#A1A1AA]">{detailsProduct.description}</p>
            <div className="mt-4 space-y-2">{detailsProduct.variants.map((variant) => <div key={variant.id} className="flex justify-between rounded-lg border border-white/10 bg-[#22222B] px-3 py-2 text-sm"><span>{variant.label}</span><strong>{formatMoney(variant.price)}</strong></div>)}</div>
            {detailsProduct.flavors?.length > 0 && <p className="mt-4 text-xs text-[#A1A1AA]"><strong className="text-white">Flavors:</strong> {detailsProduct.flavors.join(", ")}</p>}
            {detailsProduct.addOns?.length > 0 && <p className="mt-2 text-xs text-[#A1A1AA]"><strong className="text-white">Add-ons:</strong> {detailsProduct.addOns.map((addOn) => `${addOn.label} (+${formatMoney(addOn.price)})`).join(", ")}</p>}
          </section>
        </div>
      )}
    </section>
  );
}
