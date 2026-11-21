import { openAdminDatabase } from "./adminDatabase";

export const EXPENSES_UPDATED_EVENT = "motopots-expenses-updated";
const EXPENSES_STORE = "expenses";
const RECEIPT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function validateExpense(expense) {
  if (
    !expense
    || typeof expense.id !== "string"
    || typeof expense.category !== "string"
    || !expense.category.trim()
    || !Number.isFinite(Number(expense.amount))
    || Number(expense.amount) <= 0
    || typeof expense.description !== "string"
    || !expense.description.trim()
    || typeof expense.date !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date)
    || Number.isNaN(new Date(`${expense.date}T00:00:00Z`).getTime())
    || new Date(`${expense.date}T00:00:00Z`).toISOString().slice(0, 10) !== expense.date
    || typeof expense.employeeName !== "string"
    || !expense.employeeName.trim()
    || (
      expense.receipt !== null
      && expense.receipt !== undefined
      && (
        typeof expense.receipt.name !== "string"
        || !RECEIPT_TYPES.includes(expense.receipt.type)
        || typeof expense.receipt.dataUrl !== "string"
        || !expense.receipt.dataUrl.startsWith(
          `data:${expense.receipt.type};base64,`,
        )
      )
    )
  ) {
    throw new Error("The expense record has an invalid format.");
  }
}

async function runExpenseStore(mode, operation) {
  const database = await openAdminDatabase();
  return new Promise((resolve, reject) => {
    let result;
    let transaction;

    try {
      transaction = database.transaction(EXPENSES_STORE, mode);
      const request = operation(transaction.objectStore(EXPENSES_STORE));
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => {
        reject(request.error || new Error("Unable to access expense records."));
      };
    } catch (error) {
      database.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("The expense transaction failed."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("The expense transaction was aborted."));
    };
  });
}

export async function readExpenses() {
  const records = await runExpenseStore("readonly", (store) => store.getAll());
  if (!Array.isArray(records)) {
    throw new Error("Saved expense records could not be read.");
  }
  records.forEach(validateExpense);
  return records;
}

export async function saveExpense(expense) {
  validateExpense(expense);
  await runExpenseStore("readwrite", (store) => store.put(expense));
  window.dispatchEvent(new Event(EXPENSES_UPDATED_EVENT));
}

export async function deleteExpense(id) {
  if (typeof id !== "string" || !id) {
    throw new Error("A valid expense ID is required.");
  }
  await runExpenseStore("readwrite", (store) => store.delete(id));
  window.dispatchEvent(new Event(EXPENSES_UPDATED_EVENT));
}
