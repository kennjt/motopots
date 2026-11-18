import { Link } from "react-router-dom";

const descriptions = {
  "Order History": "Completed and cancelled orders will be available here.",
  Categories: "Manage product categories from the Menu Catalog page.",
  Customizations: "Product sizes, flavors, and add-ons are managed with each product in Menu Catalog.",
  Ingredients: "Ingredient records and stock quantities are not configured in the current application.",
  Recipes: "Recipe management is not configured in the current application.",
  "Stock Movements": "Stock movement records are not configured in the current application.",
  Suppliers: "Supplier records are not configured in the current application.",
  Employees: "Employee records are managed from the Employee Shifts page.",
  Expenses: "Expense tracking is not configured in the current application.",
  "Sales Reports": "Sales reporting is not configured in the current application.",
  Customers: "Customer records are not configured in the current application.",
  "Favorite Orders": "Customer favorite orders are not available in the admin data store.",
  "Store Information": "Store information management is not configured in the current application.",
  "Store Availability": "Manage availability and weekly operating hours in Store Settings.",
  "Operating Hours": "Manage operating hours and availability in Store Settings.",
  Profile: "Administrator profile management is not configured in the current application.",
};

export default function AdminSectionPage({ title, showHeading = true }) {
  const description = descriptions[title] || "This page is not configured in the current application.";
  return (
    <section className="mx-auto max-w-6xl">
      {showHeading ? (
        <div className="mb-6">
          <h2 className="m-0 text-2xl font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">{description}</p>
        </div>
      ) : <p className="mb-4 text-sm text-[#A1A1AA]">{description}</p>}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111116] px-5 py-12 text-center">
        <p className="m-0 text-sm font-bold text-[#D1D1D6]">No additional records to display.</p>
        {title === "Page not found" && <Link to="/staff" className="mt-4 inline-block text-sm font-bold text-[#FF727D] no-underline hover:text-white">Return to dashboard</Link>}
      </div>
    </section>
  );
}

