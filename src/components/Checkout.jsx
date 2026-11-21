import { useEffect, useState } from "react";
import { formatMoney } from "../data/menuData";
import {
  ADDRESSES_UPDATED_EVENT,
  createAddressId,
  emptyAddress,
  formatAddress,
  readSavedAddresses,
  saveSavedAddresses,
} from "../data/addressStorage";
import { loadPsgcArea, loadPsgcIndex, PSGC_SOURCE_URL } from "../data/psgc";
import gcashlogo from "../assets/GCash_logo.svg";
import { ImageWithSkeleton } from "./Skeleton";
import {
  showConfirm,
  showError,
  showSuccess,
  showWarning,
} from "../utils/swal";

const emptyCustomer = { name: "", phone: "", email: "" };
const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#22222B] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20";
const readCustomer = () => {
  try {
    const profile = JSON.parse(
      localStorage.getItem("motopots-profile") || "{}",
    );
    return {
      name: profile.name || "",
      phone: profile.phone || "",
      email: profile.email || "",
    };
  } catch {
    return emptyCustomer;
  }
};

function SearchableLocationField({
  id,
  label,
  value,
  options,
  onSelect,
  disabled = false,
  required = true,
}) {
  return (
    <label className="text-sm font-bold text-[#F5F5F5]">
      {label}
      <input
        list={id}
        value={value || ""}
        onChange={(event) =>
          onSelect(
            options.find((option) => option.name === event.target.value) ||
              null,
          )
        }
        disabled={disabled}
        required={required}
        placeholder={`Search ${label.toLowerCase()}`}
        className={`mt-1.5 ${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
      />
      <datalist id={id}>
        {options.map((option) => (
          <option key={option.code} value={option.name} />
        ))}
      </datalist>
    </label>
  );
}

function Checkout({
  cartItems,
  subtotal,
  onBack,
  onSubmit,
  submitting = false,
  storeOpen = true,
  initialOrderType = "Pickup",
}) {
  const [customer, setCustomer] = useState(readCustomer);
  const [orderType, setOrderType] = useState(initialOrderType);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashAmount, setCashAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proof, setProof] = useState(null);
  const [error, setError] = useState("");
  const [addresses, setAddresses] = useState(readSavedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(
    () => readSavedAddresses().find((address) => address.isDefault)?.id || null,
  );
  const [addressManagerOpen, setAddressManagerOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState(emptyAddress);
  const [addressError, setAddressError] = useState("");
  const [psgcIndex, setPsgcIndex] = useState(null);
  const [psgcArea, setPsgcArea] = useState(null);
  const [psgcLoading, setPsgcLoading] = useState(false);
  const [psgcError, setPsgcError] = useState("");

  const activeAddressId = addresses.some(
    (address) => address.id === selectedAddressId,
  )
    ? selectedAddressId
    : addresses.find((address) => address.isDefault)?.id ||
      addresses[0]?.id ||
      null;
  const selectedAddress =
    addresses.find((address) => address.id === activeAddressId) || null;
  const selectedRegion = psgcIndex?.regions?.find(
    (region) => region.code === addressDraft.regionCode,
  );
  const provinceOptions = selectedRegion
    ? [
        ...(selectedRegion.provinces || []),
        ...(selectedRegion.independent || []),
      ]
    : [];
  const cityOptions = psgcArea?.cities || [];
  const barangayOptions =
    psgcArea?.cities
      ?.find((city) => city.code === addressDraft.cityCode)
      ?.barangays?.map(([code, name]) => ({ code, name })) || [];

  useEffect(() => {
    const syncAddresses = () => setAddresses(readSavedAddresses());
    window.addEventListener(ADDRESSES_UPDATED_EVENT, syncAddresses);
    window.addEventListener("storage", syncAddresses);
    return () => {
      window.removeEventListener(ADDRESSES_UPDATED_EVENT, syncAddresses);
      window.removeEventListener("storage", syncAddresses);
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadPsgcIndex()
      .then((data) => {
        if (active) setPsgcIndex(data);
      })
      .catch(() => {
        if (active)
          setPsgcError(
            "Philippine location data could not be loaded. Check your connection and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const cashValue = Number(cashAmount || 0);
  const change = cashValue - subtotal;
  const updateCustomer = (event) =>
    setCustomer((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const openAddressManager = () => {
    setAddressError("");
    setAddressManagerOpen(true);
  };
  const startNewAddress = () => {
    setAddressError("");
    setAddressDraft({ ...emptyAddress, isDefault: addresses.length === 0 });
    setPsgcArea(null);
  };
  const startEditAddress = (address) => {
    setAddressError("");
    setAddressDraft({ ...emptyAddress, ...address });
    setPsgcArea(null);
    if (address.provinceCode || address.cityCode) {
      setPsgcLoading(true);
      loadPsgcArea(address.provinceCode || address.cityCode)
        .then(setPsgcArea)
        .catch(() => setPsgcError("Unable to load the saved location data."))
        .finally(() => setPsgcLoading(false));
    }
  };
  const updateAddressDraft = (event) => {
    const { name, value, checked, type } = event.target;
    setAddressDraft((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const selectRegion = (event) => {
    const region = psgcIndex?.regions?.find(
      (item) => item.code === event.target.value,
    );
    setAddressDraft((current) => ({
      ...current,
      regionCode: region?.code || "",
      region: region?.name || "",
      provinceCode: "",
      province: "",
      cityCode: "",
      city: "",
      barangayCode: "",
      barangay: "",
    }));
    setPsgcArea(null);
  };
  const selectProvince = (event) => {
    const options = [
      ...(psgcIndex?.regions?.find(
        (item) => item.code === addressDraft.regionCode,
      )?.provinces || []),
      ...(psgcIndex?.regions?.find(
        (item) => item.code === addressDraft.regionCode,
      )?.independent || []),
    ];
    const selected = options.find((item) => item.code === event.target.value);
    const independent = Boolean(
      selected?.type &&
      !psgcIndex?.regions
        ?.find((item) => item.code === addressDraft.regionCode)
        ?.provinces?.some((item) => item.code === selected.code),
    );
    setAddressDraft((current) => ({
      ...current,
      provinceCode: independent ? "" : selected?.code || "",
      province: independent ? "" : selected?.name || "",
      cityCode: independent ? selected?.code || "" : "",
      city: independent ? selected?.name || "" : "",
      barangayCode: "",
      barangay: "",
      isIndependent: independent,
    }));
    setPsgcLoading(true);
    loadPsgcArea(selected?.code)
      .then(setPsgcArea)
      .catch(() =>
        setPsgcError("Unable to load the selected province or city."),
      )
      .finally(() => setPsgcLoading(false));
  };
  const selectCity = (event) => {
    const selected = psgcArea?.cities?.find(
      (item) => item.code === event.target.value,
    );
    setAddressDraft((current) => ({
      ...current,
      cityCode: selected?.code || "",
      city: selected?.name || "",
      barangayCode: "",
      barangay: "",
    }));
  };
  const selectBarangay = (event) => {
    const selected = psgcArea?.cities
      ?.find((city) => city.code === addressDraft.cityCode)
      ?.barangays?.find((item) => item[0] === event.target.value);
    setAddressDraft((current) => ({
      ...current,
      barangayCode: selected?.[0] || "",
      barangay: selected?.[1] || "",
    }));
  };
  const saveAddress = () => {
    const required = [
      "region",
      "city",
      "barangay",
      "street",
      "houseNumber",
      "postalCode",
    ];
    if (required.some((field) => !String(addressDraft[field] || "").trim())) {
      setAddressError("Complete all required address fields before saving.");
      showWarning(
        "Incomplete address",
        "Complete all required delivery location fields before saving.",
      );
      return;
    }
    if (!addressDraft.province && !addressDraft.isIndependent) {
      setAddressError(
        "Select a province or independent city from the location list.",
      );
      showWarning(
        "Select a location",
        "Choose a province or independent city from the searchable list.",
      );
      return;
    }
    const location = { ...addressDraft };
    delete location.fullName;
    delete location.phone;
    const wasEditing = Boolean(addressDraft.id);
    const address = {
      ...location,
      id: addressDraft.id || createAddressId(),
      updatedAt: new Date().toISOString(),
    };
    const nextAddresses = addresses.some((item) => item.id === address.id)
      ? addresses.map((item) => (item.id === address.id ? address : item))
      : [...addresses, address];
    const withDefault =
      address.isDefault || nextAddresses.length === 1
        ? nextAddresses.map((item) => ({
            ...item,
            isDefault: item.id === address.id,
          }))
        : nextAddresses;
    saveSavedAddresses(withDefault);
    setAddresses(withDefault);
    setSelectedAddressId(address.id);
    setAddressDraft(emptyAddress);
    setAddressError("");
    showSuccess(
      wasEditing
        ? "Address updated successfully"
        : "Address added successfully",
    );
  };
  const setDefaultAddress = (id) => {
    const nextAddresses = addresses.map((address) => ({
      ...address,
      isDefault: address.id === id,
    }));
    saveSavedAddresses(nextAddresses);
    setAddresses(nextAddresses);
    showSuccess("Default address updated");
  };
  const deleteAddress = async (address) => {
    if (address.id === activeAddressId) {
      setAddressError(
        "Select another address before deleting the address used for this checkout.",
      );
      return;
    }
    const result = await showConfirm({
      title: "Remove this address?",
      text: "Are you sure you want to delete this saved address?",
      confirmText: "Yes, remove",
      cancelText: "Keep address",
    });
    if (!result.isConfirmed) return;
    const remaining = addresses.filter((item) => item.id !== address.id);
    const nextAddresses =
      address.isDefault && remaining.length
        ? remaining.map((item, index) => ({ ...item, isDefault: index === 0 }))
        : remaining;
    saveSavedAddresses(nextAddresses);
    setAddresses(nextAddresses);
    showSuccess("Address deleted successfully");
  };
  const handleProof = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProof(null);
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Payment proof must be an image smaller than 5 MB.");
      showError("Invalid payment proof", "Upload an image smaller than 5 MB.");
      setProof(null);
      return;
    }
    setError("");
    setProof(file);
  };
  const readProof = () =>
    new Promise((resolve) => {
      if (!proof) return resolve(null);
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: proof.name,
          type: proof.type,
          size: proof.size,
          dataUrl: reader.result,
        });
      reader.onerror = () =>
        resolve({ name: proof.name, type: proof.type, size: proof.size });
      reader.readAsDataURL(proof);
    });
  const submit = async (event) => {
    event.preventDefault();
    if (!storeOpen) {
      setError("Sorry, we're currently closed and not accepting orders.");
      showWarning(
        "Store is closed",
        "Sorry, we're currently closed and not accepting orders.",
      );
      return;
    }
    if (
      !customer.name.trim() ||
      !/^\+?[0-9\s()-]{7,20}$/.test(customer.phone.trim())
    ) {
      setError("Enter a full name and a valid contact number.");
      showWarning(
        "Check customer information",
        "Enter a full name and a valid contact number.",
      );
      return;
    }
    if (orderType === "Delivery" && !selectedAddress) {
      setError("Select or add a delivery address before placing your order.");
      showWarning(
        "Delivery address required",
        "Select or add a delivery address before placing your order.",
      );
      return;
    }
    if (paymentMethod === "Cash" && cashValue < subtotal) {
      setError("Cash received must be at least the order total.");
      showWarning(
        "Insufficient cash",
        "Cash received must be at least the order total.",
      );
      return;
    }
    if (
      paymentMethod === "GCash" &&
      (!/^[A-Za-z0-9-]{6,40}$/.test(referenceNumber.trim()) || !proof)
    ) {
      setError(
        "Enter a valid GCash reference number and upload payment proof.",
      );
      showWarning(
        "Check payment details",
        "Enter a valid GCash reference number and upload payment proof.",
      );
      return;
    }
    setError("");
    await onSubmit({
      customer,
      orderType,
      paymentMethod,
      cashReceived: paymentMethod === "Cash" ? cashValue : null,
      change: paymentMethod === "Cash" ? change : null,
      referenceNumber: paymentMethod === "GCash" ? referenceNumber.trim() : "",
      proof: paymentMethod === "GCash" ? await readProof() : null,
      deliveryAddressId: orderType === "Delivery" ? selectedAddress.id : null,
      deliveryAddress: orderType === "Delivery" ? { ...selectedAddress } : null,
    });
    showSuccess("Order placed successfully", "Your order has been submitted.");
  };

  if (!cartItems.length)
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#15151C] p-8 text-center">
        <h2 className="text-2xl font-extrabold text-[#F5F5F5]">
          Your cart is empty
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 rounded-xl bg-[#E63946] px-5 py-3 font-bold text-white hover:bg-[#C92D3A]"
        >
          Back to Menu
        </button>
      </section>
    );

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-6xl flex-col overflow-hidden pb-2 lg:h-[calc(100dvh-6rem)]"
    >
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 sm:mb-6 sm:gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F5F5F5] sm:text-3xl">
            Checkout
          </h1>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Review your order and choose how you will pay.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-[#A1A1AA] hover:bg-[#22222B] sm:px-4"
        >
          Back to Menu
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(12rem,35dvh)] gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-1">
        <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
          <section className="rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20">
            <h2 className="text-xl font-extrabold text-[#F5F5F5]">
              Customer Information
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-[#F5F5F5]">
                Full Name
                <input
                  className={`mt-1.5 ${inputClass}`}
                  name="name"
                  value={customer.name}
                  onChange={updateCustomer}
                  required
                  placeholder="Your full name"
                />
              </label>
              <label className="text-sm font-bold text-[#F5F5F5]">
                Contact Number
                <input
                  className={`mt-1.5 ${inputClass}`}
                  name="phone"
                  value={customer.phone}
                  onChange={updateCustomer}
                  required
                  placeholder="09XXXXXXXXX"
                  inputMode="tel"
                />
              </label>
              <label className="text-sm font-bold text-[#F5F5F5] sm:col-span-2">
                Email Address{" "}
                <span className="font-normal text-[#A1A1AA]">(optional)</span>
                <input
                  className={`mt-1.5 ${inputClass}`}
                  type="email"
                  name="email"
                  value={customer.email}
                  onChange={updateCustomer}
                  placeholder="you@example.com"
                />
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20">
            <h2 className="text-xl font-extrabold text-[#F5F5F5]">
              Order Type
            </h2>
            <label className="mt-4 block cursor-pointer rounded-xl border border-[#E63946] bg-[#E63946]/10 p-4">
              <input
                type="radio"
                name="orderType"
                value="Dine-in"
                checked={orderType === "Dine-in"}
                onChange={(event) => setOrderType(event.target.value)}
                className="mr-2 accent-[#E63946]"
              />
              For Here{" "}
              <span className="ml-2 text-sm text-[#A1A1AA]">
                Eat at the restaurant.
              </span>
            </label>
            <label className="mt-4 block cursor-pointer rounded-xl border border-[#E63946] bg-[#E63946]/10 p-4">
              <input
                type="radio"
                name="orderType"
                value="Pickup"
                checked={orderType === "Pickup"}
                onChange={(event) => setOrderType(event.target.value)}
                className="mr-2 accent-[#E63946]"
              />
              To Go{" "}
              <span className="ml-2 text-sm text-[#A1A1AA]">
                Collect your order at the restaurant.
              </span>
            </label>
            <label className="mt-4 block cursor-pointer rounded-xl border border-[#E63946] bg-[#E63946]/10 p-4">
              <input
                type="radio"
                name="orderType"
                value="Delivery"
                checked={orderType === "Delivery"}
                onChange={(event) => setOrderType(event.target.value)}
                className="mr-2 accent-[#E63946]"
              />
              For Delivery{" "}
              <span className="ml-2 text-sm text-[#A1A1AA]">
                Have your order delivered to your address.
              </span>
            </label>
          </section>
          {orderType === "Delivery" && (
            <section className="rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#F5F5F5]">
                    Delivery Address
                  </h2>
                  <p className="mt-1 text-sm text-[#A1A1AA]">
                    Choose where this order should be delivered.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddressManager}
                  className="rounded-xl border border-[#E63946] px-3 py-2 text-sm font-extrabold text-[#FF8B93] hover:bg-[#E63946]/10"
                >
                  {selectedAddress ? "Change Address" : "Add Address"}
                </button>
              </div>
              {selectedAddress ? (
                <div className="mt-4 rounded-xl border border-[#E63946]/60 bg-[#E63946]/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E63946] px-2.5 py-1 text-[10px] font-extrabold uppercase text-white">
                      {selectedAddress.label}
                    </span>
                    {selectedAddress.isDefault && (
                      <span className="rounded-full border border-[#E63946]/50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#FF8B93]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#D1D1D6]">
                    {formatAddress(selectedAddress)}
                  </p>
                  {(selectedAddress.subdivision ||
                    selectedAddress.landmark) && (
                    <p className="mt-1 text-xs text-[#A1A1AA]">
                      {[
                        selectedAddress.subdivision,
                        selectedAddress.landmark &&
                          `Landmark: ${selectedAddress.landmark}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#E63946]/50 bg-[#E63946]/5 p-5 text-center">
                  <p className="font-extrabold text-[#F5F5F5]">
                    No saved delivery address
                  </p>
                  <p className="mt-1 text-sm text-[#A1A1AA]">
                    Add an address to continue with delivery.
                  </p>
                  <button
                    type="button"
                    onClick={openAddressManager}
                    className="mt-3 rounded-xl bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#C92D3A]"
                  >
                    Add New Address
                  </button>
                </div>
              )}
            </section>
          )}
          <section className="rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20">
            <h2 className="text-xl font-extrabold text-[#F5F5F5]">
              Payment Method
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("Cash")}
                className={`rounded-xl border p-4 text-left transition ${paymentMethod === "Cash" ? "border-[#E63946] bg-[#E63946]/10" : "border-white/10 bg-[#22222B]"}`}
              >
                <span className="text-lg">💵</span>
                <span className="ml-2 font-extrabold text-[#F5F5F5]">Cash</span>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  Pay at the restaurant. Marked unpaid until received.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("GCash")}
                className={`rounded-xl border p-4 text-left transition ${paymentMethod === "GCash" ? "border-[#E63946] bg-[#E63946]/10" : "border-white/10 bg-[#22222B]"}`}
              >
                <span className="text-lg">
                  <img src={gcashlogo} alt="GCash" className="h-20  w-20" />
                </span>
                <p className="mt-1 text-xs text-[#A1A1AA]">
                  Manual payment, pending staff verification.
                </p>
              </button>
            </div>
            {paymentMethod === "Cash" ? (
              <div className="mt-4 rounded-xl bg-[#22222B]/70 p-4">
                <label className="text-sm font-bold text-[#F5F5F5]">
                  Amount you will pay
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    type="number"
                    min={subtotal}
                    step="0.01"
                    value={cashAmount}
                    onChange={(event) => setCashAmount(event.target.value)}
                    placeholder={formatMoney(subtotal)}
                    required
                  />
                </label>
                <p
                  className={`mt-2 text-sm font-bold ${change >= 0 ? "text-green-300" : "text-red-300"}`}
                >
                  {cashAmount
                    ? change >= 0
                      ? `Expected change: ${formatMoney(change)}`
                      : `Still needed: ${formatMoney(Math.abs(change))}`
                    : "Enter the cash amount to calculate change."}
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4 rounded-xl bg-[#22222B]/70 p-4">
                <div className="rounded-lg border border-dashed border-[#E63946]/50 p-3 text-sm text-[#A1A1AA]">
                  <p className="font-bold text-[#F5F5F5]">
                    GCash details pending setup
                  </p>
                  <p className="mt-1">
                    The restaurant&apos;s registered GCash name, number, and QR
                    code will appear here once configured. Do not send payment
                    to unverified accounts.
                  </p>
                  <p className="font-heading mt-2 font-bold text-[#E63946]">
                    Exact amount: {formatMoney(subtotal)}
                  </p>
                </div>
                <label className="text-sm font-bold text-[#F5F5F5]">
                  Reference Number
                  <input
                    className={`mt-1.5 ${inputClass}`}
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="Enter your GCash reference"
                    required
                  />
                </label>
                <label className="text-sm font-bold text-[#F5F5F5]">
                  Payment Proof
                  <input
                    className="mt-1.5 block w-full rounded-xl border border-white/10 bg-[#22222B] px-4 py-3 text-sm text-[#A1A1AA] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E63946] file:px-3 file:py-2 file:font-bold file:text-white"
                    type="file"
                    accept="image/*"
                    onChange={handleProof}
                    required
                  />
                </label>
                {proof && (
                  <p className="text-xs text-green-300">
                    Selected: {proof.name}
                  </p>
                )}
              </div>
            )}
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#E63946] px-5 py-4 font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting Order..." : "Place Order"}
          </button>
        </div>
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20">
          <h2 className="text-xl font-extrabold text-[#F5F5F5]">
            Order Summary
          </h2>
          <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex min-w-0 items-start gap-3 border-b border-white/10 pb-4"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#22222B] sm:h-28 sm:w-28">
                  <ImageWithSkeleton
                    src={item.image}
                    alt=""
                    className="h-full w-full rounded-lg object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#F5F5F5]">{item.name}</p>
                  {item.details?.length > 0 && (
                    <p className="mt-1 break-words text-xs text-[#A1A1AA]">
                      {item.details.join(" · ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-1 break-words text-xs italic text-[#D8A6AA]">
                      Note: {item.notes}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#A1A1AA]">
                    {item.quantity} ×{" "}
                    {formatMoney(item.finalUnitPrice ?? item.price)}
                  </p>
                </div>
                <span className="font-heading shrink-0 font-bold text-[#E63946]">
                  {formatMoney(
                    (item.finalUnitPrice ?? item.price) * item.quantity,
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex shrink-0 justify-between border-t border-white/10 pt-4 text-lg font-extrabold text-[#F5F5F5]">
            <span>Total</span>
            <span className="font-heading font-bold text-[#E63946]">
              {formatMoney(subtotal)}
            </span>
          </div>
        </aside>
      </div>
      {addressManagerOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAddressManagerOpen(false);
              setAddressDraft(emptyAddress);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-manager-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-2xl shadow-black/50 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="address-manager-title"
                  className="text-xl font-extrabold text-[#F5F5F5]"
                >
                  Delivery Addresses
                </h2>
                <p className="mt-1 text-sm text-[#A1A1AA]">
                  Select an address for this order or manage your saved
                  addresses.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddressManagerOpen(false);
                  setAddressDraft(emptyAddress);
                }}
                aria-label="Close address manager"
                className="rounded-lg px-2 text-2xl leading-none text-[#A1A1AA] hover:text-[#E63946]"
              >
                &times;
              </button>
            </div>
            {!addressDraft.id && (
              <div className="mt-5 space-y-3">
                {addresses.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-[#A1A1AA]">
                    You have no saved addresses yet.
                  </p>
                )}
                {addresses.map((address) => (
                  <article
                    key={address.id}
                    className={`rounded-xl border p-4 transition ${activeAddressId === address.id ? "border-[#E63946] bg-[#E63946]/10" : "border-white/10 bg-[#22222B]/60"}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(address.id);
                        setAddressManagerOpen(false);
                      }}
                      className="w-full text-left"
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
                        {activeAddressId === address.id && (
                          <span className="ml-auto text-xs font-extrabold text-[#FF8B93]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[#D1D1D6]">
                        {formatAddress(address)}
                      </p>
                      {(address.subdivision || address.landmark) && (
                        <p className="mt-1 text-xs text-[#A1A1AA]">
                          {[
                            address.subdivision,
                            address.landmark && `Landmark: ${address.landmark}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => setDefaultAddress(address.id)}
                        disabled={address.isDefault}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#F5F5F5] disabled:cursor-default disabled:opacity-50"
                      >
                        Set as Default
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditAddress(address)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#F5F5F5] hover:bg-[#15151C]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAddress(address)}
                        className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={startNewAddress}
                  className="w-full rounded-xl border border-dashed border-[#E63946]/60 px-4 py-3 text-sm font-extrabold text-[#FF8B93] hover:bg-[#E63946]/10"
                >
                  + Add New Address
                </button>
              </div>
            )}
            {addressDraft &&
              (addressDraft.id ||
                (addressManagerOpen && !addresses.length) ||
                addressDraft !== emptyAddress) &&
              addressDraft !== emptyAddress && (
                <div className="mt-5 rounded-xl border border-white/10 bg-[#22222B]/60 p-4">
                  <h3 className="font-extrabold text-[#F5F5F5]">
                    {addressDraft.id ? "Edit Address" : "Add New Address"}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SearchableLocationField
                      id="address-region-list"
                      label="Region"
                      value={addressDraft.region}
                      options={psgcIndex?.regions || []}
                      onSelect={(option) =>
                        selectRegion({ target: { value: option?.code || "" } })
                      }
                      disabled={!psgcIndex}
                    />
                    <SearchableLocationField
                      id="address-province-list"
                      label={
                        addressDraft.isIndependent
                          ? "Province (not applicable)"
                          : "Province"
                      }
                      value={
                        addressDraft.province ||
                        (addressDraft.isIndependent ? "Independent city" : "")
                      }
                      options={provinceOptions}
                      onSelect={(option) =>
                        selectProvince({
                          target: { value: option?.code || "" },
                        })
                      }
                      disabled={
                        !addressDraft.regionCode || addressDraft.isIndependent
                      }
                      required={!addressDraft.isIndependent}
                    />
                    <SearchableLocationField
                      id="address-city-list"
                      label="City/Municipality"
                      value={addressDraft.city}
                      options={cityOptions}
                      onSelect={(option) =>
                        selectCity({ target: { value: option?.code || "" } })
                      }
                      disabled={!psgcArea || addressDraft.isIndependent}
                    />
                    <SearchableLocationField
                      id="address-barangay-list"
                      label="Barangay"
                      value={addressDraft.barangay}
                      options={barangayOptions}
                      onSelect={(option) =>
                        selectBarangay({
                          target: { value: option?.code || "" },
                        })
                      }
                      disabled={!addressDraft.cityCode}
                    />
                    {[
                      ["street", "Street Name", true],
                      ["houseNumber", "House/Building Number", true],
                      ["subdivision", "Subdivision/Village", false],
                      ["landmark", "Landmark", false],
                      ["postalCode", "Postal Code", true],
                    ].map(([name, label, required]) => (
                      <label
                        key={name}
                        className="text-sm font-bold text-[#F5F5F5]"
                      >
                        {label}
                        {!required && (
                          <span className="ml-1 font-normal text-[#A1A1AA]">
                            (optional)
                          </span>
                        )}
                        <input
                          name={name}
                          value={addressDraft[name]}
                          onChange={updateAddressDraft}
                          required={required}
                          className={`mt-1.5 ${inputClass}`}
                        />
                      </label>
                    ))}
                    <label className="text-sm font-bold text-[#F5F5F5]">
                      Address Label
                      <select
                        name="label"
                        value={addressDraft.label}
                        onChange={updateAddressDraft}
                        className={`mt-1.5 ${inputClass}`}
                      >
                        <option>Home</option>
                        <option>Work</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-[#F5F5F5]">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={addressDraft.isDefault}
                        onChange={updateAddressDraft}
                        className="h-4 w-4 accent-[#E63946]"
                      />
                      Set as Default Address
                    </label>
                  </div>
                  {psgcLoading && (
                    <p className="mt-3 text-xs text-[#A1A1AA]">
                      Loading Philippine location data…
                    </p>
                  )}
                  {psgcError && (
                    <p
                      role="alert"
                      className="mt-3 text-xs font-bold text-red-300"
                    >
                      {psgcError}{" "}
                      <a
                        href={PSGC_SOURCE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        View source
                      </a>
                    </p>
                  )}
                  {addressError && (
                    <p
                      role="alert"
                      className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300"
                    >
                      {addressError}
                    </p>
                  )}
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setAddressDraft(emptyAddress);
                        setAddressError("");
                      }}
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-[#F5F5F5] hover:bg-[#15151C]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveAddress}
                      className="rounded-xl bg-[#E63946] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#C92D3A]"
                    >
                      Save Address
                    </button>
                  </div>
                </div>
              )}
          </section>
        </div>
      )}
    </form>
  );
}

export default Checkout;
