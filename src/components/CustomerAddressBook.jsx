import { useState } from "react";
import { showError, showSuccess } from "../utils/swal";
import { useCustomerAuth } from "../auth/customerAuthContext";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-[#22222B] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#E63946]";

export default function CustomerAddressBook() {
  const { customer, loading, updateCustomerProfile } = useCustomerAuth();
  const savedAddress = customer?.delivery_address?.trim() || "";
  const [draft, setDraft] = useState(null);
  const [draftBaseAddress, setDraftBaseAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setError("");
    setDraft(savedAddress);
    setDraftBaseAddress(savedAddress);
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    if (saving) return;

    const nextAddress = draft.trim();
    if (savedAddress !== draftBaseAddress) {
      setDraft(null);
      setError("This address changed while you were editing. Please reopen it and try again.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateCustomerProfile({ delivery_address: nextAddress || null });
      setDraft(null);
      showSuccess(nextAddress ? "Address updated" : "Address removed");
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : "The delivery address could not be saved.";
      setError(message);
      showError("Address could not be saved", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async () => {
    if (saving) return;

    setSaving(true);
    setError("");
    try {
      await updateCustomerProfile({ delivery_address: null });
      setDraft(null);
      showSuccess("Address deleted");
    } catch (deleteError) {
      const message = deleteError instanceof Error
        ? deleteError.message
        : "The delivery address could not be deleted.";
      setError(message);
      showError("Address could not be deleted", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-7 border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-bold text-[#F5F5F5]">Saved Addresses</h2>
          <p className="mb-0 mt-1 text-sm text-[#A1A1AA]">
            Save your delivery address for faster checkout.
          </p>
        </div>
        {!draft && !savedAddress && !loading && (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-lg bg-[#E63946] px-3 py-2 text-sm font-bold text-white hover:bg-[#C92D3A]"
          >
            Add Address
          </button>
        )}
      </div>

      {loading && (
        <p className="mt-4 rounded-lg border border-white/10 p-4 text-sm text-[#A1A1AA]">
          Loading your saved address...
        </p>
      )}

      {!loading && savedAddress && !draft && (
        <article className="mt-4 rounded-lg border border-white/10 bg-[#22222B]/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#E63946] px-2 py-1 text-[10px] font-extrabold uppercase text-white">
              Home
            </span>
            <span className="rounded-full border border-[#E63946]/50 px-2 py-1 text-[10px] font-extrabold uppercase text-[#FF8B93]">
              Default
            </span>
          </div>
          <p className="mb-0 mt-2 text-sm leading-relaxed text-[#D1D1D6]">
            {savedAddress}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#F5F5F5]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={deleteAddress}
              disabled={saving}
              className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-bold text-red-300 disabled:opacity-50"
            >
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </article>
      )}

      {!loading && !savedAddress && !draft && (
        <p className="mt-4 rounded-lg border border-dashed border-white/15 p-4 text-sm text-[#A1A1AA]">
          No saved addresses yet.
        </p>
      )}

      {draft !== null && (
        <form
          onSubmit={saveAddress}
          className="mt-4 space-y-3 rounded-lg border border-white/10 bg-[#22222B]/60 p-4"
        >
          <h3 className="m-0 font-bold text-[#F5F5F5]">
            {savedAddress ? "Edit Address" : "Add Address"}
          </h3>
          <label className="text-xs font-bold text-[#A1A1AA]">
            Delivery Address
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={`${inputClass} resize-y`}
              rows={4}
              placeholder="House number, street, barangay, city, province"
              required
            />
          </label>
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
                setDraftBaseAddress("");
                setError("");
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-[#D1D1D6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#E63946] px-3 py-2 text-sm font-bold text-white hover:bg-[#C92D3A] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Address"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
