import { Routes, Route, Navigate } from "react-router-dom";

import AdminDashboard from "./AdminDashboard";
import AdminOverview from "./components/AdminOverview";
import AdminSettings from "./components/AdminSettings";
import AdminLayout from "./components/AdminLayout";
import AdminSectionPage from "./components/AdminSectionPage";
import AdminCustomerPages from "./components/AdminCustomerPages";
import AdminMenuCatalog from "./components/AdminMenuCatalog";
import AdminWorkspace from "./components/AdminWorkspace";
import AdminInventoryOverview from "./components/AdminInventoryOverview";

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
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
            element={<AdminSectionPage title="Recipes" showHeading={false} />}
          />
          <Route
            path="stock-movements"
            element={
              <AdminSectionPage title="Stock Movements" showHeading={false} />
            }
          />
          <Route
            path="suppliers"
            element={<AdminSectionPage title="Suppliers" showHeading={false} />}
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
          element={<AdminDashboard embedded page="performance" />}
        />
        <Route
          path="operating-hours"
          element={
            <AdminSettings
              key="operating-hours"
              embedded
              initialTab="schedule"
            />
          }
        />
        <Route
          path="store-availability"
          element={
            <AdminSettings
              key="store-availability"
              embedded
              initialTab="availability"
            />
          }
        />
        <Route
          path="settings"
          element={
            <AdminSettings key="settings" embedded initialTab="schedule" />
          }
        />
        <Route
          path="shifts"
          element={<AdminSettings key="shifts" embedded initialTab="shifts" />}
        />
        <Route
          path="employees"
          element={
            <AdminSettings key="employees" embedded initialTab="shifts" />
          }
        />
        <Route
          path="expenses"
          element={<AdminSectionPage title="Expenses" />}
        />
        <Route
          path="sales-reports"
          element={<AdminDashboard embedded page="sales-reports" />}
        />
        <Route
          path="store-information"
          element={<AdminSectionPage title="Store Information" />}
        />
        <Route path="profile" element={<AdminSectionPage title="Profile" />} />
        <Route path="*" element={<AdminSectionPage title="Page not found" />} />
      </Route>
    </Routes>
  );
}

export default AdminRoutes;
