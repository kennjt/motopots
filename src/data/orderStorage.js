export const ORDERS_STORAGE_KEY = "motopots-orders";
export const ORDERS_UPDATED_EVENT = "motopots-orders-updated";

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
