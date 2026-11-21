import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  ClipboardList,
  Clock3,
  Package,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import { formatMoney, menuItems } from "../data/menuData";
import {
  ORDERS_STORAGE_KEY,
  ORDERS_UPDATED_EVENT,
  formatOrderId,
  readOrders,
} from "../data/orderStorage";
import { readSchedule, readStoreStatus } from "../data/adminSettingsStorage";
import { ImageWithSkeleton } from "./Skeleton";

const BUSINESS_TIME_ZONE = "Asia/Manila";
const SCHEDULE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const datePartsFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "long",
});
const hourFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});
const orderDateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: BUSINESS_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

function getBusinessDateParts(value) {
  const parts = Object.fromEntries(
    datePartsFormatter.formatToParts(value).map(({ type, value: part }) => [type, part]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
  };
}

function makeDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getBusinessDateKey(value) {
  const parts = getBusinessDateParts(value);
  return makeDateKey(parts.year, parts.month, parts.day);
}

function shiftDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return makeDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function formatScheduleTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function getOrderDate(order) {
  const value = new Date(order.createdAt || order.date || order.id);
  return Number.isNaN(value.getTime()) ? null : value;
}

function getOrderStatus(order) {
  return order.orderStatus || order.status || "Pending";
}

function getOrderRevenue(order) {
  if (getOrderStatus(order) === "Cancelled") return 0;
  const total = Number(order.total || 0);
  const refund = Number(order.refundAmount ?? order.refundedAmount ?? 0);
  const adjustment = Number(order.adjustmentAmount ?? 0);
  return Math.max(0, total - refund + adjustment);
}

function getCustomerName(order) {
  if (typeof order.customer === "string") return order.customer;
  return order.customer?.name || "Guest customer";
}

function getOrderId(order) {
  return `#${order.id === undefined || order.id === null ? "—" : formatOrderId(order.id)}`;
}

function getItemRevenue(item) {
  const quantity = Number(item.quantity || 0);
  return Number(
    item.subtotal ?? (item.finalUnitPrice ?? item.price ?? 0) * quantity,
  );
}

function getPeriodRange(period, todayParts) {
  const todayKey = makeDateKey(todayParts.year, todayParts.month, todayParts.day);
  if (period === "daily") {
    return {
      start: todayKey,
      end: todayKey,
      previousStart: shiftDateKey(todayKey, -1),
      previousEnd: shiftDateKey(todayKey, -1),
    };
  }
  if (period === "weekly") {
    return {
      start: shiftDateKey(todayKey, -6),
      end: todayKey,
      previousStart: shiftDateKey(todayKey, -13),
      previousEnd: shiftDateKey(todayKey, -7),
    };
  }

  const previousMonthDate = new Date(
    Date.UTC(todayParts.year, todayParts.month - 2, 1),
  );
  const previousMonthYear = previousMonthDate.getUTCFullYear();
  const previousMonth = previousMonthDate.getUTCMonth() + 1;
  const previousMonthDays = new Date(
    Date.UTC(previousMonthYear, previousMonth, 0),
  ).getUTCDate();
  return {
    start: makeDateKey(todayParts.year, todayParts.month, 1),
    end: todayKey,
    previousStart: makeDateKey(previousMonthYear, previousMonth, 1),
    previousEnd: makeDateKey(
      previousMonthYear,
      previousMonth,
      Math.min(todayParts.day, previousMonthDays),
    ),
  };
}

function getOrdersInRange(orders, start, end) {
  return orders.filter((order) => {
    const date = getOrderDate(order);
    if (!date) return false;
    const key = getBusinessDateKey(date);
    return key >= start && key <= end;
  });
}

function getChartBins(period, orders, range, todayParts) {
  if (period === "daily") {
    const hourlySales = Array(24).fill(0);
    getOrdersInRange(orders, range.start, range.end).forEach((order) => {
      const date = getOrderDate(order);
      if (!date) return;
      const hour = Number(hourFormatter.format(date));
      if (hour >= 0 && hour < 24) hourlySales[hour] += getOrderRevenue(order);
    });
    return hourlySales.map((amount, hour) => ({
      amount,
      label: hour % 3 === 0 ? `${hour % 12 || 12}${hour < 12 ? "a" : "p"}` : "",
      title: `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`,
    }));
  }

  if (period === "weekly") {
    return Array.from({ length: 7 }, (_, index) => {
      const key = shiftDateKey(range.end, index - 6);
      const date = new Date(`${key}T12:00:00Z`);
      const amount = getOrdersInRange(orders, key, key).reduce(
        (total, order) => total + getOrderRevenue(order),
        0,
      );
      return {
        amount,
        label: date.toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }),
        title: date.toLocaleDateString("en-PH", {
          weekday: "long",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      };
    });
  }

  return Array.from({ length: todayParts.day }, (_, index) => {
    const day = index + 1;
    const key = makeDateKey(todayParts.year, todayParts.month, day);
    const amount = getOrdersInRange(orders, key, key).reduce(
      (total, order) => total + getOrderRevenue(order),
      0,
    );
    return {
      amount,
      label: day === 1 || day % 5 === 0 || day === todayParts.day ? String(day) : "",
      title: `${todayParts.month}/${day}`,
    };
  });
}

function OverviewIcon({ name, className = "h-5 w-5" }) {
  const icons = {
    revenue: Wallet,
    orders: ClipboardList,
    pending: Clock3,
    completed: CircleCheck,
    inventory: Package,
    arrow: ArrowRight,
    alert: AlertTriangle,
    store: Store,
  };
  const Icon = icons[name] || Package;
  return <Icon aria-hidden="true" focusable="false" className={className} strokeWidth={1.8} />;
}

function StatusBadge({ children, tone }) {
  const tones = {
    green: "bg-emerald-400/10 text-emerald-300 ring-emerald-300/20",
    amber: "bg-amber-400/10 text-amber-200 ring-amber-300/20",
    red: "bg-rose-400/10 text-[#FF727D] ring-[#E63946]/25",
    slate: "bg-white/[0.05] text-[#C3C3CA] ring-white/[0.08]",
    blue: "bg-sky-400/10 text-sky-300 ring-sky-300/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

function getOrderStatusTone(status) {
  if (status === "Completed") return "green";
  if (status === "Cancelled") return "red";
  if (status === "Pending") return "amber";
  if (status === "Preparing" || status === "Ready for Pickup") return "blue";
  return "slate";
}

function getPaymentStatusTone(status) {
  if (/paid|verified/i.test(status)) return "green";
  if (/pending|unpaid/i.test(status)) return "amber";
  if (/failed|declined|rejected/i.test(status)) return "red";
  return "slate";
}

function SummaryCard({ title, value, note, icon, tone, to }) {
  const colors = {
    blue: "bg-sky-400/10 text-sky-300",
    green: "bg-emerald-400/10 text-emerald-300",
    amber: "bg-amber-400/10 text-amber-200",
    slate: "bg-white/[0.06] text-[#C3C3CA]",
    rose: "bg-[#E63946]/10 text-[#FF727D]",
  };
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-sm font-bold text-[#C3C3CA]">{title}</p>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[tone]}`}>
          <OverviewIcon name={icon} />
        </span>
      </div>
      <p className="mb-0 mt-5 text-3xl font-extrabold tracking-tight text-[#F5F5F5]">{value}</p>
      <p className="mb-0 mt-1.5 text-xs font-medium text-[#85858F]">{note}</p>
    </>
  );
  const className = "block rounded-2xl border border-white/[0.07] bg-[#141419] p-4 shadow-sm shadow-black/10 transition sm:p-5";
  return to
    ? <Link to={to} className={`${className} no-underline hover:border-[#E63946]/40 hover:bg-[#18181F] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E63946]`}>{content}</Link>
    : <article className={className}>{content}</article>;
}

function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`mp-skeleton ${className}`} />;
}

export default function AdminOverview() {
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [storeStatus, setStoreStatus] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [scheduleError, setScheduleError] = useState("");
  const [period, setPeriod] = useState("weekly");
  const [now, setNow] = useState(() => new Date());
  const todayParts = getBusinessDateParts(now);
  const todayKey = makeDateKey(todayParts.year, todayParts.month, todayParts.day);
  const todayLabel = now.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });

  useEffect(() => {
    const syncOrders = (event) => {
      if (!event?.key || event.key === ORDERS_STORAGE_KEY) {
        setOrders(readOrders());
        setOrdersLoading(false);
      }
    };
    syncOrders();
    window.addEventListener("storage", syncOrders);
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    return () => {
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([readStoreStatus(), readSchedule()])
      .then(([savedStatus, savedSchedule]) => {
        if (!active) return;
        setStoreStatus(savedStatus);
        setSchedule(savedSchedule);
      })
      .catch((error) => {
        console.error("Unable to load dashboard store information.", error);
        if (active) setScheduleError("Store hours are temporarily unavailable.");
      });
    const syncStatus = (event) => {
      if (!event?.key || event.key === "motopots-store-status") {
        readStoreStatus().then((savedStatus) => {
          if (active) setStoreStatus(savedStatus);
        });
      }
    };
    const syncSchedule = () => {
      readSchedule()
        .then((savedSchedule) => {
          if (!active) return;
          setSchedule(savedSchedule);
          setScheduleError("");
        })
        .catch((error) => {
          console.error("Unable to refresh dashboard operating hours.", error);
          if (active) setScheduleError("Store hours are temporarily unavailable.");
        });
    };
    window.addEventListener("storage", syncStatus);
    window.addEventListener("motopots-settings-updated", syncSchedule);
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      active = false;
      window.clearInterval(clock);
      window.removeEventListener("storage", syncStatus);
      window.removeEventListener("motopots-settings-updated", syncSchedule);
    };
  }, []);

  const todayOrders = useMemo(
    () => orders.filter((order) => {
      const date = getOrderDate(order);
      return date && getBusinessDateKey(date) === todayKey;
    }),
    [orders, todayKey],
  );
  const pendingOrders = useMemo(
    () => orders.filter((order) => getOrderStatus(order) === "Pending"),
    [orders],
  );
  const completedToday = useMemo(
    () => orders.filter((order) => {
      if (getOrderStatus(order) !== "Completed" || !order.completedAt) return false;
      const completedDate = new Date(order.completedAt);
      return !Number.isNaN(completedDate.getTime()) &&
        getBusinessDateKey(completedDate) === todayKey;
    }),
    [orders, todayKey],
  );
  const todayRevenue = todayOrders.reduce(
    (total, order) => total + getOrderRevenue(order),
    0,
  );

  const periodData = useMemo(() => {
    const range = getPeriodRange(period, todayParts);
    const currentOrders = getOrdersInRange(orders, range.start, range.end);
    const previousOrders = getOrdersInRange(orders, range.previousStart, range.previousEnd);
    const total = currentOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
    const previousTotal = previousOrders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
    const bins = getChartBins(period, orders, range, todayParts);
    return { range, total, previousTotal, bins };
  }, [orders, period, todayParts]);

  const bestSellingItems = useMemo(() => {
    const { start, end } = periodData.range;
    const quantityByProduct = new Map();
    getOrdersInRange(orders, start, end)
      .filter((order) => getOrderStatus(order) !== "Cancelled")
      .forEach((order) => {
        (Array.isArray(order.items) ? order.items : []).forEach((item) => {
          const key = item.productId || item.name;
          if (!key) return;
          const quantity = Number(item.quantity || 0);
          const savedProduct = menuItems.find(
            (product) => product.id === item.productId || product.name === item.name,
          );
          const current = quantityByProduct.get(key) || {
            name: item.name || savedProduct?.name || "Menu item",
            image: item.image || savedProduct?.image,
            quantity: 0,
            revenue: 0,
          };
          current.quantity += quantity;
          current.revenue += getItemRevenue(item);
          quantityByProduct.set(key, current);
        });
      });
    return [...quantityByProduct.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5);
  }, [orders, periodData.range]);

  const recentOrders = useMemo(
    () => [...orders]
      .sort((left, right) => (getOrderDate(right)?.getTime() || 0) - (getOrderDate(left)?.getTime() || 0))
      .slice(0, 7),
    [orders],
  );

  const paymentReviewOrders = useMemo(
    () => orders.filter((order) => /pending verification|failed|declined|rejected/i.test(order.paymentStatus || "")),
    [orders],
  );
  const pendingWithoutPaymentReview = pendingOrders.filter(
    (order) => !paymentReviewOrders.some((paymentOrder) => paymentOrder.id === order.id),
  );

  const scheduleForToday = schedule?.[todayParts.weekday];
  const todayHours = scheduleForToday?.enabled
    ? `${formatScheduleTime(scheduleForToday.opening)} – ${formatScheduleTime(scheduleForToday.closing)}`
    : scheduleForToday ? "Closed today" : "Hours not set";
  const salesMax = Math.max(...periodData.bins.map((bin) => bin.amount), 1);
  const salesPeriodLabel = {
    daily: "Today",
    weekly: "Last 7 days",
    monthly: "Month to date",
  }[period];
  const comparisonLabel = {
    daily: "vs yesterday",
    weekly: "vs previous 7 days",
    monthly: "vs same period last month",
  }[period];
  const trend = periodData.previousTotal > 0
    ? ((periodData.total - periodData.previousTotal) / periodData.previousTotal) * 100
    : null;

  const attentionItems = [];
  if (pendingWithoutPaymentReview.length) {
    attentionItems.push({
      key: "pending",
      title: `${pendingWithoutPaymentReview.length} pending ${pendingWithoutPaymentReview.length === 1 ? "order" : "orders"}`,
      description: "Review and process orders waiting for administrator attention.",
      to: "/staff/orders",
      action: "Review orders",
      tone: "amber",
    });
  }
  if (paymentReviewOrders.length) {
    attentionItems.push({
      key: "payments",
      title: `${paymentReviewOrders.length} ${paymentReviewOrders.length === 1 ? "payment" : "payments"} need review`,
      description: "Payment verification or payment failure needs follow-up.",
      to: "/staff/orders",
      action: "Check orders",
      tone: "rose",
    });
  }
  if (storeStatus === "closed") {
    attentionItems.push({
      key: "store",
      title: "Store is closed",
      description: `Current schedule: ${todayHours}. Review availability if this is unexpected.`,
      to: "/staff/store-availability",
      action: "Review store status",
      tone: "slate",
    });
  }

  const summaryCards = [
    {
      title: "Today's Revenue",
      value: formatMoney(todayRevenue),
      note: "Valid orders · cancellations excluded",
      icon: "revenue",
      tone: "blue",
      to: "/staff/performance",
    },
    {
      title: "Total Orders Today",
      value: todayOrders.length,
      note: "Orders received today",
      icon: "orders",
      tone: "slate",
      to: "/staff/orders",
    },
    {
      title: "Pending Orders",
      value: pendingOrders.length,
      note: "Require administrator attention",
      icon: "pending",
      tone: "amber",
      to: "/staff/orders",
    },
    {
      title: "Completed Today",
      value: completedToday.length,
      note: "Based on recorded completion times",
      icon: "completed",
      tone: "green",
      to: "/staff/order-history",
    },
    {
      title: "Low Stock Alerts",
      value: "—",
      note: "Stock thresholds are not tracked",
      icon: "inventory",
      tone: "rose",
      to: "/staff/inventory",
    },
  ];

  return (
    <main className="-mx-4 -my-5 bg-[var(--color-primary-bg)] p-4 text-[var(--color-primary-text)] sm:-mx-7 sm:p-7 lg:-mx-8 lg:p-8">
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[1.4px] text-[#FF727D]">Business overview</p>
            <h2 className="m-0 text-2xl font-extrabold tracking-tight text-[#F5F5F5] sm:text-3xl">Dashboard</h2>
            <p className="mb-0 mt-1 text-sm text-[#A1A1AA]">Welcome back. Here&apos;s your store&apos;s latest activity.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
            <p className="m-0 text-sm font-semibold text-[#A1A1AA]">{todayLabel}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E63946]/25 bg-[#E63946]/[0.07] px-3 py-1.5 text-[11px] font-extrabold tracking-[0.12em] text-[#FF929A]">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
              ADMINISTRATOR
            </span>
          </div>
        </header>

        <section aria-label="Store status" className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#141419] px-4 py-4 shadow-sm shadow-black/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${storeStatus === "closed" ? "bg-[#E63946]/10 text-[#FF727D]" : "bg-emerald-400/10 text-emerald-300"}`}>
              <OverviewIcon name="store" />
            </span>
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-[#85858F]">Store status</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {storeStatus === null ? <Skeleton className="h-5 w-24" /> : (
                  <StatusBadge tone={storeStatus === "open" ? "green" : "red"}>
                    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${storeStatus === "open" ? "bg-emerald-300" : "bg-[#FF727D]"}`} />
                    {storeStatus === "open" ? "Open" : "Closed"}
                  </StatusBadge>
                )}
                <span className="text-xs font-medium text-[#A1A1AA]">Admin-controlled status</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-white/[0.07] pt-3 text-xs sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <span className="font-bold text-[#D1D1D6]">Today&apos;s hours</span>
            <span className="text-[#A1A1AA]">{scheduleError || todayHours}</span>
          </div>
        </section>

        <section aria-labelledby="weekly-hours-heading" className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 shadow-sm shadow-black/10 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="weekly-hours-heading" className="m-0 text-sm font-bold text-[#D1D1D6]">Shop Operating Hours</h2>
            <Link to="/staff/settings" className="text-xs font-semibold text-[#FF929A] no-underline hover:text-white">Manage hours</Link>
          </div>
          {scheduleError ? (
            <p className="m-0 text-sm text-[#A1A1AA]">{scheduleError}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {SCHEDULE_DAYS.map((day) => {
                const entry = schedule?.[day];
                const hours = entry
                  ? entry.enabled
                    ? `${formatScheduleTime(entry.opening)} – ${formatScheduleTime(entry.closing)}`
                    : "Closed"
                  : "Hours not set";
                return (
                  <div key={day} className="rounded-xl border border-white/[0.06] bg-[#101016] px-3 py-2.5">
                    <p className="m-0 text-xs font-semibold text-[#A1A1AA]">{day}</p>
                    <p className="mb-0 mt-1 text-xs font-bold text-white">{hours}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label="Business statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ordersLoading
            ? summaryCards.map((card) => <div key={card.title} className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 shadow-sm shadow-black/10 sm:p-5"><Skeleton className="h-5 w-32" /><Skeleton className="mt-5 h-8 w-24" /><Skeleton className="mt-2 h-4 w-40" /></div>)
            : summaryCards.map((card) => <SummaryCard key={card.title} {...card} />)}
        </section>

        <section aria-labelledby="sales-heading" className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 shadow-sm shadow-black/10 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 id="sales-heading" className="m-0 text-lg font-extrabold text-[#F5F5F5]">Sales Performance</h3>
              <p className="mb-0 mt-1 text-xs text-[#85858F]">{salesPeriodLabel} · Asia/Manila time</p>
              <Link to="/staff/sales-reports" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#FF727D] no-underline hover:text-white">View sales reports <OverviewIcon name="arrow" className="h-4 w-4" /></Link>
            </div>
            <div role="group" aria-label="Sales chart period" className="inline-flex w-fit rounded-xl border border-white/[0.08] bg-[#1B1B22] p-1">
              {[
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["monthly", "Monthly"],
              ].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={`min-h-9 rounded-lg px-3 text-xs font-bold transition ${period === value ? "bg-[#2A2022] text-[#FF727D] shadow-sm ring-1 ring-[#E63946]/25" : "text-[#A1A1AA] hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 text-3xl font-extrabold tracking-tight text-[#F5F5F5]">{formatMoney(periodData.total)}</p>
              <p className="mb-0 mt-1 text-xs font-medium text-[#85858F]">Net order value · cancelled orders excluded</p>
            </div>
            <p className="m-0 text-xs font-semibold text-[#A1A1AA]">
              {trend === null
                ? `No prior sales data ${comparisonLabel.replace("vs ", "for ")}`
                : <><span className={trend >= 0 ? "text-emerald-300" : "text-[#FF727D]"}>{trend >= 0 ? "+" : ""}{trend.toFixed(1)}%</span> {comparisonLabel}</>}
            </p>
          </div>
          <div className="mt-5 overflow-x-auto pb-2">
            <div role="img" aria-label={`${salesPeriodLabel} sales chart`} className="flex h-48 min-w-[640px] items-end gap-1.5 border-b border-white/[0.08] px-1 sm:gap-2">
              {ordersLoading ? Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-32 flex-1" />) : periodData.bins.map((bin, index) => (
                <div key={`${bin.title}-${index}`} aria-label={`${bin.title}: ${formatMoney(bin.amount)}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-36 w-full items-end rounded-t-md bg-[#1B1B22]">
                    <div className={`w-full rounded-t-md ${bin.amount > 0 ? "bg-[#E63946]" : "bg-white/10"}`} style={{ height: `${bin.amount > 0 ? Math.max((bin.amount / salesMax) * 100, 4) : 2}%` }} />
                  </div>
                  <span className="h-4 whitespace-nowrap text-[10px] font-semibold text-[#85858F]">{bin.label}</span>
                </div>
              ))}
            </div>
          </div>
          {!ordersLoading && periodData.total === 0 && <p className="mb-0 mt-2 text-center text-xs text-[#85858F]">No sales recorded for this period.</p>}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <section aria-labelledby="recent-orders-heading" className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141419] shadow-sm shadow-black/10">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <h3 id="recent-orders-heading" className="m-0 text-base font-extrabold text-[#F5F5F5]">Recent Orders</h3>
                <p className="mb-0 mt-1 text-xs text-[#85858F]">Latest 7 orders</p>
              </div>
              <Link to="/staff/orders" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#FF727D] no-underline hover:text-white">View all <OverviewIcon name="arrow" className="h-4 w-4" /></Link>
            </div>
            {ordersLoading ? <div className="space-y-3 p-5"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div> : recentOrders.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="m-0 text-sm font-bold text-[#D1D1D6]">No orders yet</p>
                <p className="mb-0 mt-1 text-xs text-[#85858F]">New customer orders will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead><tr className="bg-[#1B1B22] text-[10px] font-extrabold uppercase tracking-wide text-[#85858F]">
                    <th className="px-4 py-3">Order ID</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Date / time</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Payment</th><th className="px-4 py-3">Status</th>
                  </tr></thead>
                  <tbody>{recentOrders.map((order) => {
                    const status = getOrderStatus(order);
                    const paymentStatus = order.paymentStatus || "Not recorded";
                    const date = getOrderDate(order);
                    return <tr key={order.id} className="border-t border-white/[0.06] text-xs text-[#D1D1D6]">
                      <td className="whitespace-nowrap px-4 py-3 font-extrabold">{getOrderId(order)}</td>
                      <td className="max-w-36 truncate px-3 py-3 font-semibold">{getCustomerName(order)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[#A1A1AA]">{date ? orderDateFormatter.format(date) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-bold">{formatMoney(order.total)}</td>
                      <td className="whitespace-nowrap px-3 py-3"><StatusBadge tone={getPaymentStatusTone(paymentStatus)}>{paymentStatus}</StatusBadge></td>
                      <td className="whitespace-nowrap px-4 py-3"><StatusBadge tone={getOrderStatusTone(status)}>{status}</StatusBadge></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="best-selling-heading" className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#141419] shadow-sm shadow-black/10">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <h3 id="best-selling-heading" className="m-0 text-base font-extrabold text-[#F5F5F5]">Best-Selling Items</h3>
                <p className="mb-0 mt-1 text-xs text-[#85858F]">{salesPeriodLabel} · by units sold</p>
              </div>
              <Link to="/staff/menu" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#FF727D] no-underline hover:text-white">Menu catalog <OverviewIcon name="arrow" className="h-4 w-4" /></Link>
            </div>
            {bestSellingItems.length ? (
              <ol className="m-0 list-none divide-y divide-white/[0.06] p-0">
                {bestSellingItems.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#202027] text-xs font-extrabold text-[#A1A1AA]">{index + 1}</span>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#202027]">
                      {item.image ? <ImageWithSkeleton src={item.image} alt="" className="h-full w-full object-contain p-1" /> : <OverviewIcon name="inventory" className="h-5 w-5 text-[#85858F]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-bold text-[#F5F5F5]">{item.name}</p>
                      <p className="mb-0 mt-1 text-xs text-[#A1A1AA]">{item.quantity} {item.quantity === 1 ? "unit" : "units"} sold</p>
                    </div>
                    <p className="m-0 whitespace-nowrap text-xs font-extrabold text-[#D1D1D6]">{formatMoney(item.revenue)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="m-0 text-sm font-bold text-[#D1D1D6]">No item sales in this period</p>
                <p className="mb-0 mt-1 text-xs text-[#85858F]">Best sellers will appear when orders include item details.</p>
              </div>
            )}
          </section>
        </div>

        <section aria-labelledby="attention-heading" className="rounded-2xl border border-white/[0.07] bg-[#141419] shadow-sm shadow-black/10">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><OverviewIcon name="alert" className="h-4 w-4" /></span>
            <div>
              <h3 id="attention-heading" className="m-0 text-base font-extrabold text-[#F5F5F5]">Needs Attention</h3>
              <p className="mb-0 mt-0.5 text-xs text-[#85858F]">Actionable items requiring follow-up</p>
            </div>
          </div>
          {attentionItems.length ? (
            <ul className="m-0 divide-y divide-white/[0.06] p-0">
              {attentionItems.map((item) => (
                <li key={item.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.tone === "rose" ? "bg-[#FF727D]" : item.tone === "amber" ? "bg-amber-300" : "bg-[#85858F]"}`} />
                    <div>
                      <p className="m-0 text-sm font-bold text-[#F5F5F5]">{item.title}</p>
                      <p className="mb-0 mt-0.5 text-xs text-[#A1A1AA]">{item.description}</p>
                    </div>
                  </div>
                  <Link to={item.to} className="ml-5 inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#FF727D] no-underline hover:text-white sm:ml-0">{item.action} <OverviewIcon name="arrow" className="h-4 w-4" /></Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-6">
              <p className="m-0 text-sm font-bold text-emerald-300">Everything is running smoothly.</p>
            </div>
          )}
          <div className="border-t border-white/[0.07] px-4 py-3 text-xs text-[#85858F] sm:px-5">
            Inventory thresholds are not configured in the current inventory data, so low-stock and out-of-stock alerts cannot be calculated.
            {" "}<Link to="/staff/inventory" className="font-bold text-[#FF727D] no-underline hover:text-white">Review inventory</Link>
          </div>
        </section>

        <p className="m-0 text-center text-[11px] text-[#686872]">Sales are calculated from saved order records; cancelled orders are excluded.</p>
      </div>
    </main>
  );
}
