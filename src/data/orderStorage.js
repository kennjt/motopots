export const ORDERS_STORAGE_KEY = "motopots-orders";
export const ORDERS_UPDATED_EVENT = "motopots-orders-updated";

const orderDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getManilaDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = orderDateFormatter.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value;
  return `${getPart("year")}${getPart("month")}${getPart("day")}`;
}

export function createOrderId(orders, date = new Date()) {
  const dateKey = getManilaDateKey(date);
  if (!dateKey) throw new Error("Unable to create an order ID for this date.");

  const datePrefix = dateKey.slice(4);
  let ordersToday = 0;
  let highestSequence = 0;

  orders.forEach((order) => {
    const id = String(order.id);
    const sequenceMatch = id.match(new RegExp(`^${datePrefix}(\\d{2,})$`));
    const orderDate =
      order.createdAt ||
      order.date ||
      (/^\d{10,13}$/.test(id) ? Number(id) : null);
    const orderDateKey = orderDate ? getManilaDateKey(orderDate) : null;
    const matchesToday = orderDateKey
      ? orderDateKey === dateKey
      : Boolean(sequenceMatch);

    if (!matchesToday) return;

    ordersToday += 1;
    if (sequenceMatch) {
      highestSequence = Math.max(
        highestSequence,
        Number(sequenceMatch[1]),
      );
    }
  });

  const sequence = Math.max(ordersToday, highestSequence) + 1;
  return `${datePrefix}${String(sequence).padStart(2, "0")}`;
}

export function formatOrderId(id) {
  const value = String(id);
  return /^\d{13}$/.test(value) ? value.slice(-6) : value;
}

export function readOrders() {
  try {
    const savedOrders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || "[]");
    return Array.isArray(savedOrders) ? savedOrders : [];
  } catch (error) {
    console.error("Unable to read saved orders.", error);
    return [];
  }
}

export function saveOrders(orders) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
}

export function recordOrderStatus(order, status, details = {}) {
  const options = typeof details === "string" ? { timestamp: details } : details;
  const timestamp = options.timestamp || new Date().toISOString();
  const changedBy =
    typeof options.changedBy === "string" ? options.changedBy.trim() : "";
  const remarks =
    typeof options.remarks === "string" ? options.remarks.trim() : "";
  const currentStatus = order.orderStatus || order.status || "Pending";
  const savedHistory = Array.isArray(order.statusHistory)
    ? order.statusHistory.filter(
        (entry) => entry && typeof entry.status === "string",
      ).map((entry) => ({
        ...entry,
        changedBy:
          typeof entry.changedBy === "string"
            ? entry.changedBy
            : typeof entry.changedBy?.name === "string"
              ? entry.changedBy.name
              : "",
        remarks: typeof entry.remarks === "string" ? entry.remarks : "",
      }))
    : [];
  const history = [...savedHistory];
  if (!history.length) {
    history.push(
      status === currentStatus
        ? { status, timestamp, changedBy, remarks }
        : { status: currentStatus, timestamp: null, changedBy: "", remarks: "" },
    );
  }
  const lastStatus = history[history.length - 1]?.status;
  if (lastStatus !== status) {
    history.push({ status, timestamp, changedBy, remarks });
  }

  return {
    ...order,
    status,
    orderStatus: status,
    statusHistory: history,
  };
}
