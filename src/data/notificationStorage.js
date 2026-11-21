export const OPERATIONAL_NOTICES_KEY = "motopots-operational-notices";
export const NOTIFICATION_READ_STATE_KEY = "motopots-notification-read-state";
export const NOTIFICATIONS_UPDATED_EVENT = "motopots-notifications-updated";

const audiences = ["all", "customers", "admins"];

function validateNotice(notice) {
  if (
    !notice
    || typeof notice.id !== "string"
    || typeof notice.title !== "string"
    || !notice.title.trim()
    || typeof notice.message !== "string"
    || !notice.message.trim()
    || !audiences.includes(notice.audience)
    || typeof notice.createdAt !== "string"
    || typeof notice.active !== "boolean"
    || (
      notice.expiresAt !== null
      && notice.expiresAt !== undefined
      && (
        typeof notice.expiresAt !== "string"
        || !/^\d{4}-\d{2}-\d{2}$/.test(notice.expiresAt)
      )
    )
  ) {
    throw new Error("An operational notice has an invalid format.");
  }
}

export function readOperationalNotices() {
  const raw = localStorage.getItem(OPERATIONAL_NOTICES_KEY);
  if (raw === null) return [];
  const notices = JSON.parse(raw);
  if (!Array.isArray(notices)) {
    throw new Error("Saved operational notices have an invalid format.");
  }
  notices.forEach(validateNotice);
  return notices;
}

export function saveOperationalNotices(notices) {
  if (!Array.isArray(notices)) {
    throw new Error("Operational notices must be a list.");
  }
  notices.forEach(validateNotice);
  localStorage.setItem(OPERATIONAL_NOTICES_KEY, JSON.stringify(notices));
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

export function readNotificationReadState() {
  const raw = localStorage.getItem(NOTIFICATION_READ_STATE_KEY);
  if (raw === null) return { admin: [], customer: [] };
  const state = JSON.parse(raw);
  if (
    !state
    || typeof state !== "object"
    || Array.isArray(state)
    || !Array.isArray(state.admin)
    || !Array.isArray(state.customer)
    || state.admin.some((id) => typeof id !== "string")
    || state.customer.some((id) => typeof id !== "string")
  ) {
    throw new Error("Saved notification status has an invalid format.");
  }
  return state;
}

export function markNotificationsRead(audience, notificationIds) {
  if (!["admin", "customer"].includes(audience)) {
    throw new Error("A valid notification audience is required.");
  }
  if (
    !Array.isArray(notificationIds)
    || notificationIds.some((id) => typeof id !== "string")
  ) {
    throw new Error("Notification IDs must be a list of strings.");
  }

  const state = readNotificationReadState();
  state[audience] = [...new Set([...state[audience], ...notificationIds])];
  localStorage.setItem(NOTIFICATION_READ_STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}
