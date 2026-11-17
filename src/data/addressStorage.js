export const ADDRESSES_STORAGE_KEY = "motopots-saved-addresses";
export const ADDRESSES_UPDATED_EVENT = "motopots-addresses-updated";

const readProfileOwner = () => {
  try {
    const profile = JSON.parse(localStorage.getItem("motopots-profile") || "{}");
    return String(profile.email || profile.phone || profile.name || "guest").trim().toLowerCase();
  } catch {
    return "guest";
  }
};

function readAddressBook() {
  try {
    const value = JSON.parse(localStorage.getItem(ADDRESSES_STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function readSavedAddresses(owner = readProfileOwner()) {
  const addresses = readAddressBook()[owner];
  return Array.isArray(addresses) ? addresses.map(normalizeAddress) : [];
}

export function saveSavedAddresses(addresses, owner = readProfileOwner()) {
  const addressBook = readAddressBook();
  addressBook[owner] = addresses;
  localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addressBook));
  window.dispatchEvent(new Event(ADDRESSES_UPDATED_EVENT));
}

export function createAddressId() {
  return typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `address-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const emptyAddress = {
  regionCode: "",
  region: "",
  provinceCode: "",
  province: "",
  isIndependent: false,
  cityCode: "",
  city: "",
  barangayCode: "",
  barangay: "",
  street: "",
  houseNumber: "",
  subdivision: "",
  landmark: "",
  postalCode: "",
  label: "Home",
  isDefault: false,
};

function normalizeAddress(address) {
  const location = { ...(address || {}) };
  delete location.fullName;
  delete location.phone;
  return { ...emptyAddress, ...location };
}

export function formatAddress(address) {
  if (!address) return "";
  return [address.houseNumber, address.street, address.subdivision, address.barangay, address.city, address.province, address.region, address.postalCode]
    .filter(Boolean)
    .join(", ");
}
