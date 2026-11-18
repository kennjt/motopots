export const INVENTORY_STORAGE_KEY = "motopots-inventory";

export const DEFAULT_INVENTORY_CATEGORIES = [
  "Dairy & Milks",
  "Coffee & Syrups",
  "Poultry & Meats",
  "Sauces & Condiments",
  "Dry Mix & Flours",
  "Halo-Halo Prep",
  "Cold Station",
];

export function readInventoryState() {
  const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
  if (raw === null) {
    return { items: [], categories: [...DEFAULT_INVENTORY_CATEGORIES] };
  }

  const saved = JSON.parse(raw);
  if (
    !saved
    || !Array.isArray(saved.items)
    || !Array.isArray(saved.categories)
    || saved.categories.some((category) => typeof category !== "string")
    || saved.items.some((item) => (
      !item
      || typeof item.id !== "string"
      || typeof item.name !== "string"
      || typeof item.category !== "string"
      || !Number.isFinite(Number(item.stock))
      || !Number.isFinite(Number(item.capacity))
      || !Number.isFinite(Number(item.unitCost))
      || !Number.isFinite(Number(item.threshold))
    ))
  ) {
    throw new Error("Saved inventory data has an invalid format.");
  }

  return {
    items: saved.items,
    categories: [...new Set([...DEFAULT_INVENTORY_CATEGORIES, ...saved.categories])],
  };
}

export function saveInventoryState(state) {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(state));
}
