import { createContext, useContext } from "react";

export const EmployeeAuthContext = createContext(null);

export function useEmployeeAuth() {
  const context = useContext(EmployeeAuthContext);
  if (!context) throw new Error("useEmployeeAuth must be used inside EmployeeAuthProvider.");
  return context;
}
