export const INVENTORY_STORAGE_KEY = "motopots-inventory";
export const INVENTORY_UPDATED_EVENT = "motopots-inventory-updated";

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
    return {
      items: [],
      categories: [...DEFAULT_INVENTORY_CATEGORIES],
      recipes: [],
      stockMovements: [],
      suppliers: [],
    };
  }

  const saved = JSON.parse(raw);
  const recipes = saved?.recipes ?? [];
  const stockMovements = saved?.stockMovements ?? [];
  const suppliers = saved?.suppliers ?? [];
  if (
    !saved
    || !Array.isArray(saved.items)
    || !Array.isArray(saved.categories)
    || !Array.isArray(recipes)
    || !Array.isArray(stockMovements)
    || !Array.isArray(suppliers)
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
    || recipes.some((recipe) => (
      !recipe
      || typeof recipe.id !== "string"
      || typeof recipe.menuItemId !== "string"
      || !Array.isArray(recipe.ingredients)
    ))
    || stockMovements.some((movement) => (
      !movement
      || typeof movement.id !== "string"
      || typeof movement.ingredientId !== "string"
      || typeof movement.ingredientName !== "string"
      || ![
        "Stock In",
        "Stock Out",
        "Adjustment",
        "Waste",
        "Return",
        "Purchase Receipt",
      ].includes(movement.type)
      || !Number.isFinite(Number(movement.quantity))
      || !Number.isFinite(Number(movement.beforeStock))
      || !Number.isFinite(Number(movement.afterStock))
    ))
    || suppliers.some((supplier) => (
      !supplier
      || typeof supplier.id !== "string"
      || typeof supplier.name !== "string"
      || (
        supplier.inventoryItemIds !== undefined
        && (
          !Array.isArray(supplier.inventoryItemIds)
          || supplier.inventoryItemIds.some((id) => typeof id !== "string")
        )
      )
    ))
  ) {
    throw new Error("Saved inventory data has an invalid format.");
  }

  return {
    items: saved.items,
    categories: [...new Set([...DEFAULT_INVENTORY_CATEGORIES, ...saved.categories])],
    recipes,
    stockMovements,
    suppliers,
  };
}

export function saveInventoryState(state) {
  const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
  const saved = raw === null ? {} : JSON.parse(raw);
  localStorage.setItem(
    INVENTORY_STORAGE_KEY,
    JSON.stringify({ ...saved, ...state }),
  );
  window.dispatchEvent(new Event(INVENTORY_UPDATED_EVENT));
}
