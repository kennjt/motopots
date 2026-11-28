import { useEffect, useMemo, useState } from "react";
import {
  ORDERS_STORAGE_KEY,
  ORDERS_UPDATED_EVENT,
  formatOrderId,
  readOrders,
} from "../../data/orderStorage";
import { formatMoney } from "../../data/menuData";
import {
  EXPENSES_UPDATED_EVENT,
  readExpenses,
} from "../../data/expensesStorage";

const businessDateFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const businessDateTimeFormatter = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  dateStyle: "medium",
  timeStyle: "short",
});

function getBusinessDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    businessDateFormatter
      .formatToParts(date)
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getOrderDate(order) {
  const date = new Date(order.createdAt || order.date || order.id);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getOrderStatus(order) {
  return order.orderStatus || order.status || "Pending";
}

function getOrderRevenue(order) {
  if (getOrderStatus(order) !== "Completed") return 0;
  const total = Number(order.total);
  const refund = Number(order.refundAmount ?? order.refundedAmount);
  const adjustment = Number(order.adjustmentAmount);
  const safeTotal = Number.isFinite(total) ? total : 0;
  const safeRefund = Number.isFinite(refund) ? refund : 0;
  const safeAdjustment = Number.isFinite(adjustment) ? adjustment : 0;
  return Math.max(0, safeTotal - safeRefund + safeAdjustment);
}

function getItemRevenue(item) {
  const quantity = Number(item.quantity);
  const revenue = Number(
    item.subtotal ?? (item.finalUnitPrice ?? item.price ?? 0) * quantity,
  );
  return Number.isFinite(revenue) ? revenue : 0;
}

function getPaymentMethod(order) {
  return String(order.paymentMethod || "").trim() || "Not specified";
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadReportCsv(report, startDate, endDate) {
  const rows = [
    ["Sales report", `From ${startDate}`, `To ${endDate}`],
    [],
    ["Summary", "Value"],
    ["Net sales", report.totalSales],
    ["Orders placed", report.orders.length],
    ["Completed sales orders", report.salesOrders.length],
    ["Completed orders", report.completedOrders],
    ["Cancelled orders", report.cancelledOrders],
    ["Recorded expenses", report.expenses.length],
    ["Expenses total", report.totalExpenses],
    ["Estimated net income", report.netIncome],
    [],
    ["Expense details", "Date", "Category", "Description", "Employee", "Amount", "Receipt"],
    ...report.expenses.map((expense) => [
      "",
      expense.date,
      expense.category,
      expense.description,
      expense.employeeName,
      expense.amount,
      expense.receipt?.name || "",
    ]),
    [],
    ["Payment method", "Orders", "Sales"],
    ...report.paymentTotals.map(({ method, count, sales }) => [
      method,
      count,
      sales,
    ]),
    [],
    ["Best sellers", "Quantity sold", "Sales"],
    ...report.bestSellers.map(({ name, quantity, sales }) => [
      name,
      quantity,
      sales,
    ]),
    [],
    [
      "Order details",
      "Date",
      "Order ID",
      "Customer",
      "Status",
      "Payment method",
      "Payment status",
      "Order total",
      "Refund",
      "Net sales",
    ],
    ...report.sortedOrders.map((order) => {
      const date = getOrderDate(order);
      const total = Number(order.total || 0);
      const refund = Number(order.refundAmount ?? order.refundedAmount ?? 0);
      return [
        "",
        date ? date.toISOString() : "",
        formatOrderId(order.id),
        typeof order.customer === "string"
          ? order.customer
          : order.customer?.name || "Guest customer",
        getOrderStatus(order),
        getPaymentMethod(order),
        order.paymentStatus || "",
        total,
        refund,
        getOrderRevenue(order),
      ];
    }),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-report-${startDate}-to-${endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
      <p className="mb-1 text-xs font-bold text-[#A1A1AA]">{label}</p>
      <p className="m-0 text-2xl font-extrabold text-[#F5F5F5]">{value}</p>
      <p className="mb-0 mt-1 text-xs text-[#777781]">{detail}</p>
    </article>
  );
}

export default function AdminSalesReports() {
  const [orders, setOrders] = useState(() => readOrders());
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [today] = useState(() => getBusinessDateKey(new Date()));
  const [startDate, setStartDate] = useState(() => {
    const date = getBusinessDateKey(new Date());
    return `${date.slice(0, 7)}-01`;
  });
  const [endDate, setEndDate] = useState(() =>
    getBusinessDateKey(new Date()),
  );

  useEffect(() => {
    let active = true;
    const syncOrders = (event) => {
      if (!event || event.type !== "storage" || event.key === ORDERS_STORAGE_KEY || event.key === null) {
        setOrders(readOrders());
      }
    };
    const loadExpenses = async () => {
      try {
        const saved = await readExpenses();
        if (active) {
          setExpenses(saved);
          setExpensesError("");
        }
      } catch (error) {
        if (active) {
          setExpensesError(
            error instanceof Error ? error.message : "Unable to load expenses.",
          );
        }
      } finally {
        if (active) setExpensesLoading(false);
      }
    };
    window.addEventListener("storage", syncOrders);
    window.addEventListener(ORDERS_UPDATED_EVENT, syncOrders);
    window.addEventListener(EXPENSES_UPDATED_EVENT, loadExpenses);
    loadExpenses();
    return () => {
      active = false;
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener(ORDERS_UPDATED_EVENT, syncOrders);
      window.removeEventListener(EXPENSES_UPDATED_EVENT, loadExpenses);
    };
  }, []);

  const hasValidRange = Boolean(startDate && endDate && startDate <= endDate);
  const report = useMemo(() => {
    const sortedOrders = orders
      .map((order) => ({ order, date: getOrderDate(order) }))
      .filter(({ date }) => date)
      .filter(({ date }) => {
        const key = getBusinessDateKey(date);
        return key >= startDate && key <= endDate;
      })
      .sort((left, right) => right.date - left.date)
      .map(({ order }) => order);
    const salesOrders = sortedOrders.filter(
      (order) => getOrderStatus(order) === "Completed",
    );
    const rangeExpenses = expenses
      .filter((expense) => expense.date >= startDate && expense.date <= endDate)
      .sort((left, right) => right.date.localeCompare(left.date));
    const totalExpenses = rangeExpenses.reduce((total, expense) => {
      const amount = Number(expense.amount);
      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const totalSales = salesOrders.reduce(
      (total, order) => total + getOrderRevenue(order),
      0,
    );
    const paymentTotalsByMethod = new Map();
    const bestSellersByItem = new Map();

    salesOrders.forEach((order) => {
      const method = getPaymentMethod(order);
      const payment = paymentTotalsByMethod.get(method) || {
        method,
        count: 0,
        sales: 0,
      };
      payment.count += 1;
      payment.sales += getOrderRevenue(order);
      paymentTotalsByMethod.set(method, payment);

      (Array.isArray(order.items) ? order.items : []).forEach((item) => {
        const quantity = Number(item.quantity || 0);
        if (!Number.isFinite(quantity) || quantity <= 0) return;
        const key = item.productId || item.name || "unknown-item";
        const bestSeller = bestSellersByItem.get(key) || {
          key,
          name: item.name || "Menu item",
          quantity: 0,
          sales: 0,
        };
        bestSeller.quantity += quantity;
        bestSeller.sales += getItemRevenue(item);
        bestSellersByItem.set(key, bestSeller);
      });
    });

    return {
      sortedOrders,
      orders: sortedOrders,
      salesOrders,
      expenses: rangeExpenses,
      totalSales,
      totalExpenses,
      netIncome: totalSales - totalExpenses,
      completedOrders: sortedOrders.filter(
        (order) => getOrderStatus(order) === "Completed",
      ).length,
      cancelledOrders: sortedOrders.filter(
        (order) => getOrderStatus(order) === "Cancelled",
      ).length,
      paymentTotals: [...paymentTotalsByMethod.values()].sort(
        (left, right) => right.sales - left.sales,
      ),
      bestSellers: [...bestSellersByItem.values()].sort(
        (left, right) => right.quantity - left.quantity,
      ),
    };
  }, [orders, expenses, startDate, endDate]);

  const updateDate = (setter) => (event) => {
    const value = event.target.value;
    setter(value);
    const nextStart = setter === setStartDate ? value : startDate;
    const nextEnd = setter === setEndDate ? value : endDate;
    setRangeError(
      nextStart && nextEnd && nextStart > nextEnd
        ? "The start date must be on or before the end date."
        : "",
    );
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <header>
        <h2 className="m-0 text-2xl font-extrabold text-[#F5F5F5]">
          Sales Reports
        </h2>
        <p className="mb-0 mt-1 text-sm text-[#A1A1AA]">
          Review completed sales, order activity, payment methods, and best
          sellers for a selected date range. Estimated net income is completed
          sales minus expenses recorded for the same dates.
        </p>
      </header>
      {expensesError && (
        <p role="alert" className="m-0 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200">
          Expense data could not be loaded, so net income and complete report
          exports are unavailable: {expensesError}
        </p>
      )}

      <section
        aria-label="Report date range"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5"
      >
        <label className="min-w-[180px] flex-1 text-xs font-bold text-[#A1A1AA]">
          Start date
          <input
            type="date"
            value={startDate}
            max={today}
            onChange={updateDate(setStartDate)}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]/60"
            required
          />
        </label>
        <label className="min-w-[180px] flex-1 text-xs font-bold text-[#A1A1AA]">
          End date
          <input
            type="date"
            value={endDate}
            max={today}
            onChange={updateDate(setEndDate)}
            className="mt-1 block w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]/60"
            required
          />
        </label>
        <button
          type="button"
          disabled={!hasValidRange || expensesLoading || Boolean(expensesError)}
          onClick={() => downloadReportCsv(report, startDate, endDate)}
          className="min-h-10 rounded-lg bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50 print:hidden"
        >
          Download CSV report
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-10 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-[#D1D1D6] transition hover:bg-white/[0.05] print:hidden"
        >
          Print / Save as PDF
        </button>
        {rangeError && (
          <p role="alert" className="m-0 w-full text-sm text-rose-300">
            {rangeError}
          </p>
        )}
      </section>

      {!hasValidRange ? (
        <p role="alert" className="m-0 text-sm text-rose-300">
          Select a valid date range to view sales.
        </p>
      ) : (
        <>
          <p className="m-0 text-xs text-[#85858F]">
            Sales and item totals exclude cancelled orders. Order counts include
            cancelled orders. Estimated net income subtracts recorded expenses
            from sales and may not include unrecorded costs.
          </p>
          <section
            aria-label="Sales summary"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            <MetricCard
              label="Net sales"
              value={formatMoney(report.totalSales)}
              detail="After recorded refunds and adjustments"
            />
            <MetricCard
              label="Recorded expenses"
              value={expensesLoading || expensesError ? "—" : formatMoney(report.totalExpenses)}
              detail={expensesLoading ? "Loading expenses…" : `${report.expenses.length} expense records in range`}
            />
            <MetricCard
              label="Estimated net income"
              value={expensesLoading || expensesError ? "—" : formatMoney(report.netIncome)}
              detail="Net sales minus recorded expenses"
            />
            <MetricCard
              label="Orders placed"
              value={report.orders.length}
              detail="Includes cancelled orders"
            />
            <MetricCard
              label="Completed orders"
              value={report.completedOrders}
              detail="Within the selected range"
            />
            <MetricCard
              label="Cancelled orders"
              value={report.cancelledOrders}
              detail="Excluded from sales totals"
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
              <h3 className="m-0 text-base font-extrabold">Payment method totals</h3>
              <p className="mb-0 mt-1 text-xs text-[#85858F]">
                Completed orders grouped by payment method
              </p>
              {report.paymentTotals.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-left text-sm">
                    <thead className="text-xs text-[#85858F]">
                      <tr>
                        <th className="py-2 pr-3 font-bold">Payment method</th>
                        <th className="py-2 pr-3 text-right font-bold">Orders</th>
                        <th className="py-2 text-right font-bold">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.paymentTotals.map((payment) => (
                        <tr key={payment.method} className="border-t border-white/[0.06]">
                          <td className="py-3 pr-3">{payment.method}</td>
                          <td className="py-3 pr-3 text-right">{payment.count}</td>
                          <td className="py-3 text-right font-bold">{formatMoney(payment.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mb-0 mt-5 text-sm text-[#A1A1AA]">
                  No sales by payment method in this date range.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
              <h3 className="m-0 text-base font-extrabold">Best sellers</h3>
              <p className="mb-0 mt-1 text-xs text-[#85858F]">
                Ranked by quantity sold in non-cancelled orders
              </p>
              {report.bestSellers.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-left text-sm">
                    <thead className="text-xs text-[#85858F]">
                      <tr>
                        <th className="py-2 pr-3 font-bold">Item</th>
                        <th className="py-2 pr-3 text-right font-bold">Quantity</th>
                        <th className="py-2 text-right font-bold">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.bestSellers.map((item) => (
                        <tr key={item.key} className="border-t border-white/[0.06]">
                          <td className="py-3 pr-3">{item.name}</td>
                          <td className="py-3 pr-3 text-right">{item.quantity}</td>
                          <td className="py-3 text-right font-bold">{formatMoney(item.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mb-0 mt-5 text-sm text-[#A1A1AA]">
                  No item sales in this date range.
                </p>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
            <h3 className="m-0 text-base font-extrabold">Expenses in range</h3>
            {expensesLoading ? (
              <p className="mb-0 mt-4 text-sm text-[#A1A1AA]">Loading expenses…</p>
            ) : expensesError ? (
              <p className="mb-0 mt-4 text-sm text-rose-200">
                Expense records are unavailable.
              </p>
            ) : report.expenses.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="text-xs text-[#85858F]">
                    <tr>
                      <th className="py-2 pr-3 font-bold">Date</th>
                      <th className="py-2 pr-3 font-bold">Category</th>
                      <th className="py-2 pr-3 font-bold">Description</th>
                      <th className="py-2 pr-3 font-bold">Employee</th>
                      <th className="py-2 pr-3 text-right font-bold">Amount</th>
                      <th className="py-2 font-bold">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-white/[0.06]">
                        <td className="whitespace-nowrap py-3 pr-3 text-[#A1A1AA]">
                          {expense.date}
                        </td>
                        <td className="py-3 pr-3">{expense.category}</td>
                        <td className="max-w-[240px] py-3 pr-3">{expense.description}</td>
                        <td className="py-3 pr-3">{expense.employeeName}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-right font-bold">
                          {formatMoney(expense.amount)}
                        </td>
                        <td className="py-3">
                          {expense.receipt ? (
                            <a
                              href={expense.receipt.dataUrl}
                              download={expense.receipt.name}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[#FF727D] underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-[#777781]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/[0.06]">
                      <td colSpan="4" className="py-3 pr-3 text-right font-extrabold">
                        Total expenses
                      </td>
                      <td className="py-3 pr-3 text-right font-extrabold">
                        {formatMoney(report.totalExpenses)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mb-0 mt-4 text-sm text-[#A1A1AA]">
                No expenses recorded for the selected date range.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
            <h3 className="m-0 text-base font-extrabold">Orders in range</h3>
            {report.sortedOrders.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-xs text-[#85858F]">
                    <tr>
                      <th className="py-2 pr-3 font-bold">Date</th>
                      <th className="py-2 pr-3 font-bold">Order</th>
                      <th className="py-2 pr-3 font-bold">Status</th>
                      <th className="py-2 pr-3 font-bold">Payment</th>
                      <th className="py-2 text-right font-bold">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sortedOrders.map((order) => {
                      const date = getOrderDate(order);
                      return (
                        <tr key={order.id} className="border-t border-white/[0.06]">
                          <td className="py-3 pr-3 text-[#A1A1AA]">
                            {date ? businessDateTimeFormatter.format(date) : "—"}
                          </td>
                          <td className="py-3 pr-3 font-bold">
                            #{formatOrderId(order.id)}
                          </td>
                          <td className="py-3 pr-3">{getOrderStatus(order)}</td>
                          <td className="py-3 pr-3">{getPaymentMethod(order)}</td>
                          <td className="py-3 text-right font-bold">
                            {formatMoney(getOrderRevenue(order))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mb-0 mt-4 text-sm text-[#A1A1AA]">
                No orders found for the selected date range.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
