import { Routes, Route, Navigate } from "react-router-dom";

import AdminDashboard from "./AdminDashboard";
import AdminOverview from "./components/admin/AdminOverview";
import AdminSettings from "./components/admin/AdminSettings";
import AdminLayout from "./components/admin/AdminLayout";
import AdminSectionPage from "./components/admin/AdminSectionPage";
import AdminCustomerPages from "./components/admin/AdminCustomerPages";
import AdminMenuCatalog from "./components/admin/AdminMenuCatalog";
import AdminWorkspace from "./components/admin/AdminWorkspace";
import AdminInventoryOverview from "./components/inventory/AdminInventoryOverview";
import AdminInventoryManagement from "./components/inventory/AdminInventoryManagement";
import AdminExpenses from "./components/admin/AdminExpenses";
import { useEmployeeAuth } from "./auth/employeeAuthContext";

const ownerOnlyPaths = new Set(["expenses", "sales-reports", "performance", "operating-hours", "store-availability", "settings", "shifts", "employees", "store-information"]);

function AdminLoading() {
  return <div className="flex min-h-screen items-center justify-center bg-[#0B0B0F] text-sm font-semibold text-[#A1A1AA]">Checking your session...</div>;
}

function AccessDenied() {
  return <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-white/10 bg-[#15151C] p-8 text-center text-sm font-semibold text-[#A1A1AA]">You do not have permission to access this page.</div>;
}

function ProtectedAdmin({ children }) {
  const { session, loading } = useEmployeeAuth();
  if (loading) return <AdminLoading />;
  if (!session) return <Navigate to="/?login=admin" replace />;
  return children;
}

function RoleGuard({ path, children }) {
  const { role } = useEmployeeAuth();
  if (ownerOnlyPaths.has(path) && role !== "owner") return <AccessDenied />;
  return children;
}

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminOverview />} />
        <Route
          path="orders"
          element={
            <AdminWorkspace
              title="Orders"
              tabs={[
                { label: "Orders", to: "/staff/orders" },
                { label: "Menu Catalog", to: "/staff/orders/menu" },
                { label: "Categories", to: "/staff/orders/categories" },
                { label: "Customizations", to: "/staff/orders/customizations" },
                { label: "Order History", to: "/staff/orders/history" },
              ]}
            />
          }
        >
          <Route
            index
            element={
              <AdminDashboard embedded page="orders" showPageHeading={false} />
            }
          />
          <Route
            path="menu"
            element={<AdminMenuCatalog view="catalog" showHeading={false} />}
          />
          <Route
            path="categories"
            element={<AdminMenuCatalog view="categories" showHeading={false} />}
          />
          <Route
            path="customizations"
            element={
              <AdminMenuCatalog view="customizations" showHeading={false} />
            }
          />
          <Route
            path="history"
            element={
              <AdminDashboard
                embedded
                page="order-history"
                showPageHeading={false}
              />
            }
          />
        </Route>
        <Route
          path="inventory"
          element={
            <AdminWorkspace
              title="Inventory"
              tabs={[
                { label: "Overview", to: "/staff/inventory" },
                { label: "Ingredients", to: "/staff/inventory/ingredients" },
                { label: "Recipes", to: "/staff/inventory/recipes" },
                {
                  label: "Stock Movements",
                  to: "/staff/inventory/stock-movements",
                },
                { label: "Suppliers", to: "/staff/inventory/suppliers" },
              ]}
            />
          }
        >
          <Route index element={<AdminInventoryOverview />} />
          <Route
            path="ingredients"
            element={<AdminInventoryOverview view="ingredients" />}
          />
          <Route
            path="recipes"
            element={<AdminInventoryManagement view="recipes" />}
          />
          <Route
            path="stock-movements"
            element={<AdminInventoryManagement view="stock-movements" />}
          />
          <Route
            path="suppliers"
            element={<AdminInventoryManagement view="suppliers" />}
          />
        </Route>
        <Route
          path="customers"
          element={
            <AdminWorkspace
              title="Customer"
              tabs={[
                { label: "Customers", to: "/staff/customers" },
                { label: "Favorite Orders", to: "/staff/customers/favorites" },
              ]}
            />
          }
        >
          <Route index element={<AdminCustomerPages showHeading={false} />} />
          <Route
            path="favorites"
            element={<AdminCustomerPages favorites showHeading={false} />}
          />
        </Route>
        <Route
          path="order-history"
          element={<Navigate to="/staff/orders/history" replace />}
        />
        <Route
          path="menu"
          element={<Navigate to="/staff/orders/menu" replace />}
        />
        <Route
          path="menu/categories"
          element={<Navigate to="/staff/orders/categories" replace />}
        />
        <Route
          path="menu/customizations"
          element={<Navigate to="/staff/orders/customizations" replace />}
        />
        <Route
          path="recipes"
          element={<Navigate to="/staff/inventory/recipes" replace />}
        />
        <Route
          path="stock-movements"
          element={<Navigate to="/staff/inventory/stock-movements" replace />}
        />
        <Route
          path="suppliers"
          element={<Navigate to="/staff/inventory/suppliers" replace />}
        />
        <Route
          path="favorite-orders"
          element={<Navigate to="/staff/customers/favorites" replace />}
        />
        <Route
          path="performance"
          element={<RoleGuard path="performance"><AdminDashboard embedded page="performance" /></RoleGuard>}
        />
        <Route
          path="operating-hours"
          element={
            <RoleGuard path="operating-hours"><AdminSettings
              key="operating-hours"
              embedded
              initialTab="schedule"
            /></RoleGuard>
          }
        />
        <Route
          path="store-availability"
          element={
            <RoleGuard path="store-availability"><AdminSettings
              key="store-availability"
              embedded
              initialTab="availability"
            /></RoleGuard>
          }
        />
        <Route
          path="settings"
          element={
            <RoleGuard path="settings"><AdminSettings key="settings" embedded initialTab="schedule" /></RoleGuard>
          }
        />
        <Route
          path="shifts"
          element={<RoleGuard path="shifts"><AdminSettings key="shifts" embedded initialTab="shifts" /></RoleGuard>}
        />
        <Route
          path="employees"
          element={
            <RoleGuard path="employees"><AdminSettings key="employees" embedded initialTab="shifts" /></RoleGuard>
          }
        />
        <Route
          path="expenses"
          element={<RoleGuard path="expenses"><AdminExpenses /></RoleGuard>}
        />
        <Route
          path="sales-reports"
          element={<RoleGuard path="sales-reports"><AdminDashboard embedded page="sales-reports" /></RoleGuard>}
        />
        <Route
          path="store-information"
          element={<RoleGuard path="store-information"><AdminSectionPage title="Store Information" /></RoleGuard>}
        />
        <Route path="profile" element={<AdminSectionPage title="Profile" />} />
        <Route path="*" element={<AdminSectionPage title="Page not found" />} />
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
