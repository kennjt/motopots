import { useEffect, useState } from "react";
import {
  ADDRESSES_UPDATED_EVENT,
  createAddressId,
  emptyAddress,
  formatAddress,
  readSavedAddresses,
  saveSavedAddresses,
} from "../data/addressStorage";
import {
  SIPOCOT_BARANGAYS,
  SIPOCOT_LOCATION,
} from "../data/sipocotLocation";
import { showConfirm, showError, showSuccess } from "../utils/swal";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]";

const isSipocotAddress = (address) =>
  String(address?.province || "").trim().toLowerCase() === "camarines sur" &&
  String(address?.city || "").trim().toLowerCase() === "sipocot";

export default function CustomerAddressBook() {
  const [addresses, setAddresses] = useState(() =>
    readSavedAddresses().filter(isSipocotAddress),
  );
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const syncAddresses = () =>
      setAddresses(readSavedAddresses().filter(isSipocotAddress));
    const syncStorage = (event) => {
      if (
        event.key === "motopots-saved-addresses" ||
        event.key === "motopots-profile" ||
        event.key === null
      ) {
        syncAddresses();
      }
    };
    window.addEventListener(ADDRESSES_UPDATED_EVENT, syncAddresses);
    window.addEventListener("motopots-profile-updated", syncAddresses);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(ADDRESSES_UPDATED_EVENT, syncAddresses);
      window.removeEventListener("motopots-profile-updated", syncAddresses);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const startNewAddress = () => {
    setError("");
    setDraft({
      ...emptyAddress,
      ...SIPOCOT_LOCATION,
      isDefault: addresses.length === 0,
    });
  };

  const startEditAddress = (address) => {
    setError("");
    setDraft({
      ...emptyAddress,
      ...address,
      ...SIPOCOT_LOCATION,
      cityCode: address.cityCode || SIPOCOT_LOCATION.cityCode,
      barangayCode: SIPOCOT_BARANGAYS.includes(address.barangay)
        ? address.barangay
        : "",
    });
  };

  const saveAddress = (event) => {
    event.preventDefault();
    const required = ["barangay", "houseNumber", "street", "postalCode"];
    if (required.some((key) => !String(draft[key] || "").trim())) {
      setError("Complete the barangay, house/building number, street, and postal code.");
      return;
    }
    if (!SIPOCOT_BARANGAYS.includes(draft.barangay)) {
      setError("Choose a barangay in Sipocot from the dropdown.");
      return;
    }

    const now = new Date().toISOString();
    const address = {
      ...draft,
      ...SIPOCOT_LOCATION,
      barangayCode: draft.barangay,
      id: draft.id || createAddressId(),
      updatedAt: now,
    };
    const nextAddresses = addresses.some((item) => item.id === address.id)
      ? addresses.map((item) => (item.id === address.id ? address : item))
      : [...addresses, address];
    const currentDefaultId = addresses.find((item) => item.isDefault)?.id;
    const defaultId =
      address.isDefault || !currentDefaultId ? address.id : currentDefaultId;
    const withDefault = nextAddresses.map((item) => ({
      ...item,
      isDefault: item.id === defaultId,
    }));

    try {
      saveSavedAddresses(withDefault);
      setAddresses(withDefault);
      setDraft(null);
      setError("");
      showSuccess(addresses.some((item) => item.id === address.id)
        ? "Address updated"
        : "Address saved");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The address could not be saved.",
      );
      showError("Address could not be saved", "Please try again.");
    }
  };

  const setDefaultAddress = (id) => {
    const nextAddresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === id,
    }));
    try {
      saveSavedAddresses(nextAddresses);
      setAddresses(nextAddresses);
      showSuccess("Default address updated");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The default address could not be updated.",
      );
      showError("Default address could not be updated", "Please try again.");
    }
  };

  const deleteAddress = async (address) => {
    const result = await showConfirm({
      title: "Remove this address?",
      text: "This saved address will be deleted from your address book.",
      confirmText: "Delete address",
      cancelText: "Keep address",
    });
    if (!result.isConfirmed) return;

    const remaining = addresses.filter((item) => item.id !== address.id);
    const defaultId = address.isDefault
      ? remaining[0]?.id
      : remaining.find((item) => item.isDefault)?.id || remaining[0]?.id;
    const nextAddresses = remaining.map((item) => ({
      ...item,
      isDefault: item.id === defaultId,
    }));
    try {
      saveSavedAddresses(nextAddresses);
      setAddresses(nextAddresses);
      showSuccess("Address deleted");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The address could not be deleted.",
      );
      showError("Address could not be deleted", "Please try again.");
    }
  };

  const updateDraft = (event) => {
    const { name, value, checked, type } = event.target;
    setDraft((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <section className="mt-7 border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-bold text-[#F5F5F5]">Saved Addresses</h2>
          <p className="mb-0 mt-1 text-sm text-[#A1A1AA]">
            Save multiple Sipocot delivery addresses and choose a default.
          </p>
        </div>
        {!draft && (
          <button
            type="button"
            onClick={startNewAddress}
            className="rounded-lg bg-[#E63946] px-3 py-2 text-sm font-bold text-white hover:bg-[#C92D3A]"
          >
            Add Address
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {addresses.length === 0 && !draft && (
          <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-[#A1A1AA]">
            No saved addresses yet.
          </p>
        )}
        {addresses.map((address) => (
          <article
            key={address.id}
            className="rounded-lg border border-white/10 bg-[#22222B]/60 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#E63946] px-2 py-1 text-[10px] font-extrabold uppercase text-white">
                {address.label}
              </span>
              {address.isDefault && (
                <span className="rounded-full border border-[#E63946]/50 px-2 py-1 text-[10px] font-extrabold uppercase text-[#FF8B93]">
                  Default
                </span>
              )}
            </div>
            <p className="mb-0 mt-2 text-sm leading-relaxed text-[#D1D1D6]">
              {formatAddress(address)}
            </p>
            {(address.subdivision || address.landmark) && (
              <p className="mb-0 mt-1 text-xs text-[#A1A1AA]">
                {[address.subdivision, address.landmark && `Landmark: ${address.landmark}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setDefaultAddress(address.id)}
                disabled={address.isDefault}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#F5F5F5] disabled:opacity-50"
              >
                Set as Default
              </button>
              <button
                type="button"
                onClick={() => startEditAddress(address)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#F5F5F5]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => deleteAddress(address)}
                className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-300"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {draft && (
        <form
          onSubmit={saveAddress}
          className="mt-4 space-y-3 rounded-lg border border-white/10 bg-[#22222B]/60 p-4"
        >
          <h3 className="m-0 font-bold text-[#F5F5F5]">
            {draft.id ? "Edit Address" : "Add Address"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Region", SIPOCOT_LOCATION.region],
              ["Province", SIPOCOT_LOCATION.province],
              ["City/Municipality", SIPOCOT_LOCATION.city],
            ].map(([label, value]) => (
              <label key={label} className="text-xs font-bold text-[#A1A1AA]">
                {label}
                <input value={value} readOnly className={inputClass} />
              </label>
            ))}
            <label className="text-xs font-bold text-[#A1A1AA]">
              Barangay
              <select
                name="barangayCode"
                value={draft.barangayCode}
                onChange={(event) => {
                  const barangay = event.target.value;
                  setDraft((current) => ({
                    ...current,
                    barangayCode: barangay,
                    barangay,
                  }));
                }}
                className={inputClass}
                required
              >
                <option value="">Select barangay</option>
                {SIPOCOT_BARANGAYS.map((barangay) => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </select>
            </label>
            {[
              ["houseNumber", "House/Building Number", true],
              ["street", "Street Name", true],
              ["subdivision", "Subdivision/Village", false],
              ["landmark", "Landmark", false],
              ["postalCode", "Postal Code", true],
            ].map(([name, label, required]) => (
              <label key={name} className="text-xs font-bold text-[#A1A1AA]">
                {label}{!required && " (optional)"}
                <input
                  name={name}
                  value={draft[name]}
                  onChange={updateDraft}
                  className={inputClass}
                  required={required}
                />
              </label>
            ))}
            <label className="text-xs font-bold text-[#A1A1AA]">
              Address Label
              <select
                name="label"
                value={draft.label}
                onChange={updateDraft}
                className={inputClass}
              >
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-3 text-xs font-bold text-[#F5F5F5]">
              <input
                type="checkbox"
                name="isDefault"
                checked={draft.isDefault}
                onChange={updateDraft}
                className="h-4 w-4 accent-[#E63946]"
              />
              Set as Default Address
            </label>
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm font-semibold text-rose-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setError("");
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-[#D1D1D6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#E63946] px-3 py-2 text-sm font-bold text-white hover:bg-[#C92D3A]"
            >
              Save Address
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
