import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { customerSupabase } from "../utils/customerSupabase";
import { setActiveCustomerProfile } from "../data/customerProfileStorage";
import { CustomerAuthContext } from "./customerAuthContext";

const CUSTOMER_FIELDS = "customer_id, auth_user_id, name, contact_no, email, delivery_address, username, created_at";

async function loadCustomerProfile(session) {
  if (!session?.user?.id) return null;

  const { data, error } = await customerSupabase
    .from("customer")
    .select(CUSTOMER_FIELDS)
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function cacheProfile(profile) {
  if (!profile) return;
  setActiveCustomerProfile({
    name: profile.name || "",
    email: profile.email || "",
    phone: profile.contact_no || "",
  });
}

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession) => {
      const currentRequest = ++requestId.current;
      if (!nextSession) {
        if (mounted) {
          setSession(null);
          setCustomer(null);
          setRecovery(false);
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setSession(nextSession);
        setLoading(true);
      }

      try {
        const profile = await loadCustomerProfile(nextSession);
        if (!profile) throw new Error("Your customer profile could not be found.");
        if (!mounted || requestId.current !== currentRequest) return;
        setCustomer(profile);
        cacheProfile(profile);
      } catch {
        if (!mounted || requestId.current !== currentRequest) return;
        setSession(null);
        setCustomer(null);
        await customerSupabase.auth.signOut({ scope: "local" });
      } finally {
        if (mounted && requestId.current === currentRequest) setLoading(false);
      }
    };

    const restoreSession = async () => {
      const { data, error } = await customerSupabase.auth.getSession();
      if (error) {
        if (mounted) {
          setSession(null);
          setCustomer(null);
          setLoading(false);
        }
        return;
      }
      await applySession(data.session);
    };

    const { data: authListener } = customerSupabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      window.setTimeout(() => void applySession(nextSession), 0);
    });

    void restoreSession();
    return () => {
      mounted = false;
      requestId.current = Number.MAX_SAFE_INTEGER;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refreshCustomer = useCallback(async () => {
    const profile = await loadCustomerProfile(session);
    setCustomer(profile);
    cacheProfile(profile);
    return profile;
  }, [session]);

  const signOut = async () => {
    const { error } = await customerSupabase.auth.signOut({ scope: "local" });
    setSession(null);
    setCustomer(null);
    setRecovery(false);
    localStorage.removeItem("motopots-profile");
    window.dispatchEvent(new Event("motopots-profile-updated"));
    if (error) throw error;
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      customer,
      loading,
      recovery,
      refreshCustomer,
      signOut,
    }),
    [customer, loading, recovery, refreshCustomer, session],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}
