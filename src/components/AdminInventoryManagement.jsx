import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { menuItems } from "../data/menuData";
import {
  INVENTORY_STORAGE_KEY,
  readInventoryState,
  saveInventoryState,
} from "../data/inventoryStorage";
import { readEmployees } from "../data/adminSettingsStorage";
import { showConfirm, showSuccess } from "../utils/swal";

const inputClass =
  "mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]/60";
const primaryButtonClass =
  "rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#D1D1D6] transition hover:bg-white/[0.05]";

function useInventoryData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const load = () => {
      try {
        setData(readInventoryState());
        setLoadError("");
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load inventory records.",
        );
      } finally {
        setLoading(false);
      }
    };
    const sync = (event) => {
      if (event.key === INVENTORY_STORAGE_KEY || event.key === null) load();
    };

    load();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const save = (nextData) => {
    try {
      saveInventoryState(nextData);
      setData(readInventoryState());
      setSaveError("");
      return true;
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save inventory records.",
      );
      return false;
    }
  };

  return { data, loading, loadError, saveError, save };
}

function PageFrame({ title, description, state, children }) {
  return (
    <section className="space-y-5">
      <header>
        <h2 className="m-0 text-xl font-extrabold text-[#F5F5F5]">{title}</h2>
        <p className="mb-0 mt-1 text-sm text-[#A1A1AA]">{description}</p>
      </header>
      {state.loadError && (
        <p role="alert" className="m-0 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
          Could not load records: {state.loadError}
        </p>
      )}
      {state.saveError && (
        <p role="alert" className="m-0 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
          Changes could not be saved: {state.saveError}
        </p>
      )}
      {state.loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-8 text-center text-sm text-[#A1A1AA]">
          Loading {title.toLowerCase()}…
        </div>
      ) : state.loadError ? null : (
        children
      )}
    </section>
  );
}

function EditorModal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventoryEditorTitle"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 id="inventoryEditorTitle" className="m-0 text-lg font-extrabold">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="rounded-lg px-2 py-1 text-xl text-[#A1A1AA] hover:text-white"
          >
            &times;
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111116] px-5 py-10 text-center">
      <p className="m-0 text-sm font-bold text-[#D1D1D6]">{children}</p>
    </div>
  );
}

const movementTypes = [
  "Stock In",
  "Stock Out",
  "Adjustment",
  "Waste",
  "Return",
  "Purchase Receipt",
];

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMovementDirection(type, direction) {
  if (type === "Stock In" || type === "Purchase Receipt") return "in";
  if (type === "Stock Out" || type === "Waste") return "out";
  return direction;
}

function getMovementDateValue(movement) {
  const value = movement.date
    ? new Date(`${movement.date}T00:00:00`)
    : new Date(movement.createdAt);
  return Number.isNaN(value.getTime()) ? null : value;
}

function getMovementLabel(movement) {
  if (movement.type === "Adjustment" || movement.type === "Return") {
    const direction = getMovementDirection(movement.type, movement.direction);
    return `${movement.type} (${direction === "out" ? "Stock Out" : "Stock In"})`;
  }
  return movement.type;
}

function getQuantityPerServing(recipe, ingredient) {
  if (Number.isFinite(Number(ingredient.quantityPerServing))) {
    return Number(ingredient.quantityPerServing);
  }
  const yieldAmount = Number(recipe.yieldAmount) || 1;
  return Number(ingredient.quantity || 0) / yieldAmount;
}

function RecipesPage({ state }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    menuItemId: "",
    yieldAmount: "1",
    instructions: "",
    ingredients: [{ ingredientId: "", quantity: "" }],
  });
  const { data, save } = state;
  const productById = new Map(menuItems.map((item) => [item.id, item]));
  const ingredientById = new Map(data.items.map((item) => [item.id, item]));

  const openNewRecipe = () => {
    setEditingId(null);
    setDraft({
      menuItemId: menuItems[0]?.id || "",
      yieldAmount: "1",
      instructions: "",
      ingredients: [{ ingredientId: "", quantity: "" }],
    });
    setError("");
    setEditorOpen(true);
  };

  const openEditRecipe = (recipe) => {
    setEditingId(recipe.id);
    setDraft({
      menuItemId: recipe.menuItemId,
      yieldAmount: String(recipe.yieldAmount || 1),
      instructions: recipe.instructions || "",
      ingredients: recipe.ingredients.length
        ? recipe.ingredients.map((ingredient) => ({
            ingredientId: ingredient.ingredientId,
            quantity: String(getQuantityPerServing(recipe, ingredient)),
          }))
        : [{ ingredientId: "", quantity: "" }],
    });
    setError("");
    setEditorOpen(true);
  };

  const saveRecipe = (event) => {
    event.preventDefault();
    const product = productById.get(draft.menuItemId);
    const yieldAmount = Number(draft.yieldAmount);
    if (!product) {
      setError("Choose a menu item for this recipe.");
      return;
    }
    if (!Number.isFinite(yieldAmount) || yieldAmount <= 0) {
      setError("Batch size must be a number greater than zero.");
      return;
    }
    if (!draft.ingredients.length) {
      setError("Add at least one ingredient.");
      return;
    }

    const ingredients = [];
    for (const line of draft.ingredients) {
      const ingredient = ingredientById.get(line.ingredientId);
      const quantity = Number(line.quantity);
      if (!ingredient || !Number.isFinite(quantity) || quantity <= 0) {
        setError("Choose an ingredient and enter a quantity greater than zero for every line.");
        return;
      }
      ingredients.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantityPerServing: quantity,
        unit: ingredient.unit,
      });
    }

    if (
      data.recipes.some(
        (recipe) =>
          recipe.menuItemId === product.id && recipe.id !== editingId,
      )
    ) {
      setError("A recipe already exists for this menu item. Edit that recipe instead.");
      return;
    }

    const existing = data.recipes.find((recipe) => recipe.id === editingId);
    const recipe = {
      id: editingId || crypto.randomUUID(),
      menuItemId: product.id,
      menuItemName: product.name,
      yieldAmount,
      instructions: draft.instructions.trim(),
      ingredients,
      quantityBasis: "per-serving",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const recipes = existing
      ? data.recipes.map((item) => (item.id === editingId ? recipe : item))
      : [recipe, ...data.recipes];

    if (!save({ ...data, recipes })) return;
    setEditorOpen(false);
    setEditingId(null);
    showSuccess(existing ? "Recipe updated" : "Recipe added");
  };

  const deleteRecipe = async (recipe) => {
    const result = await showConfirm({
      title: "Delete recipe?",
      text: `The recipe for ${recipe.menuItemName} will be removed.`,
      confirmText: "Delete recipe",
      cancelText: "Keep recipe",
    });
    if (!result.isConfirmed) return;
    if (save({ ...data, recipes: data.recipes.filter((item) => item.id !== recipe.id) })) {
      showSuccess("Recipe deleted");
    }
  };

  const updateIngredientLine = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    }));
  };

  return (
    <PageFrame
      title="Recipes"
      description="Define the inventory ingredients and quantities consumed for one serving of each menu item. Batch yield is kept for reference; recipes do not automatically deduct stock from orders."
      state={state}
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openNewRecipe}
          disabled={!data.items.length || !menuItems.length}
          className={primaryButtonClass}
        >
          Add recipe
        </button>
      </div>
      {!data.items.length ? (
        <EmptyState>
          Add ingredients before configuring recipes.{" "}
          <Link
            to="/staff/inventory/ingredients"
            className="text-[#FF727D] underline"
          >
            Manage ingredients
          </Link>
        </EmptyState>
      ) : data.recipes.length === 0 ? (
        <EmptyState>No recipes yet. Add a recipe to get started.</EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.recipes.map((recipe) => (
            <article
              key={recipe.id}
              className="rounded-xl border border-white/[0.08] bg-[#111116] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-base font-extrabold">
                    {recipe.menuItemName ||
                      productById.get(recipe.menuItemId)?.name ||
                      "Menu item"}
                  </h3>
                  <p className="mb-0 mt-1 text-xs text-[#A1A1AA]">
                    Batch size: {recipe.yieldAmount} serving
                    {recipe.yieldAmount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditRecipe(recipe)}
                    className={secondaryButtonClass}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRecipe(recipe)}
                    className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-400/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ul className="mb-0 mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-sm text-[#D1D1D6]">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={`${ingredient.ingredientId}-${index}`}>
                    {ingredient.ingredientName ||
                      ingredientById.get(ingredient.ingredientId)?.name ||
                      "Removed ingredient"}
                    {" · "}
                    {getQuantityPerServing(recipe, ingredient)} {ingredient.unit}{" "}
                    per serving
                  </li>
                ))}
              </ul>
              {recipe.instructions && (
                <p className="mb-0 mt-3 whitespace-pre-wrap text-xs leading-relaxed text-[#A1A1AA]">
                  {recipe.instructions}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {editorOpen && (
        <EditorModal
          title={editingId ? "Edit recipe" : "Add recipe"}
          onClose={() => setEditorOpen(false)}
        >
          <form onSubmit={saveRecipe} className="space-y-4">
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Menu item
              <select
                value={draft.menuItemId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    menuItemId: event.target.value,
                  }))
                }
                className={inputClass}
                required
              >
                <option value="">Select a menu item</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Batch size (servings)
              <input
                type="number"
                min="0.01"
                step="any"
                value={draft.yieldAmount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    yieldAmount: event.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="m-0 text-xs font-extrabold text-[#D1D1D6]">
                  Ingredients consumed per serving
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      ingredients: [
                        ...current.ingredients,
                        { ingredientId: "", quantity: "" },
                      ],
                    }))
                  }
                  className="text-xs font-bold text-[#FF727D] hover:text-white"
                >
                  Add ingredient
                </button>
              </div>
              {draft.ingredients.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2"
                >
                  <label className="min-w-0 text-[11px] font-bold text-[#A1A1AA]">
                    Ingredient
                    <select
                      value={line.ingredientId}
                      onChange={(event) =>
                        updateIngredientLine(
                          index,
                          "ingredientId",
                          event.target.value,
                        )
                      }
                      className={inputClass}
                      required
                    >
                      <option value="">Select ingredient</option>
                      {data.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-bold text-[#A1A1AA]">
                    Quantity per serving
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={line.quantity}
                      onChange={(event) =>
                        updateIngredientLine(
                          index,
                          "quantity",
                          event.target.value,
                        )
                      }
                      className={inputClass}
                      required
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove ingredient ${index + 1}`}
                    disabled={draft.ingredients.length === 1}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        ingredients: current.ingredients.filter(
                          (_, lineIndex) => lineIndex !== index,
                        ),
                      }))
                    }
                    className="mb-1 rounded-lg px-2 py-2 text-sm font-bold text-rose-300 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Preparation notes
              <textarea
                value={draft.instructions}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    instructions: event.target.value,
                  }))
                }
                rows="3"
                className={inputClass}
              />
            </label>
            {error && (
              <p role="alert" className="m-0 text-xs font-semibold text-rose-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass}>
                Save recipe
              </button>
            </div>
          </form>
        </EditorModal>
      )}
    </PageFrame>
  );
}

function StockMovementsPage({ state }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeeLoadError, setEmployeeLoadError] = useState("");
  const [draft, setDraft] = useState({
    ingredientId: "",
    type: "Stock In",
    direction: "in",
    quantity: "",
    reason: "",
    date: getLocalDateInputValue(),
    responsibleEmployeeId: "manual",
    responsibleEmployeeName: "",
  });
  const { data, save } = state;

  useEffect(() => {
    let active = true;
    const loadEmployees = async () => {
      try {
        const savedEmployees = await readEmployees();
        if (active) {
          setEmployees(savedEmployees);
          setEmployeeLoadError("");
        }
      } catch (loadError) {
        if (active) {
          setEmployeeLoadError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load employee records.",
          );
        }
      }
    };
    const syncEmployees = (event) => {
      if (!event.key || event.key === "motopots-employees") loadEmployees();
    };

    loadEmployees();
    window.addEventListener("storage", syncEmployees);
    return () => {
      active = false;
      window.removeEventListener("storage", syncEmployees);
    };
  }, []);

  const openMovement = () => {
    setDraft({
      ingredientId: data.items[0]?.id || "",
      type: "Stock In",
      direction: "in",
      quantity: "",
      reason: "",
      date: getLocalDateInputValue(),
      responsibleEmployeeId: employees[0]?.id || "manual",
      responsibleEmployeeName: "",
    });
    setError("");
    setEditorOpen(true);
  };

  const submitMovement = (event) => {
    event.preventDefault();
    const ingredient = data.items.find(
      (item) => item.id === draft.ingredientId,
    );
    const quantity = Number(draft.quantity);
    if (!ingredient) {
      setError("Choose an inventory ingredient.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    if (!draft.reason.trim()) {
      setError("Enter a reason for this stock movement.");
      return;
    }
    if (!draft.date) {
      setError("Choose the date of this stock movement.");
      return;
    }

    const responsibleEmployee =
      employees.find(
        (employee) => employee.id === draft.responsibleEmployeeId,
      ) || null;
    const responsibleEmployeeName = responsibleEmployee
      ? responsibleEmployee.name
      : draft.responsibleEmployeeName.trim();
    if (!responsibleEmployeeName) {
      setError("Choose or enter the responsible employee.");
      return;
    }

    const beforeStock = Number(ingredient.stock);
    const direction = getMovementDirection(draft.type, draft.direction);
    const afterStock = direction === "in"
      ? beforeStock + quantity
      : beforeStock - quantity;
    if (afterStock < 0) {
      setError(`There are only ${beforeStock} ${ingredient.unit} in stock.`);
      return;
    }
    if (afterStock > Number(ingredient.capacity)) {
      setError(
        `The stock capacity is ${ingredient.capacity} ${ingredient.unit}.`,
      );
      return;
    }

    const createdAt = new Date().toISOString();
    const movement = {
      id: crypto.randomUUID(),
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      type: draft.type,
      direction,
      quantity,
      unit: ingredient.unit,
      beforeStock,
      afterStock,
      reason: draft.reason.trim(),
      date: draft.date,
      responsibleEmployeeId: responsibleEmployee?.id || "",
      responsibleEmployeeName,
      createdAt,
    };
    const nextData = {
      ...data,
      items: data.items.map((item) =>
        item.id === ingredient.id
          ? { ...item, stock: afterStock, updatedAt: createdAt }
          : item,
      ),
      stockMovements: [movement, ...data.stockMovements],
    };
    if (!save(nextData)) return;
    setEditorOpen(false);
    showSuccess("Stock movement recorded");
  };

  const movements = [...data.stockMovements].sort(
    (first, second) =>
      (getMovementDateValue(second)?.getTime() || 0) -
      (getMovementDateValue(first)?.getTime() || 0),
  );

  return (
    <PageFrame
      title="Stock Movements"
      description="Record stock-in, stock-out, adjustments, waste, returns, and purchase receipts with quantity, reason, date, and responsible employee."
      state={state}
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openMovement}
          disabled={!data.items.length}
          className={primaryButtonClass}
        >
          Record movement
        </button>
      </div>
      {!data.items.length ? (
        <EmptyState>
          Add ingredients before recording stock movements.{" "}
          <Link
            to="/staff/inventory/ingredients"
            className="text-[#FF727D] underline"
          >
            Manage ingredients
          </Link>
        </EmptyState>
      ) : movements.length === 0 ? (
        <EmptyState>No stock movements recorded yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111116]">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07] text-[10px] font-extrabold uppercase tracking-[0.8px] text-[#85858F]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3">Movement</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Responsible employee</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b border-white/[0.05] text-xs last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[#A1A1AA]">
                    {getMovementDateValue(movement)?.toLocaleDateString() || "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#F5F5F5]">
                    {movement.ingredientName}
                  </td>
                  <td className="px-4 py-3 text-[#D1D1D6]">
                    {getMovementLabel(movement)}
                  </td>
                  <td
                    className={`px-4 py-3 font-extrabold ${getMovementDirection(movement.type, movement.direction) === "out" ? "text-rose-300" : "text-emerald-300"}`}
                  >
                    {getMovementDirection(movement.type, movement.direction) === "out" ? "−" : "+"}
                    {movement.quantity} {movement.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#D1D1D6]">
                    {movement.beforeStock} → {movement.afterStock}{" "}
                    {movement.unit}
                  </td>
                  <td className="max-w-52 px-4 py-3 text-[#A1A1AA]">
                    {movement.reason || movement.note || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">
                    {movement.responsibleEmployeeName || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editorOpen && (
        <EditorModal
          title="Record stock movement"
          onClose={() => setEditorOpen(false)}
        >
          <form onSubmit={submitMovement} className="space-y-4">
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Ingredient
              <select
                value={draft.ingredientId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ingredientId: event.target.value,
                  }))
                }
                className={inputClass}
                required
              >
                {data.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.stock} / {item.capacity} {item.unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Movement type
              <select
                value={draft.type}
                onChange={(event) => {
                  const type = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    type,
                    direction:
                      type === "Adjustment" || type === "Return"
                        ? current.direction
                        : getMovementDirection(type, current.direction),
                  }));
                }}
                className={inputClass}
              >
                {movementTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            {(draft.type === "Adjustment" || draft.type === "Return") && (
              <label className="block text-xs font-bold text-[#A1A1AA]">
                {draft.type === "Return"
                  ? "Return direction"
                  : "Adjustment direction"}
                <select
                  value={draft.direction}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      direction: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="in">
                    {draft.type === "Return"
                      ? "Return to inventory"
                      : "Increase stock"}
                  </option>
                  <option value="out">
                    {draft.type === "Return"
                      ? "Return to supplier"
                      : "Decrease stock"}
                  </option>
                </select>
              </label>
            )}
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Quantity
              <input
                type="number"
                min="0.001"
                step="any"
                value={draft.quantity}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    quantity: event.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </label>
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Reason
              <textarea
                value={draft.reason}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                rows="2"
                className={inputClass}
                maxLength="300"
                required
              />
            </label>
            <label className="block text-xs font-bold text-[#A1A1AA]">
              Date
              <input
                type="date"
                value={draft.date}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </label>
            {employeeLoadError && (
              <p role="alert" className="m-0 text-xs text-rose-300">
                Employee records could not be loaded: {employeeLoadError}
              </p>
            )}
            {employees.length > 0 && (
              <label className="block text-xs font-bold text-[#A1A1AA]">
                Responsible employee
                <select
                  value={draft.responsibleEmployeeId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      responsibleEmployeeId: event.target.value,
                      responsibleEmployeeName: "",
                    }))
                  }
                  className={inputClass}
                  required
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                  <option value="manual">Enter another name</option>
                </select>
              </label>
            )}
            {(!employees.length ||
              draft.responsibleEmployeeId === "manual") && (
              <div>
                {!employees.length && (
                  <p className="mb-2 text-xs text-[#A1A1AA]">
                    No employee records are available. Enter the responsible
                    employee here or{" "}
                    <Link
                      to="/staff/employees"
                      className="font-bold text-[#FF727D] underline"
                    >
                      add an employee
                    </Link>
                    .
                  </p>
                )}
                <label className="block text-xs font-bold text-[#A1A1AA]">
                  Responsible employee
                  <input
                    value={draft.responsibleEmployeeName}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        responsibleEmployeeName: event.target.value,
                      }))
                    }
                    className={inputClass}
                    maxLength="120"
                    required
                  />
                </label>
              </div>
            )}
            {error && (
              <p role="alert" className="m-0 text-xs font-semibold text-rose-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass}>
                Save movement
              </button>
            </div>
          </form>
        </EditorModal>
      )}
    </PageFrame>
  );
}

const emptySupplier = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  inventoryItemIds: [],
};

function SuppliersPage({ state }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptySupplier);
  const { data, save } = state;

  const openNewSupplier = () => {
    setEditingId(null);
    setDraft(emptySupplier);
    setError("");
    setEditorOpen(true);
  };

  const openEditSupplier = (supplier) => {
    setEditingId(supplier.id);
    setDraft({
      name: supplier.name || "",
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      inventoryItemIds: Array.isArray(supplier.inventoryItemIds)
        ? supplier.inventoryItemIds.filter((id) =>
            data.items.some((item) => item.id === id),
          )
        : [],
    });
    setError("");
    setEditorOpen(true);
  };

  const saveSupplier = (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    const email = draft.email.trim();
    if (!name) {
      setError("Enter a supplier name.");
      return;
    }
    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setError("Enter a valid email address.");
      return;
    }
    if (
      data.suppliers.some(
        (supplier) =>
          supplier.name.toLowerCase() === name.toLowerCase() &&
          supplier.id !== editingId,
      )
    ) {
      setError("A supplier with this name already exists.");
      return;
    }

    const existing = data.suppliers.find(
      (supplier) => supplier.id === editingId,
    );
    const supplier = {
      id: editingId || crypto.randomUUID(),
      name,
      contactName: draft.contactName.trim(),
      phone: draft.phone.trim(),
      email,
      address: draft.address.trim(),
      inventoryItemIds: [...new Set(draft.inventoryItemIds)].filter((id) =>
        data.items.some((item) => item.id === id),
      ),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const suppliers = existing
      ? data.suppliers.map((item) =>
          item.id === editingId ? supplier : item,
        )
      : [supplier, ...data.suppliers];
    if (!save({ ...data, suppliers })) return;
    setEditorOpen(false);
    setEditingId(null);
    showSuccess(existing ? "Supplier updated" : "Supplier added");
  };

  const deleteSupplier = async (supplier) => {
    const result = await showConfirm({
      title: "Remove supplier?",
      text: `${supplier.name} will be removed from the supplier list.`,
      confirmText: "Remove",
      cancelText: "Keep supplier",
    });
    if (!result.isConfirmed) return;
    if (
      save({
        ...data,
        suppliers: data.suppliers.filter((item) => item.id !== supplier.id),
      })
    ) {
      showSuccess("Supplier removed");
    }
  };

  return (
    <PageFrame
      title="Suppliers"
      description="Keep supplier contact details available to the team for purchasing and restocking."
      state={state}
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openNewSupplier}
          className={primaryButtonClass}
        >
          Add supplier
        </button>
      </div>
      {data.suppliers.length === 0 ? (
        <EmptyState>No suppliers added yet.</EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.suppliers.map((supplier) => (
            <article
              key={supplier.id}
              className="rounded-xl border border-white/[0.08] bg-[#111116] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-base font-extrabold">
                    {supplier.name}
                  </h3>
                  {supplier.contactName && (
                    <p className="mb-0 mt-1 text-xs text-[#D1D1D6]">
                      Contact: {supplier.contactName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditSupplier(supplier)}
                    className={secondaryButtonClass}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSupplier(supplier)}
                    className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-400/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3 text-xs text-[#A1A1AA]">
                {supplier.phone && <p className="m-0">Phone: {supplier.phone}</p>}
                {supplier.email && <p className="m-0">Email: {supplier.email}</p>}
                {supplier.address && (
                  <p className="m-0 whitespace-pre-wrap">
                    Address: {supplier.address}
                  </p>
                )}
                <div className="border-t border-white/[0.06] pt-2">
                  <p className="m-0 font-bold text-[#D1D1D6]">
                    Supplied inventory items
                  </p>
                  {data.items.filter((item) =>
                    (supplier.inventoryItemIds || []).includes(item.id),
                  ).length > 0 ? (
                    <ul className="mb-0 mt-1 list-inside list-disc">
                      {data.items
                        .filter((item) =>
                          (supplier.inventoryItemIds || []).includes(item.id),
                        )
                        .map((item) => (
                          <li key={item.id}>
                            {item.name} ({item.unit})
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="mb-0 mt-1">No inventory items linked.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editorOpen && (
        <EditorModal
          title={editingId ? "Edit supplier" : "Add supplier"}
          onClose={() => setEditorOpen(false)}
        >
          <form onSubmit={saveSupplier} className="space-y-3">
            {[
              ["name", "Supplier name", true],
              ["contactName", "Contact person", false],
              ["phone", "Phone number", false],
              ["email", "Email address", false],
              ["address", "Address", false],
            ].map(([name, label, required]) => (
              <label
                key={name}
                className="block text-xs font-bold text-[#A1A1AA]"
              >
                {label}
                <input
                  type={name === "email" ? "email" : "text"}
                  value={draft[name]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [name]: event.target.value,
                    }))
                  }
                  className={inputClass}
                  required={required}
                  maxLength="200"
                />
              </label>
            ))}
            <fieldset className="rounded-lg border border-white/10 p-3">
              <legend className="px-1 text-xs font-bold text-[#A1A1AA]">
                Inventory items supplied
              </legend>
              {data.items.length > 0 ? (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {data.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-sm text-[#D1D1D6]"
                    >
                      <input
                        type="checkbox"
                        checked={draft.inventoryItemIds.includes(item.id)}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            inventoryItemIds: event.target.checked
                              ? [...current.inventoryItemIds, item.id]
                              : current.inventoryItemIds.filter(
                                  (id) => id !== item.id,
                                ),
                          }))
                        }
                        className="h-4 w-4 accent-[#E63946]"
                      />
                      <span>
                        {item.name} <span className="text-[#85858F]">({item.unit})</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-xs text-[#A1A1AA]">
                  No inventory items are available.{" "}
                  <Link
                    to="/staff/inventory/ingredients"
                    className="font-bold text-[#FF727D] underline"
                  >
                    Add inventory items
                  </Link>{" "}
                  before linking them to a supplier.
                </p>
              )}
            </fieldset>
            {error && (
              <p role="alert" className="m-0 text-xs font-semibold text-rose-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonClass}>
                Save supplier
              </button>
            </div>
          </form>
        </EditorModal>
      )}
    </PageFrame>
  );
}

const pageDetails = {
  recipes: {
    title: "Recipes",
    description:
      "Manage ingredient requirements and preparation notes for menu items.",
  },
  "stock-movements": {
    title: "Stock Movements",
    description:
      "Track incoming and outgoing stock and review inventory adjustments.",
  },
  suppliers: {
    title: "Suppliers",
    description: "Manage supplier names and contact information.",
  },
};

export default function AdminInventoryManagement({ view }) {
  const state = useInventoryData();
  const { title } = pageDetails[view] || pageDetails.recipes;

  if (state.loading || state.loadError) {
    return (
      <PageFrame
        title={title}
        description={pageDetails[view]?.description || pageDetails.recipes.description}
        state={state}
      >
        {null}
      </PageFrame>
    );
  }

  if (view === "stock-movements") return <StockMovementsPage state={state} />;
  if (view === "suppliers") return <SuppliersPage state={state} />;
  return <RecipesPage state={state} />;
}
