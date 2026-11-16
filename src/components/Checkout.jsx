import { useState } from "react";
import { formatMoney } from "../data/menuData";

const emptyCustomer = { name: "", phone: "", email: "" };
const inputClass = "w-full rounded-xl border border-white/10 bg-[#22222B] px-4 py-3 text-[#F5F5F5] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20";
const readCustomer = () => {
  try {
    const profile = JSON.parse(localStorage.getItem("motopots-profile") || "{}");
    return { name: profile.name || "", phone: profile.phone || "", email: profile.email || "" };
  } catch { return emptyCustomer; }
};

function Checkout({ cartItems, subtotal, onBack, onSubmit, submitting = false }) {
  const [customer, setCustomer] = useState(readCustomer);
  const [orderType, setOrderType] = useState("Pickup");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashAmount, setCashAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proof, setProof] = useState(null);
  const [error, setError] = useState("");

  const cashValue = Number(cashAmount || 0);
  const change = cashValue - subtotal;
  const updateCustomer = (event) => setCustomer((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleProof = (event) => {
    const file = event.target.files?.[0];
    if (!file) { setProof(null); return; }
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Payment proof must be an image smaller than 5 MB.");
      setProof(null);
      return;
    }
    setError("");
    setProof(file);
  };
  const readProof = () => new Promise((resolve) => {
    if (!proof) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve({ name: proof.name, type: proof.type, size: proof.size, dataUrl: reader.result });
    reader.onerror = () => resolve({ name: proof.name, type: proof.type, size: proof.size });
    reader.readAsDataURL(proof);
  });
  const submit = async (event) => {
    event.preventDefault();
    if (!customer.name.trim() || !/^\+?[0-9\s()-]{7,20}$/.test(customer.phone.trim())) { setError("Enter a full name and a valid contact number."); return; }
    if (paymentMethod === "Cash" && cashValue < subtotal) { setError("Cash received must be at least the order total."); return; }
    if (paymentMethod === "GCash" && (!/^[A-Za-z0-9-]{6,40}$/.test(referenceNumber.trim()) || !proof)) { setError("Enter a valid GCash reference number and upload payment proof."); return; }
    setError("");
    await onSubmit({ customer, orderType, paymentMethod, cashReceived: paymentMethod === "Cash" ? cashValue : null, change: paymentMethod === "Cash" ? change : null, referenceNumber: paymentMethod === "GCash" ? referenceNumber.trim() : "", proof: paymentMethod === "GCash" ? await readProof() : null });
  };

  if (!cartItems.length) return <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#15151C] p-8 text-center"><h2 className="text-2xl font-extrabold text-[#F5F5F5]">Your cart is empty</h2><button type="button" onClick={onBack} className="mt-5 rounded-xl bg-[#E63946] px-5 py-3 font-bold text-white hover:bg-[#C92D3A]">Back to Menu</button></section>;

  return <form onSubmit={submit} className="mx-auto max-w-6xl pb-10">
    <div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-extrabold text-[#F5F5F5]">Checkout</h1><p className="mt-1 text-sm text-[#A1A1AA]">Review your order and choose how you will pay.</p></div><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-[#A1A1AA] hover:bg-[#22222B]">Back to Menu</button></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20"><h2 className="text-xl font-extrabold text-[#F5F5F5]">Customer Information</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-[#F5F5F5]">Full Name<input className={`mt-1.5 ${inputClass}`} name="name" value={customer.name} onChange={updateCustomer} required placeholder="Your full name" /></label><label className="text-sm font-bold text-[#F5F5F5]">Contact Number<input className={`mt-1.5 ${inputClass}`} name="phone" value={customer.phone} onChange={updateCustomer} required placeholder="09XXXXXXXXX" inputMode="tel" /></label><label className="text-sm font-bold text-[#F5F5F5] sm:col-span-2">Email Address <span className="font-normal text-[#A1A1AA]">(optional)</span><input className={`mt-1.5 ${inputClass}`} type="email" name="email" value={customer.email} onChange={updateCustomer} placeholder="you@example.com" /></label></div></section>
        <section className="rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20"><h2 className="text-xl font-extrabold text-[#F5F5F5]">Order Type</h2><label className="mt-4 block cursor-pointer rounded-xl border border-[#E63946] bg-[#E63946]/10 p-4"><input type="radio" name="orderType" value="Pickup" checked={orderType === "Pickup"} onChange={(event) => setOrderType(event.target.value)} className="mr-2 accent-[#E63946]" />Pickup <span className="ml-2 text-sm text-[#A1A1AA]">Collect your order at the restaurant.</span></label></section>
        <section className="rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20"><h2 className="text-xl font-extrabold text-[#F5F5F5]">Payment Method</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setPaymentMethod("Cash")} className={`rounded-xl border p-4 text-left transition ${paymentMethod === "Cash" ? "border-[#E63946] bg-[#E63946]/10" : "border-white/10 bg-[#22222B]"}`}><span className="text-lg">💵</span><span className="ml-2 font-extrabold text-[#F5F5F5]">Cash</span><p className="mt-1 text-xs text-[#A1A1AA]">Pay at the restaurant. Marked unpaid until received.</p></button><button type="button" onClick={() => setPaymentMethod("GCash")} className={`rounded-xl border p-4 text-left transition ${paymentMethod === "GCash" ? "border-[#E63946] bg-[#E63946]/10" : "border-white/10 bg-[#22222B]"}`}><span className="text-lg">📱</span><span className="ml-2 font-extrabold text-[#F5F5F5]">GCash</span><p className="mt-1 text-xs text-[#A1A1AA]">Manual payment, pending staff verification.</p></button></div>
          {paymentMethod === "Cash" ? <div className="mt-4 rounded-xl bg-[#22222B]/70 p-4"><label className="text-sm font-bold text-[#F5F5F5]">Amount you will pay<input className={`mt-1.5 ${inputClass}`} type="number" min={subtotal} step="0.01" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder={formatMoney(subtotal)} required /></label><p className={`mt-2 text-sm font-bold ${change >= 0 ? "text-green-300" : "text-red-300"}`}>{cashAmount ? change >= 0 ? `Expected change: ${formatMoney(change)}` : `Still needed: ${formatMoney(Math.abs(change))}` : "Enter the cash amount to calculate change."}</p></div> : <div className="mt-4 space-y-4 rounded-xl bg-[#22222B]/70 p-4"><div className="rounded-lg border border-dashed border-[#E63946]/50 p-3 text-sm text-[#A1A1AA]"><p className="font-bold text-[#F5F5F5]">GCash details pending setup</p><p className="mt-1">The restaurant&apos;s registered GCash name, number, and QR code will appear here once configured. Do not send payment to unverified accounts.</p><p className="mt-2 font-bold text-[#E63946]">Exact amount: {formatMoney(subtotal)}</p></div><label className="text-sm font-bold text-[#F5F5F5]">Reference Number<input className={`mt-1.5 ${inputClass}`} value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} placeholder="Enter your GCash reference" required /></label><label className="text-sm font-bold text-[#F5F5F5]">Payment Proof<input className="mt-1.5 block w-full rounded-xl border border-white/10 bg-[#22222B] px-4 py-3 text-sm text-[#A1A1AA] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E63946] file:px-3 file:py-2 file:font-bold file:text-white" type="file" accept="image/*" onChange={handleProof} required /></label>{proof && <p className="text-xs text-green-300">Selected: {proof.name}</p>}</div>}
        </section>
        {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#E63946] px-5 py-4 font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Submitting Order..." : "Place Order"}</button>
      </div>
      <aside className="h-fit rounded-2xl border border-white/10 bg-[#15151C] p-5 shadow-lg shadow-black/20 lg:sticky lg:top-6"><h2 className="text-xl font-extrabold text-[#F5F5F5]">Order Summary</h2><div className="mt-4 space-y-4">{cartItems.map((item) => <div key={item.id} className="flex gap-3 border-b border-white/10 pb-4"><img src={item.image} alt="" className="h-14 w-14 rounded-lg bg-[#22222B] object-contain" /><div className="min-w-0 flex-1"><p className="font-bold text-[#F5F5F5]">{item.name}</p>{item.details?.length > 0 && <p className="mt-1 break-words text-xs text-[#A1A1AA]">{item.details.join(" · ")}</p>}<p className="mt-1 text-xs text-[#A1A1AA]">{item.quantity} × {formatMoney(item.finalUnitPrice ?? item.price)}</p></div><span className="font-bold text-[#E63946]">{formatMoney((item.finalUnitPrice ?? item.price) * item.quantity)}</span></div>)}</div><div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-lg font-extrabold text-[#F5F5F5]"><span>Total</span><span className="text-[#E63946]">{formatMoney(subtotal)}</span></div></aside>
    </div>
  </form>;
}

export default Checkout;
