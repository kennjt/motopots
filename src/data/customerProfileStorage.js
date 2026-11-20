const ACTIVE_PROFILE_KEY = "motopots-profile";
const CUSTOMER_PROFILES_KEY = "motopots-customer-profiles";

const normalizeProfile = (profile) => ({
  name: typeof profile.name === "string"
    ? profile.name.trim()
    : typeof profile.fullName === "string"
      ? profile.fullName.trim()
      : "",
  email: typeof profile.email === "string" ? profile.email.trim() : "",
  phone: typeof profile.phone === "string" ? profile.phone.trim() : "",
});

const readCustomerProfiles = () => {
  const raw = localStorage.getItem(CUSTOMER_PROFILES_KEY);
  if (raw === null) return {};

  const profiles = JSON.parse(raw);
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) {
    throw new Error("Saved customer profiles are invalid.");
  }
  return profiles;
};

export const readActiveCustomerProfile = () => {
  const raw = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (raw === null) return null;

  const profile = JSON.parse(raw);
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("The active customer profile is invalid.");
  }
  return normalizeProfile(profile);
};

export const findCustomerProfile = (email) => {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;

  const profile = readCustomerProfiles()[key];
  return profile ? normalizeProfile(profile) : null;
};

export const saveCustomerAccountProfile = (profile) => {
  const normalized = normalizeProfile(profile);
  const key = normalized.email.toLowerCase();
  if (!key) throw new Error("A customer email is required to save the profile.");

  const profiles = readCustomerProfiles();
  profiles[key] = normalized;
  localStorage.setItem(CUSTOMER_PROFILES_KEY, JSON.stringify(profiles));
};

export const setActiveCustomerProfile = (profile) => {
  const normalized = normalizeProfile(profile);
  localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event("motopots-profile-updated"));
};
