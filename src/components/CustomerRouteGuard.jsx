import { Navigate, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../auth/customerAuthContext";

export default function CustomerRouteGuard({ children }) {
  const { user, customer, loading } = useCustomerAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-[#A1A1AA]">Loading your account...</div>;
  }

  if (!user || !customer) {
    return <Navigate to="/?login=user" replace state={{ from: location.pathname }} />;
  }

  return children;
}
