import { useEffect, useState } from "react";
import { readEmployees } from "../data/adminSettingsStorage";
import {
  deleteExpense,
  EXPENSES_UPDATED_EVENT,
  readExpenses,
  saveExpense,
} from "../data/expensesStorage";
import { formatMoney } from "../data/menuData";
import { showConfirm, showSuccess } from "../utils/swal";

const categories = [
  "Food & Ingredients",
  "Packaging",
  "Utilities",
  "Rent",
  "Transportation",
  "Salaries & Labor",
  "Maintenance",
  "Marketing",
  "Other",
];
const receiptTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxReceiptSize = 5 * 1024 * 1024;
const inputClass =
  "mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]/60";

function localDateValue(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function createId() {
  return globalThis.crypto?.randomUUID?.()
    || `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readReceiptFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The receipt could not be read."));
        return;
      }
      resolve({
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.onerror = () => reject(new Error("The receipt could not be read."));
    reader.readAsDataURL(file);
  });
}

function formatExpenseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function createEmptyDraft() {
  return {
    category: categories[0],
    customCategory: "",
    amount: "",
    description: "",
    date: localDateValue(),
    employeeId: "",
    employeeName: "",
  };
}

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeLoadError, setEmployeeLoadError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [draft, setDraft] = useState(createEmptyDraft);
  const [receiptFile, setReceiptFile] = useState(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadExpenses = async () => {
      try {
        const saved = await readExpenses();
        if (active) {
          setExpenses(saved.sort((left, right) => right.date.localeCompare(left.date)));
          setLoadError("");
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load expenses.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    const loadSavedEmployees = async () => {
      try {
        const saved = await readEmployees();
        if (active) {
          setEmployees(saved);
          setEmployeeLoadError("");
        }
      } catch (error) {
        if (active) {
          setEmployeeLoadError(
            error instanceof Error ? error.message : "Unable to load employees.",
          );
        }
      }
    };
    const syncExpenses = () => loadExpenses();
    loadExpenses();
    loadSavedEmployees();
    window.addEventListener(EXPENSES_UPDATED_EVENT, syncExpenses);
    return () => {
      active = false;
      window.removeEventListener(EXPENSES_UPDATED_EVENT, syncExpenses);
    };
  }, []);

  const openNewExpense = () => {
    setEditingExpense(null);
    setDraft(createEmptyDraft());
    setReceiptFile(null);
    setRemoveReceipt(false);
    setFormError("");
    setEditorOpen(true);
  };

  const openEditExpense = (expense) => {
    const hasEmployee = employees.some((employee) => employee.id === expense.employeeId);
    setEditingExpense(expense);
    setDraft({
      category: categories.includes(expense.category) ? expense.category : "Other",
      customCategory: categories.includes(expense.category) ? "" : expense.category,
      amount: String(expense.amount),
      description: expense.description,
      date: expense.date,
      employeeId: hasEmployee ? expense.employeeId : "manual",
      employeeName: expense.employeeName || "",
    });
    setReceiptFile(null);
    setRemoveReceipt(false);
    setFormError("");
    setEditorOpen(true);
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    const amount = Number(draft.amount);
    const category = (
      draft.category === "Other" ? draft.customCategory : draft.category
    ).trim();
    const employee = employees.find(
      (item) => item.id === draft.employeeId,
    );
    const employeeName = employee?.name || draft.employeeName.trim();
    if (!category) {
      setFormError("Choose or enter an expense category.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (!draft.description.trim()) {
      setFormError("Enter a description for this expense.");
      return;
    }
    if (!draft.date) {
      setFormError("Choose the expense date.");
      return;
    }
    if (!employeeName) {
      setFormError("Select or enter the responsible employee.");
      return;
    }

    setSaving(true);
    setFormError("");
    setSaveError("");
    try {
      const receipt = receiptFile
        ? await readReceiptFile(receiptFile)
        : removeReceipt
          ? null
          : editingExpense?.receipt || null;
      const now = new Date().toISOString();
      const nextExpense = {
        id: editingExpense?.id || createId(),
        category,
        amount,
        description: draft.description.trim(),
        date: draft.date,
        employeeId: employee?.id || "",
        employeeName,
        receipt,
        createdAt: editingExpense?.createdAt || now,
        updatedAt: now,
      };
      await saveExpense(nextExpense);
      setExpenses((current) => [
        nextExpense,
        ...current.filter((item) => item.id !== nextExpense.id),
      ].sort((left, right) => right.date.localeCompare(left.date)));
      setEditorOpen(false);
      showSuccess(editingExpense ? "Expense updated" : "Expense recorded");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The expense could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (expense) => {
    const result = await showConfirm({
      title: "Delete expense?",
      text: `The ${expense.category} expense of ${formatMoney(expense.amount)} will be removed.`,
      confirmText: "Delete expense",
      cancelText: "Keep expense",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteExpense(expense.id);
      setExpenses((current) => current.filter((item) => item.id !== expense.id));
      showSuccess("Expense deleted");
      setSaveError("");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "The expense could not be deleted.",
      );
    }
  };

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0,
  );

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <header>
        <h2 className="m-0 text-2xl font-extrabold text-[#F5F5F5]">Expenses</h2>
        <p className="mb-0 mt-1 text-sm text-[#A1A1AA]">
          Record business expenses with a category, date, responsible employee,
          and optional receipt. Saved expenses are included in estimated net
          income in Sales Reports.
        </p>
      </header>

      {loadError && (
        <p role="alert" className="m-0 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
          Expenses could not be loaded: {loadError}
        </p>
      )}
      {saveError && (
        <p role="alert" className="m-0 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
          Expense changes could not be saved: {saveError}
        </p>
      )}
      {employeeLoadError && (
        <p role="alert" className="m-0 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">
          Employee records could not be loaded; enter the responsible employee
          manually. {employeeLoadError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
        <div>
          <p className="mb-1 text-xs font-bold text-[#A1A1AA]">All recorded expenses</p>
          <p className="m-0 text-2xl font-extrabold">{formatMoney(totalExpenses)}</p>
        </div>
        <button
          type="button"
          onClick={openNewExpense}
          disabled={loading || Boolean(loadError)}
          className="min-h-10 rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Record expense
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-8 text-center text-sm text-[#A1A1AA]">
          Loading expenses…
        </div>
      ) : !loadError && expenses.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#111116] px-5 py-10 text-center">
          <p className="m-0 text-sm font-bold text-[#D1D1D6]">No expenses recorded yet.</p>
        </div>
      ) : !loadError ? (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-[#141419]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs text-[#85858F]">
              <tr>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Description</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
                <th className="px-4 py-3 font-bold">Employee</th>
                <th className="px-4 py-3 font-bold">Receipt</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-white/[0.06]">
                  <td className="whitespace-nowrap px-4 py-3 text-[#A1A1AA]">
                    {formatExpenseDate(expense.date)}
                  </td>
                  <td className="px-4 py-3">{expense.category}</td>
                  <td className="max-w-[260px] px-4 py-3">{expense.description}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                    {formatMoney(expense.amount)}
                  </td>
                  <td className="px-4 py-3">{expense.employeeName}</td>
                  <td className="px-4 py-3">
                    {expense.receipt ? (
                      <a
                        href={expense.receipt.dataUrl}
                        download={expense.receipt.name}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-[#FF727D] underline"
                      >
                        {expense.receipt.name}
                      </a>
                    ) : (
                      <span className="text-[#777781]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditExpense(expense)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#D1D1D6] hover:bg-white/[0.05]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExpense(expense)}
                        className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editorOpen && (
        <div
          className="mobile-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setEditorOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="expenseEditorTitle"
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-2xl sm:p-6"
          >
            <h3 id="expenseEditorTitle" className="mb-5 mt-0 text-lg font-extrabold">
              {editingExpense ? "Edit expense" : "Record expense"}
            </h3>
            <form onSubmit={submitExpense} className="space-y-3">
              <label className="block text-xs font-bold text-[#A1A1AA]">
                Category
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  className={inputClass}
                  required
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              {draft.category === "Other" && (
                <label className="block text-xs font-bold text-[#A1A1AA]">
                  Custom category
                  <input
                    value={draft.customCategory}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        customCategory: event.target.value,
                      }))
                    }
                    className={inputClass}
                    maxLength="80"
                    required
                  />
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-[#A1A1AA]">
                  Amount (₱)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={draft.amount}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, amount: event.target.value }))
                    }
                    className={inputClass}
                    required
                  />
                </label>
                <label className="block text-xs font-bold text-[#A1A1AA]">
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, date: event.target.value }))
                    }
                    className={inputClass}
                    required
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-[#A1A1AA]">
                Description
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={inputClass}
                  rows="3"
                  maxLength="500"
                  required
                />
              </label>
              {employees.length > 0 && (
                <label className="block text-xs font-bold text-[#A1A1AA]">
                  Responsible employee
                  <select
                    value={draft.employeeId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        employeeId: event.target.value,
                        employeeName: "",
                      }))
                    }
                    className={inputClass}
                    required={draft.employeeId !== "manual"}
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
              {(!employees.length || draft.employeeId === "manual") && (
                <label className="block text-xs font-bold text-[#A1A1AA]">
                  Responsible employee
                  <input
                    value={draft.employeeName}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        employeeName: event.target.value,
                      }))
                    }
                    className={inputClass}
                    maxLength="120"
                    required
                  />
                </label>
              )}
              <label className="block text-xs font-bold text-[#A1A1AA]">
                Receipt <span className="font-normal text-[#777781]">(optional, PDF or image up to 5 MB)</span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setFormError("");
                    if (file && !receiptTypes.includes(file.type)) {
                      setFormError("Choose a PDF, JPEG, PNG, or WebP receipt.");
                      setReceiptFile(null);
                      event.target.value = "";
                      return;
                    }
                    if (file && file.size > maxReceiptSize) {
                      setFormError("Receipt files must be 5 MB or smaller.");
                      setReceiptFile(null);
                      event.target.value = "";
                      return;
                    }
                    setReceiptFile(file);
                    setRemoveReceipt(false);
                  }}
                  className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white`}
                />
              </label>
              {(receiptFile || (!removeReceipt && editingExpense?.receipt)) && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[#D1D1D6]">
                  <span className="truncate">
                    {receiptFile?.name || editingExpense.receipt.name}
                  </span>
                  {editingExpense?.receipt && !receiptFile && !removeReceipt && (
                    <button
                      type="button"
                      onClick={() => setRemoveReceipt(true)}
                      className="shrink-0 font-bold text-rose-300"
                    >
                      Remove receipt
                    </button>
                  )}
                </div>
              )}
              {formError && (
                <p role="alert" className="m-0 text-xs font-semibold text-rose-300">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  disabled={saving}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-[#A1A1AA] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save expense"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
