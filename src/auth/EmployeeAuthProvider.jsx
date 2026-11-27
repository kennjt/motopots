import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../utils/supabase";
import { EmployeeAuthContext } from "./employeeAuthContext";

const clearAuthState = (setSession, setEmployee, setRole) => {
  setSession(null);
  setEmployee(null);
  setRole(null);
};

async function resolveEmployee(session) {
  if (!session?.user?.id) return null;

  const { data: employee, error: employeeError } = await supabase
    .from("employee")
    .select("employee_id, role_id, auth_user_id, username, status, must_change_credentials")
    .eq("auth_user_id", session.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (employeeError || !employee) {
    throw new Error("The employee account could not be verified.");
  }

  const { data: roleRecord, error: roleError } = await supabase
    .from("role")
    .select("role_name")
    .eq("role_id", employee.role_id)
    .maybeSingle();

  if (roleError || !roleRecord?.role_name) {
    throw new Error("The employee role could not be verified.");
  }

  const role = roleRecord.role_name.trim().toLowerCase();
  if (role !== "owner" && role !== "staff") {
    throw new Error("The employee role is not authorized.");
  }

  return { employee, role };
}

export function EmployeeAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession) => {
      const currentRequest = requestId.current + 1;
      requestId.current = currentRequest;

      if (!nextSession) {
        if (mounted) clearAuthState(setSession, setEmployee, setRole);
        if (mounted) setLoading(false);
        return;
      }

      if (mounted) {
        setSession(nextSession);
        setLoading(true);
      }

      try {
        const resolved = await resolveEmployee(nextSession);
        if (!mounted || requestId.current !== currentRequest) return;
        setEmployee(resolved.employee);
        setRole(resolved.role);
      } catch {
        if (!mounted || requestId.current !== currentRequest) return;
        clearAuthState(setSession, setEmployee, setRole);
        await supabase.auth.signOut({ scope: "local" });
      } finally {
        if (mounted && requestId.current === currentRequest) setLoading(false);
      }
    };

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (mounted) clearAuthState(setSession, setEmployee, setRole);
        if (mounted) setLoading(false);
        return;
      }
      await applySession(data.session);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      // Defer database work outside Supabase's auth event callback to avoid
      // waiting on an auth lock from inside the callback.
      window.setTimeout(() => {
        void applySession(nextSession);
      }, 0);
    });

    void restoreSession();

    return () => {
      mounted = false;
      requestId.current += 1;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    clearAuthState(setSession, setEmployee, setRole);
    if (error) throw error;
  };

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, employee, role, loading, signOut }),
    [employee, loading, role, session],
  );

  return <EmployeeAuthContext.Provider value={value}>{children}</EmployeeAuthContext.Provider>;
}

