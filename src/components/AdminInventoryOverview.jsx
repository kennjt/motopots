import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Clock3,
  Download,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Scale,
  Search,
  Trash2,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { formatMoney } from "../data/menuData";
import {
  DEFAULT_INVENTORY_CATEGORIES,
  INVENTORY_STORAGE_KEY,
  readInventoryState,
  saveInventoryState,
} from "../data/inventoryStorage";
import { showConfirm, showSuccess } from "../utils/swal";

const emptyDraft = {
  name: "",
  sku: "",
  category: "",
  stock: "",
  capacity: "",
  unit: "pcs",
  unitCost: "",
  threshold: "",
  expiresAt: "",
};

const inputClass = "mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]/60";

function getStatus(item) {
  const stock = Number(item.stock);
  const threshold = Number(item.threshold);
  if (stock <= 0) return "Out of Stock";
  if (threshold > 0 && stock <= threshold / 2) return "Critical Low";
  if (threshold > 0 && stock <= threshold) return "Low Stock";
  return "In Stock";
}

function isExpiring(item) {
  if (!item.expiresAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${item.expiresAt}T00:00:00`);
  const daysUntilExpiry = Math.ceil((expiry - today) / 86400000);
  return daysUntilExpiry <= 30;
}

function StatusBadge({ status }) {
  const styles = {
    "In Stock": "bg-emerald-400/10 text-emerald-300",
    "Low Stock": "bg-amber-400/10 text-amber-300",
    "Critical Low": "bg-orange-400/10 text-orange-300",
    "Out of Stock": "bg-rose-400/10 text-rose-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${styles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    red: "text-[#FF727D]",
    amber: "text-amber-300",
    green: "text-emerald-300",
    blue: "text-sky-300",
  };
  return (
    <article className="min-w-0 rounded-xl border border-white/[0.07] bg-[#17171D] p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className={`m-0 truncate text-[10px] font-extrabold uppercase tracking-[1px] ${tones[tone]}`}>{label}</p>
        <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${tones[tone]}`} />
      </div>
      <p className="mb-0 mt-3 truncate text-xl font-extrabold sm:text-2xl">{value}</p>
    </article>
  );
}

function InventoryModal({ title, children, onClose, maxWidth = "max-w-xl" }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-2xl sm:p-6`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="m-0 text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-[#A1A1AA] hover:bg-white/[0.06] hover:text-white">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function AdminInventoryOverview({ view = "overview" }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([...DEFAULT_INVENTORY_CATEGORIES]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Ingredients");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [adjustment, setAdjustment] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const loadInventory = () => {
      try {
        const saved = readInventoryState();
        setItems(saved.items);
        setCategories(saved.categories);
        setLoadError("");
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load saved inventory.");
      } finally {
        setLoading(false);
      }
    };
    const syncInventory = (event) => {
      if (event.key === INVENTORY_STORAGE_KEY || event.key === null) loadInventory();
    };
    loadInventory();
    window.addEventListener("storage", syncInventory);
    return () => window.removeEventListener("storage", syncInventory);
  }, []);

  const saveState = (nextItems, nextCategories = categories) => {
    try {
      saveInventoryState({ items: nextItems, categories: nextCategories });
      setItems(nextItems);
      setCategories(nextCategories);
      setStorageError("");
      return true;
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not save inventory changes.");
      return false;
    }
  };

  const filteredItems = useMemo(() => items.filter((item) => {
    const searchText = search.trim().toLowerCase();
    const matchesSearch = !searchText
      || item.name.toLowerCase().includes(searchText)
      || (item.sku || "").toLowerCase().includes(searchText);
    const matchesCategory = selectedCategory === "All Ingredients" || item.category === selectedCategory;
    const status = getStatus(item);
    const matchesStatus = statusFilter === "All statuses"
      || (statusFilter === "Low stock" && ["Low Stock", "Critical Low"].includes(status))
      || (statusFilter === "Out of stock" && status === "Out of Stock")
      || (statusFilter === "Expiring" && isExpiring(item));
    return matchesSearch && matchesCategory && matchesStatus;
  }), [items, search, selectedCategory, statusFilter]);

  const lowStockItems = items.filter((item) => ["Low Stock", "Critical Low"].includes(getStatus(item)));
  const expiringCount = items.filter(isExpiring).length;
  const stockValue = items.reduce((total, item) => total + Number(item.stock) * Number(item.unitCost), 0);
  const canEdit = !loading && !loadError;

  const openNewItem = () => {
    setEditingItemId(null);
    setDraft({ ...emptyDraft, category: categories[0] || "" });
    setActionError("");
    setEditorOpen(true);
  };

  const openEditItem = (item) => {
    setEditingItemId(item.id);
    setDraft({
      name: item.name,
      sku: item.sku || "",
      category: item.category,
      stock: String(item.stock),
      capacity: String(item.capacity),
      unit: item.unit || "pcs",
      unitCost: String(item.unitCost),
      threshold: String(item.threshold),
      expiresAt: item.expiresAt || "",
    });
    setActionError("");
    setEditorOpen(true);
  };

  const saveItem = (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    const unit = draft.unit.trim();
    const stock = Number(draft.stock);
    const capacity = Number(draft.capacity);
    const unitCost = Number(draft.unitCost);
    const threshold = Number(draft.threshold);
    if (!name || !draft.category || !unit) {
      setActionError("Enter an ingredient name, category, and unit.");
      return;
    }
    if (
      !Number.isFinite(stock)
      || !Number.isFinite(capacity)
      || !Number.isFinite(unitCost)
      || !Number.isFinite(threshold)
      || stock < 0
      || capacity <= 0
      || stock > capacity
      || unitCost < 0
      || threshold < 0
    ) {
      setActionError("Enter valid quantities, capacity, unit cost, and low-stock threshold.");
      return;
    }

    const sku = draft.sku.trim() || `ING-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    if (items.some((item) => item.sku?.toLowerCase() === sku.toLowerCase() && item.id !== editingItemId)) {
      setActionError("That ingredient code is already in use.");
      return;
    }
    const previous = items.find((item) => item.id === editingItemId);
    const nextItem = {
      id: editingItemId || crypto.randomUUID(),
      name,
      sku,
      category: draft.category,
      stock,
      capacity,
      unit,
      unitCost,
      threshold,
      expiresAt: draft.expiresAt,
      updatedAt: new Date().toISOString(),
    };
    const nextItems = previous
      ? items.map((item) => item.id === editingItemId ? nextItem : item)
      : [...items, nextItem];
    if (!saveState(nextItems)) return;
    setEditorOpen(false);
    setEditingItemId(null);
    setDraft(emptyDraft);
    showSuccess(previous ? "Inventory item updated" : "Inventory batch added");
  };

  const addCategory = (event) => {
    event.preventDefault();
    const name = categoryDraft.trim();
    if (!name) {
      setActionError("Enter a category name.");
      return;
    }
    if (categories.some((category) => category.toLowerCase() === name.toLowerCase())) {
      setActionError("That category already exists.");
      return;
    }
    if (!saveState(items, [...categories, name])) return;
    setSelectedCategory(name);
    setCategoryDraft("");
    setCategoryDialogOpen(false);
    setActionError("");
  };

  const updateStock = (item, stock) => {
    if (stock < 0) return;
    if (stock > Number(item.capacity)) {
      setActionError(`${item.name} cannot exceed its capacity of ${item.capacity} ${item.unit}.`);
      return;
    }
    const nextItems = items.map((current) => current.id === item.id
      ? { ...current, stock, updatedAt: new Date().toISOString() }
      : current);
    saveState(nextItems);
    setActionError("");
  };

  const openAdjustment = (item, mode) => {
    setAdjustment({ item, mode });
    setAdjustmentAmount("");
    setActionError("");
  };

  const submitAdjustment = (event) => {
    event.preventDefault();
    const amount = Number(adjustmentAmount);
    if (!Number.isFinite(amount) || amount < 0 || (adjustment.mode === "add" && amount === 0)) {
      setActionError(adjustment.mode === "add" ? "Enter a quantity greater than zero." : "Enter a valid stock quantity.");
      return;
    }
    const nextStock = adjustment.mode === "add" ? Number(adjustment.item.stock) + amount : amount;
    if (nextStock > Number(adjustment.item.capacity)) {
      setActionError(`Quantity cannot exceed capacity of ${adjustment.item.capacity} ${adjustment.item.unit}.`);
      return;
    }
    if (!saveState(items.map((item) => item.id === adjustment.item.id
      ? { ...item, stock: nextStock, updatedAt: new Date().toISOString() }
      : item))) return;
    setAdjustment(null);
    setActionError("");
    showSuccess(adjustment.mode === "add" ? "Stock replenished" : "Stock quantity updated");
  };

  const markOutOfStock = async (item) => {
    const result = await showConfirm({
      title: "Mark item out of stock?",
      text: `${item.name} will be recorded as out of stock.`,
      confirmText: "Confirm",
      cancelText: "Cancel",
    });
    if (result.isConfirmed) updateStock(item, 0);
  };

  const deleteItem = async (item) => {
    const result = await showConfirm({
      title: "Remove inventory item?",
      text: `${item.name} will be removed from this browser's inventory.`,
      confirmText: "Remove",
      cancelText: "Cancel",
    });
    if (result.isConfirmed && saveState(items.filter((current) => current.id !== item.id))) {
      showSuccess("Inventory item removed");
    }
  };

  const exportInventory = () => {
    const headers = ["Name", "Code", "Category", "In Stock", "Capacity", "Unit", "Unit Cost", "Low Stock Threshold", "Expiry Date"];
    const rows = items.map((item) => [
      item.name,
      item.sku || "",
      item.category,
      item.stock,
      item.capacity,
      item.unit,
      item.unitCost,
      item.threshold,
      item.expiresAt || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "motopots-inventory.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4">
      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          Unable to load inventory: {loadError}
        </div>
      )}
      {storageError && (
        <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          Inventory changes could not be saved: {storageError}
        </div>
      )}

      {view === "overview" && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Raw items" value={items.length} icon={Boxes} tone="red" />
          <StatCard label="Low stock" value={lowStockItems.length} icon={AlertTriangle} tone="amber" />
          <StatCard label="Expiring" value={expiringCount} icon={Clock3} tone="red" />
          <StatCard label="Batch value" value={formatMoney(stockValue)} icon={Wallet} tone="green" />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search inventory items</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#85858F]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search raw ingredients, dairy, syrup, meats..."
            className="h-11 w-full rounded-lg border border-white/[0.09] bg-[#141419] pl-10 pr-3 text-sm text-[#F5F5F5] outline-none placeholder:text-[#85858F] focus:border-[#E63946]/60"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter inventory by status"
          className="h-11 rounded-lg border border-white/[0.09] bg-[#141419] px-3 text-sm text-[#D1D1D6] outline-none focus:border-[#E63946]/60"
        >
          {["All statuses", "Low stock", "Out of stock", "Expiring"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <button
          type="button"
          onClick={openNewItem}
          disabled={!canEdit}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#E63946] px-4 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PackagePlus aria-hidden="true" className="h-4 w-4" /> Add Batch
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory("All Ingredients")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${selectedCategory === "All Ingredients" ? "bg-[#E63946] text-white" : "bg-[#17171D] text-[#A1A1AA] hover:text-white"}`}
        >
          All Ingredients ({items.length})
        </button>
        {categories.map((category) => {
          const count = items.filter((item) => item.category === category).length;
          return (
            <button
              type="button"
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${selectedCategory === category ? "bg-[#E63946] text-white" : "bg-[#17171D] text-[#A1A1AA] hover:text-white"}`}
            >
              {category} ({count})
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { setCategoryDraft(""); setActionError(""); setCategoryDialogOpen(true); }}
          disabled={!canEdit}
          className="shrink-0 rounded-full border border-white/[0.09] bg-[#17171D] px-3 py-1.5 text-[11px] font-bold text-[#FF727D] hover:border-[#E63946]/40 disabled:opacity-50"
        >
          + Category
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-400/15 bg-[#17171D] p-3 sm:flex-row sm:items-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-extrabold text-[#F5F5F5]">Restock Alert: {lowStockItems[0].name}</p>
            <p className="mb-0 mt-0.5 text-[11px] text-[#A1A1AA]">
              {lowStockItems.length} {lowStockItems.length === 1 ? "item is" : "items are"} below its supply threshold.
            </p>
          </div>
          <button type="button" onClick={() => openAdjustment(lowStockItems[0], "add")} className="rounded-md bg-amber-400/10 px-3 py-1.5 text-[10px] font-extrabold text-amber-300 hover:bg-amber-400/20">
            Restock
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2">
        <h2 className="m-0 text-[11px] font-extrabold uppercase tracking-[1px] text-[#D1D1D6]">
          Ingredients &amp; Raw Supplies <span className="text-[#85858F]">({filteredItems.length} active in view)</span>
        </h2>
        <span className="text-[10px] font-bold text-[#85858F]">Scroll for details →</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#141419]">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.07] text-[10px] font-extrabold uppercase tracking-[0.8px] text-[#85858F]">
              <th className="px-3 py-3">Ingredient / Code</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">In Stock / Capacity</th>
              <th className="px-3 py-3">Unit Cost</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-[#A1A1AA]">Loading inventory…</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center">
                  <PackagePlus aria-hidden="true" className="mx-auto h-7 w-7 text-[#777781]" />
                  <p className="mb-0 mt-3 text-sm font-extrabold">{items.length ? "No inventory items match these filters" : "No inventory items yet"}</p>
                  <p className="mb-0 mt-1 text-xs text-[#85858F]">{items.length ? "Try a different search or category." : "Add a batch to start tracking stock. No sample records are preloaded."}</p>
                  {!items.length && <button type="button" onClick={openNewItem} disabled={!canEdit} className="mt-4 rounded-lg bg-[#E63946] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">Add First Batch</button>}
                </td>
              </tr>
            ) : filteredItems.map((item) => {
              const status = getStatus(item);
              const stock = Number(item.stock);
              const capacity = Number(item.capacity);
              const fill = Math.min(100, Math.max(0, stock / capacity * 100));
              const fillColor = status === "In Stock" ? "bg-emerald-400" : status === "Out of Stock" ? "bg-rose-400" : "bg-amber-400";
              const isMeasured = /^(kg|g|l|ml)$/i.test(item.unit);
              return (
                <tr key={item.id} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex min-w-[190px] items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#24242B] text-[#FF727D]">
                        <Boxes aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-extrabold text-[#F5F5F5]">{item.name}</span>
                        <span className="mt-0.5 block truncate text-[9px] text-[#85858F]">SKU: {item.sku || "—"}{item.expiresAt ? ` · Expires ${item.expiresAt}` : ""}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-[#C3C3CA]">{item.category}</span></td>
                  <td className="px-3 py-3">
                    <div className="w-28">
                      <p className={`m-0 text-[10px] font-extrabold ${status === "Out of Stock" ? "text-rose-300" : status === "In Stock" ? "text-emerald-300" : "text-amber-300"}`}>{stock} / {capacity} {item.unit}</p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#303038]"><div className={`h-full rounded-full ${fillColor}`} style={{ width: `${fill}%` }} /></div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[10px] font-bold text-[#D1D1D6]">{formatMoney(item.unitCost)}/{item.unit}</td>
                  <td className="px-3 py-3"><StatusBadge status={status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" disabled={!canEdit || stock <= 0} onClick={() => updateStock(item, Math.max(0, stock - 1))} aria-label={`Decrease ${item.name} stock`} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.07] bg-[#24242B] text-[#D1D1D6] hover:text-white disabled:opacity-40"><Minus aria-hidden="true" className="h-3 w-3" /></button>
                      <button type="button" disabled={!canEdit || stock >= capacity} onClick={() => updateStock(item, Math.min(capacity, stock + 1))} aria-label={`Increase ${item.name} stock`} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.07] bg-[#24242B] text-[#D1D1D6] hover:text-white disabled:opacity-40"><Plus aria-hidden="true" className="h-3 w-3" /></button>
                      <button type="button" disabled={!canEdit} onClick={() => openEditItem(item)} aria-label={`Edit ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.07] bg-[#24242B] text-[#A1A1AA] hover:text-white disabled:opacity-40"><Pencil aria-hidden="true" className="h-3 w-3" /></button>
                      {status === "Out of Stock" ? (
                        <button type="button" disabled={!canEdit} onClick={() => openAdjustment(item, "add")} className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-400/10 px-2 text-[9px] font-extrabold text-emerald-300 disabled:opacity-40"><Truck aria-hidden="true" className="h-3 w-3" /> Delivery</button>
                      ) : isMeasured ? (
                        <button type="button" disabled={!canEdit} onClick={() => openAdjustment(item, "set")} className="inline-flex h-7 items-center gap-1 rounded-md bg-[#24242B] px-2 text-[9px] font-extrabold text-[#D1D1D6] disabled:opacity-40"><Scale aria-hidden="true" className="h-3 w-3" /> Weigh</button>
                      ) : status === "Low Stock" || status === "Critical Low" ? (
                        <button type="button" disabled={!canEdit} onClick={() => openAdjustment(item, "add")} className="inline-flex h-7 items-center gap-1 rounded-md bg-[#E63946]/15 px-2 text-[9px] font-extrabold text-[#FF727D] disabled:opacity-40"><PackagePlus aria-hidden="true" className="h-3 w-3" /> Restock</button>
                      ) : (
                        <button type="button" disabled={!canEdit} onClick={() => markOutOfStock(item)} className="inline-flex h-7 items-center gap-1 rounded-md bg-[#24242B] px-2 text-[9px] font-extrabold text-[#C3C3CA] disabled:opacity-40">Out</button>
                      )}
                      <button type="button" disabled={!canEdit} onClick={() => deleteItem(item)} aria-label={`Remove ${item.name}`} className="flex h-7 w-7 items-center justify-center rounded-md text-[#777781] hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-40"><Trash2 aria-hidden="true" className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#85858F]">
        <span>Items: {filteredItems.length} of {items.length} · Browser-saved inventory</span>
        <button type="button" onClick={exportInventory} disabled={items.length === 0} className="inline-flex items-center gap-1.5 font-bold text-[#FF727D] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><Download aria-hidden="true" className="h-3 w-3" /> Export</button>
      </div>
      {actionError && <p role="alert" className="m-0 text-xs font-semibold text-rose-300">{actionError}</p>}

      {editorOpen && (
        <InventoryModal title={editingItemId ? "Edit inventory item" : "Add inventory batch"} onClose={() => setEditorOpen(false)}>
          <form onSubmit={saveItem} className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#A1A1AA] sm:col-span-2">Ingredient name
              <input autoFocus value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={inputClass} required />
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">Ingredient code
              <input value={draft.sku} onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))} placeholder="Auto-generated if empty" className={inputClass} />
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">Category
              <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className={inputClass} required>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">In stock
              <input type="number" min="0" step="any" value={draft.stock} onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))} className={inputClass} required />
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">Capacity
              <input type="number" min="0.01" step="any" value={draft.capacity} onChange={(event) => setDraft((current) => ({ ...current, capacity: event.target.value }))} className={inputClass} required />
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">Unit
              <input value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))} placeholder="kg, L, pcs, packs..." className={inputClass} required />
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">Unit cost (₱)
              <input type="number" min="0" step="any" value={draft.unitCost} onChange={(event) => setDraft((current) => ({ ...current, unitCost: event.target.value }))} className={inputClass} required />
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">Low-stock threshold
              <input type="number" min="0" step="any" value={draft.threshold} onChange={(event) => setDraft((current) => ({ ...current, threshold: event.target.value }))} className={inputClass} required />
            </label>
            <label className="text-xs font-bold text-[#A1A1AA]">Expiry date
              <input type="date" value={draft.expiresAt} onChange={(event) => setDraft((current) => ({ ...current, expiresAt: event.target.value }))} className={inputClass} />
            </label>
            {actionError && <p role="alert" className="m-0 text-xs font-semibold text-rose-300 sm:col-span-2">{actionError}</p>}
            <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-[#A1A1AA]">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white">{editingItemId ? "Save Changes" : "Add Batch"}</button>
            </div>
          </form>
        </InventoryModal>
      )}

      {categoryDialogOpen && (
        <InventoryModal title="Add inventory category" maxWidth="max-w-md" onClose={() => setCategoryDialogOpen(false)}>
          <form onSubmit={addCategory}>
            <label className="text-xs font-bold text-[#A1A1AA]">Category name
              <input autoFocus value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} className={inputClass} required />
            </label>
            {actionError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-300">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCategoryDialogOpen(false)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-[#A1A1AA]">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white">Add Category</button>
            </div>
          </form>
        </InventoryModal>
      )}

      {adjustment && (
        <InventoryModal title={adjustment.mode === "add" ? `Restock ${adjustment.item.name}` : `Update ${adjustment.item.name} quantity`} maxWidth="max-w-md" onClose={() => setAdjustment(null)}>
          <form onSubmit={submitAdjustment}>
            <p className="mb-3 text-xs text-[#A1A1AA]">Current: {adjustment.item.stock} / {adjustment.item.capacity} {adjustment.item.unit}</p>
            <label className="text-xs font-bold text-[#A1A1AA]">{adjustment.mode === "add" ? "Quantity to add" : "New quantity"}
              <input autoFocus type="number" min="0" step="any" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} className={inputClass} required />
            </label>
            {actionError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-300">{actionError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustment(null)} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-[#A1A1AA]">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white">{adjustment.mode === "add" ? "Restock" : "Save Quantity"}</button>
            </div>
          </form>
        </InventoryModal>
      )}
    </section>
  );
}
