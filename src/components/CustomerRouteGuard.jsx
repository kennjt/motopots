import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../auth/customerAuthContext";

export default function CustomerRouteGuard({ children }) {
  const { user, customer, loading, error } = useCustomerAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-[#A1A1AA]">Loading your account...</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center text-[#A1A1AA]">
        <p role="alert" className="max-w-md text-rose-300">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/?login=user", { replace: true, state: { from: location.pathname } })}
          className="rounded-lg bg-[#E63946] px-4 py-2 font-bold text-white"
        >
          Return to login
        </button>
      </div>
    );
  }

  if (!user || !customer) {
    return <Navigate to="/?login=user" replace state={{ from: location.pathname }} />;
  }

  return children;
}
