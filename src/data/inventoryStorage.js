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
      purchaseTransactions: [],
      completedOrderIds: [],
    };
  }

  const saved = JSON.parse(raw);
  const recipes = saved?.recipes ?? [];
  const stockMovements = saved?.stockMovements ?? [];
  const suppliers = saved?.suppliers ?? [];
  const purchaseTransactions = saved?.purchaseTransactions ?? [];
  const completedOrderIds = saved?.completedOrderIds ?? [];
  if (
    !saved
    || !Array.isArray(saved.items)
    || !Array.isArray(saved.categories)
    || !Array.isArray(recipes)
    || !Array.isArray(stockMovements)
    || !Array.isArray(suppliers)
    || !Array.isArray(purchaseTransactions)
    || !Array.isArray(completedOrderIds)
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
    || purchaseTransactions.some((purchase) => (
      !purchase
      || typeof purchase.id !== "string"
      || typeof purchase.supplierId !== "string"
      || typeof purchase.supplierName !== "string"
      || !Array.isArray(purchase.items)
      || !Number.isFinite(Number(purchase.total))
    ))
    || completedOrderIds.some((id) => typeof id !== "string")
  ) {
    throw new Error("Saved inventory data has an invalid format.");
  }

  return {
    items: saved.items,
    categories: [...new Set([...DEFAULT_INVENTORY_CATEGORIES, ...saved.categories])],
    recipes,
    stockMovements,
    suppliers,
    purchaseTransactions,
    completedOrderIds,
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

export function deductOrderRecipeStock(order) {
  const orderId = String(order?.id || "");
  if (!orderId) throw new Error("A valid order ID is required to deduct stock.");

  const state = readInventoryState();
  if (state.completedOrderIds.includes(orderId)) return { alreadyApplied: true };

  const orderItems = Array.isArray(order.items) ? order.items : [];
  if (!orderItems.length) throw new Error("This order has no items to deduct from stock.");

  const demandByIngredient = new Map();
  for (const orderItem of orderItems) {
    const quantity = Number(orderItem.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`The quantity for ${orderItem.name || "an order item"} is invalid.`);
    }

    const recipe = state.recipes.find(
      (item) =>
        item.menuItemId === orderItem.productId
        || (!orderItem.productId && item.menuItemName === orderItem.name),
    );
    if (!recipe) {
      throw new Error(`Add a recipe for ${orderItem.name || "each menu item"} before completing this order.`);
    }

    const yieldAmount = Number(recipe.yieldAmount) || 1;
    for (const recipeIngredient of recipe.ingredients) {
      const ingredientId = recipeIngredient.ingredientId;
      const inventoryItem = state.items.find((item) => item.id === ingredientId);
      if (!inventoryItem) {
        throw new Error(
          `The recipe for ${recipe.menuItemName} refers to an ingredient that is no longer in inventory.`,
        );
      }
      if (recipeIngredient.unit && inventoryItem.unit !== recipeIngredient.unit) {
        throw new Error(
          `Update the recipe unit for ${inventoryItem.name} before completing this order.`,
        );
      }
      const perServing = Number.isFinite(Number(recipeIngredient.quantityPerServing))
        ? Number(recipeIngredient.quantityPerServing)
        : Number(recipeIngredient.quantity) / yieldAmount;
      const required = perServing * quantity;
      if (!Number.isFinite(required) || required <= 0) {
        throw new Error(`The recipe quantity for ${inventoryItem.name} is invalid.`);
      }
      const current = demandByIngredient.get(ingredientId) || {
        item: inventoryItem,
        quantity: 0,
      };
      current.quantity += required;
      demandByIngredient.set(ingredientId, current);
    }
  }

  const insufficient = [...demandByIngredient.values()].find(
    ({ item, quantity }) => Number(item.stock) < quantity,
  );
  if (insufficient) {
    throw new Error(
      `Not enough ${insufficient.item.name} in stock. Need ${insufficient.quantity} ${insufficient.item.unit}; ${insufficient.item.stock} available.`,
    );
  }

  const createdAt = new Date().toISOString();
  const movements = [...demandByIngredient.values()].map(({ item, quantity }) => ({
    id: crypto.randomUUID(),
    ingredientId: item.id,
    ingredientName: item.name,
    type: "Stock Out",
    direction: "out",
    quantity,
    unit: item.unit,
    beforeStock: Number(item.stock),
    afterStock: Number(item.stock) - quantity,
    reason: `Completed order #${orderId}`,
    date: createdAt.slice(0, 10),
    sourceOrderId: orderId,
    createdAt,
  }));
  const movementByItem = new Map(
    movements.map((movement) => [movement.ingredientId, movement]),
  );

  saveInventoryState({
    ...state,
    items: state.items.map((item) => {
      const movement = movementByItem.get(item.id);
      return movement
        ? { ...item, stock: movement.afterStock, updatedAt: createdAt }
        : item;
    }),
    stockMovements: [...movements, ...state.stockMovements],
    completedOrderIds: [...state.completedOrderIds, orderId],
  });

  return { alreadyApplied: false, movementIds: movements.map(({ id }) => id) };
}
