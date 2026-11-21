import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  INVENTORY_UPDATED_EVENT,
  INVENTORY_STORAGE_KEY,
  readInventoryState,
} from "../data/inventoryStorage";
import { readActiveCustomerProfile } from "../data/customerProfileStorage";
import {
  ORDERS_STORAGE_KEY,
  ORDERS_UPDATED_EVENT,
  formatOrderId,
  readOrders,
} from "../data/orderStorage";
import {
  markNotificationsRead,
  NOTIFICATIONS_UPDATED_EVENT,
  OPERATIONAL_NOTICES_KEY,
  readNotificationReadState,
  readOperationalNotices,
} from "../data/notificationStorage";

const STORE_STATUS_UPDATED = "motopots-store-status-updated";
const PROFILE_UPDATED = "motopots-profile-updated";

function getOrderStatus(order) {
  return order.orderStatus || order.status || "Pending";
}

function getCustomerName(order) {
  return typeof order.customer === "string"
    ? order.customer
    : order.customer?.name || "Customer";
}

function matchesCustomer(order, profile) {
  if (!profile) return false;
  const customer = typeof order.customer === "object" ? order.customer : {};
  const orderEmail = String(customer.email || "").trim().toLowerCase();
  const profileEmail = String(profile.email || "").trim().toLowerCase();
  if (orderEmail && profileEmail) return orderEmail === profileEmail;
  const orderName = getCustomerName(order).trim().toLowerCase();
  const profileName = String(profile.name || "").trim().toLowerCase();
  return Boolean(orderName && profileName && orderName === profileName);
}

function getDateKey(value = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(value))
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getInventoryLevel(item) {
  const stock = Number(item.stock);
  const threshold = Number(item.threshold);
  if (stock <= 0) return "Out of stock";
  if (threshold > 0 && stock <= threshold / 2) return "Critical low";
  if (threshold > 0 && stock <= threshold) return "Low stock";
  return null;
}

function buildNotifications(audience) {
  const notifications = [];
  const errors = [];
  let readIds = [];
  try {
    readIds = readNotificationReadState()[audience];
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Notification status could not be loaded.");
  }

  try {
    const today = getDateKey();
    readOperationalNotices()
      .filter((notice) => (
        notice.active
        && (!notice.expiresAt || notice.expiresAt >= today)
        && (
          notice.audience === "all"
          || (audience === "admin" && notice.audience === "admins")
          || (audience === "customer" && notice.audience === "customers")
        )
      ))
      .forEach((notice) => notifications.push({
        id: `notice:${notice.id}`,
        title: notice.title,
        message: notice.message,
        timestamp: notice.createdAt,
        href: null,
        type: "notice",
      }));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Operational notices could not be loaded.");
  }

  const orders = readOrders();
  if (audience === "admin") {
    orders.forEach((order) => {
      const status = getOrderStatus(order);
      if (status === "Cancellation Requested") {
        const requestAt = order.cancellationRequestedAt
          || order.statusHistory?.at(-1)?.timestamp
          || order.createdAt;
        notifications.push({
          id: `cancellation:${order.id}:${requestAt || "pending"}`,
          title: "Cancellation request",
          message: `Order #${formatOrderId(order.id)} from ${getCustomerName(order)} needs review.`,
          timestamp: requestAt,
          href: "/staff/orders/history",
          type: "urgent",
        });
      } else if (["Pending", "Pending Confirmation"].includes(status)) {
        notifications.push({
          id: `new-order:${order.id}`,
          title: "New order",
          message: `Order #${formatOrderId(order.id)} from ${getCustomerName(order)} is ${status.toLowerCase()}.`,
          timestamp: order.createdAt || order.date || "",
          href: "/staff/orders",
          type: "order",
        });
      }
    });

    try {
      const inventory = readInventoryState();
      inventory.items.forEach((item) => {
        const level = getInventoryLevel(item);
        if (!level) return;
        notifications.push({
          id: `stock:${item.id}:${level}`,
          title: level === "Out of stock" ? "Item out of stock" : `${level} inventory`,
          message: `${item.name}: ${item.stock} / ${item.capacity} ${item.unit}.`,
          timestamp: item.updatedAt || "",
          href: "/staff/inventory/ingredients",
          type: level === "Out of stock" || level === "Critical low"
            ? "urgent"
            : "warning",
        });
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Inventory alerts could not be loaded.");
    }
  } else {
    try {
      const profile = readActiveCustomerProfile();
      if (profile) {
        orders
          .filter((order) => matchesCustomer(order, profile))
          .forEach((order) => {
            const history = Array.isArray(order.statusHistory)
              ? order.statusHistory
              : [];
            history.forEach((entry, index) => {
              if (!entry || typeof entry.status !== "string") return;
              notifications.push({
                id: `order-update:${order.id}:${entry.timestamp || `${entry.status}:${index}`}`,
                title: `Order update: ${entry.status}`,
                message: `Order #${formatOrderId(order.id)}${entry.remarks ? ` · ${entry.remarks}` : ""}`,
                timestamp: entry.timestamp || "",
                href: "/customer/orders",
                type: entry.status === "Cancelled" ? "warning" : "order",
              });
            });
        });
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Customer order alerts could not be loaded.");
    }
  }

  notifications.sort(
    (left, right) =>
      (new Date(right.timestamp).getTime() || 0)
      - (new Date(left.timestamp).getTime() || 0),
  );
  return { notifications, readIds, error: errors.join(" ") };
}

function formatAlertDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export default function NotificationCenter({
  audience,
  manageNotices = false,
}) {
  const [snapshot, setSnapshot] = useState(() => buildNotifications(audience));
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const readSet = useMemo(() => new Set(snapshot.readIds), [snapshot.readIds]);
  const unreadCount = snapshot.notifications.filter(
    (item) => !readSet.has(item.id),
  ).length;

  useEffect(() => {
    const refresh = () => setSnapshot(buildNotifications(audience));
    const onStorage = (event) => {
      if (
        !event.key
        || [
          ORDERS_STORAGE_KEY,
          INVENTORY_STORAGE_KEY,
          OPERATIONAL_NOTICES_KEY,
          "motopots-profile",
          "motopots-notification-read-state",
          "motopots-store-status",
        ].includes(event.key)
      ) {
        refresh();
      }
    };
    const closeOnOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(ORDERS_UPDATED_EVENT, refresh);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
    window.addEventListener(INVENTORY_UPDATED_EVENT, refresh);
    window.addEventListener(STORE_STATUS_UPDATED, refresh);
    window.addEventListener(PROFILE_UPDATED, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ORDERS_UPDATED_EVENT, refresh);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener(INVENTORY_UPDATED_EVENT, refresh);
      window.removeEventListener(STORE_STATUS_UPDATED, refresh);
      window.removeEventListener(PROFILE_UPDATED, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [audience]);

  const markRead = (item) => {
    try {
      markNotificationsRead(audience, [item.id]);
      setSnapshot(buildNotifications(audience));
      setOpen(false);
      if (item.href) navigate(item.href);
    } catch (error) {
      setSnapshot((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Notification status could not be saved.",
      }));
    }
  };

  const markAllRead = () => {
    try {
      markNotificationsRead(
        audience,
        snapshot.notifications.map((item) => item.id),
      );
      setSnapshot(buildNotifications(audience));
    } catch (error) {
      setSnapshot((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Notification status could not be saved.",
      }));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#15151C] text-[#D1D1D6] transition hover:border-[#E63946]/40 hover:text-white"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E63946] px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section
          aria-label="Notifications"
          className="absolute right-0 z-[70] mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#15151C]/[0.98] shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#22222B]/70 px-4 py-3">
            <h2 className="m-0 text-sm font-extrabold text-[#F5F5F5]">
              Notifications
            </h2>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
              className="text-xs font-bold text-[#FF929A] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          {snapshot.error && (
            <p role="alert" className="m-0 border-b border-white/[0.06] bg-rose-400/10 px-4 py-3 text-xs text-rose-200">
              Some alerts could not be loaded: {snapshot.error}
            </p>
          )}
          <div className="max-h-[min(65vh,28rem)] overflow-y-auto p-2">
            {snapshot.notifications.length ? (
              <ul className="m-0 list-none space-y-1 p-0">
                {snapshot.notifications.map((item) => {
                  const unread = !readSet.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => markRead(item)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          unread
                            ? "border-[#E63946]/20 bg-[#E63946]/[0.07]"
                            : "border-transparent hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              item.type === "urgent"
                                ? "bg-rose-400"
                                : item.type === "warning"
                                  ? "bg-amber-300"
                                  : item.type === "notice"
                                    ? "bg-sky-300"
                                    : "bg-[#FF727D]"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-extrabold text-[#F5F5F5]">
                              {item.title}
                            </span>
                            <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-[#B8B8C0]">
                              {item.message}
                            </span>
                            {formatAlertDate(item.timestamp) && (
                              <time className="mt-1.5 block text-[10px] text-[#777781]">
                                {formatAlertDate(item.timestamp)}
                              </time>
                            )}
                          </span>
                          {unread && (
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF727D]" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="m-0 px-3 py-8 text-center text-sm text-[#A1A1AA]">
                You&apos;re all caught up.
              </p>
            )}
          </div>
          {manageNotices && (
            <div className="border-t border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/staff/notifications");
                }}
                className="text-xs font-extrabold text-[#FF929A] hover:text-white"
              >
                Manage operational notices
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
