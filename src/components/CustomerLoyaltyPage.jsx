import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock3,
  Gift,
  History,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { showConfirm, showError, showSuccess } from "../utils/swal";

// Demonstration-only data until loyalty points are connected to customer accounts.
const MOCK_LOYALTY_DATA = {
  balance: 250,
  transactions: [
    { id: 1, date: "Nov 18, 2026", description: "Completed order #MP-1048", points: 85, status: "Earned" },
    { id: 2, date: "Nov 12, 2026", description: "Completed order #MP-1039", points: 60, status: "Earned" },
    { id: 3, date: "Nov 05, 2026", description: "Completed order #MP-1027", points: 105, status: "Earned" },
  ],
};

const REWARDS = [
  { id: "discount-20", points: 50, name: "₱20 Discount", description: "Save ₱20 on your next order.", icon: Gift, accent: "from-[#E63946]/25 to-[#E63946]/5" },
  { id: "discount-50", points: 100, name: "₱50 Discount", description: "Enjoy ₱50 off your next order.", icon: Award, accent: "from-[#F59E0B]/25 to-[#F59E0B]/5" },
  { id: "discount-120", points: 200, name: "₱120 Discount", description: "Take ₱120 off a future order.", icon: Sparkles, accent: "from-[#A855F7]/25 to-[#A855F7]/5" },
  { id: "free-fries", points: 300, name: "Free Fries", description: "Redeem a serving of our crispy fries.", icon: Gift, accent: "from-[#34D399]/25 to-[#34D399]/5" },
];

function LoyaltySkeleton() {
  return <div className="mx-auto max-w-6xl animate-pulse px-4 pb-12 pt-5 sm:px-6"><div className="h-8 w-48 rounded bg-white/10" /><div className="mt-6 h-48 rounded-3xl bg-white/10" /><div className="mt-8 h-8 w-56 rounded bg-white/10" /><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{REWARDS.map((reward) => <div key={reward.id} className="h-64 rounded-2xl bg-white/10" />)}</div></div>;
}

export default function CustomerLoyaltyPage() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(MOCK_LOYALTY_DATA.balance);
  const [transactions, setTransactions] = useState(MOCK_LOYALTY_DATA.transactions);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const redeemReward = async (reward) => {
    if (balance < reward.points) {
      showError("Not enough points", `You need ${reward.points - balance} more points to redeem this reward.`);
      return;
    }
    const result = await showConfirm({
      title: `Redeem ${reward.name}?`,
      text: `${reward.points} points will be used for this reward.`,
      confirmText: "Redeem reward",
      icon: "question",
    });
    if (!result.isConfirmed) return;
    setBalance((current) => current - reward.points);
    setTransactions((current) => [{
      id: `redeemed-${Date.now()}`,
      date: "Just now",
      description: `Redeemed ${reward.name}`,
      points: -reward.points,
      status: "Redeemed",
    }, ...current]);
    showSuccess("Reward redeemed", `${reward.name} is ready to use.`);
  };

  if (loading) return <LoyaltySkeleton />;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <Link to="/customer" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#A1A1AA] no-underline transition hover:text-white">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to dashboard
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-[#FF727D]">Member benefits</p><h1 className="display-heading mb-0 mt-1 text-3xl text-white sm:text-4xl">Loyalty Points</h1><p className="mb-0 mt-2 text-sm text-[#A1A1AA]">Make every MotoPot&apos;s order count.</p></div>
        <div className="hidden rounded-full border border-[#E63946]/25 bg-[#E63946]/10 px-3 py-1.5 text-xs font-bold text-[#FF9CA4] sm:block">Rewards preview</div>
      </div>

      <div className="relative mt-7 overflow-hidden rounded-3xl border border-[#FF727D]/25 bg-gradient-to-br from-[#3A2025] via-[#22222B] to-[#15151C] p-6 shadow-2xl shadow-[#E63946]/10 sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-[#E63946]/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div><div className="flex items-center gap-2 text-sm font-bold text-[#FFB1B7]"><Gift aria-hidden="true" className="h-5 w-5" /> Your points balance</div><p className="mb-1 mt-3 font-heading text-5xl font-extrabold tracking-tight text-white sm:text-6xl">{balance.toLocaleString()} <span className="text-2xl text-[#FF727D] sm:text-3xl">Points</span></p><p className="mb-0 max-w-md text-sm leading-6 text-[#D4D4D8]">Earn points with every order and enjoy exclusive rewards!</p></div>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#FFB1B7] shadow-lg backdrop-blur-xl sm:h-24 sm:w-24"><Award aria-hidden="true" className="h-10 w-10 sm:h-12 sm:w-12" /></div>
        </div>
      </div>

      <section className="mt-10" aria-labelledby="earn-heading"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34D399]/10 text-[#6EE7B7]"><Sparkles aria-hidden="true" className="h-5 w-5" /></div><div><h2 id="earn-heading" className="mb-0 text-2xl text-white">How to earn points</h2><p className="mb-0 mt-1 text-sm text-[#A1A1AA]">Simple rewards for every delicious order.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/[0.08] bg-[#15151C] p-4"><p className="mb-1 text-lg font-extrabold text-[#6EE7B7]">01</p><p className="mb-0 text-sm font-bold text-white">Earn 1 point for every ₱10 spent.</p></div><div className="rounded-2xl border border-white/[0.08] bg-[#15151C] p-4"><p className="mb-1 text-lg font-extrabold text-[#6EE7B7]">02</p><p className="mb-0 text-sm font-bold text-white">Points are added after a successful, completed order.</p></div><div className="rounded-2xl border border-white/[0.08] bg-[#15151C] p-4"><p className="mb-1 text-lg font-extrabold text-[#FF727D]">03</p><p className="mb-0 text-sm font-bold text-white">Canceled orders do not earn points.</p></div></div></section>

      <section className="mt-10" aria-labelledby="rewards-heading"><div className="flex items-end justify-between gap-3"><div><h2 id="rewards-heading" className="mb-0 text-2xl text-white">Available rewards</h2><p className="mb-0 mt-1 text-sm text-[#A1A1AA]">Use your points on your next craving.</p></div><span className="text-xs font-bold text-[#71717A]">{REWARDS.length} rewards</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{REWARDS.map((reward) => { const Icon = reward.icon; const canRedeem = balance >= reward.points; return <article key={reward.id} className={`group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#15151C] p-4 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-[#E63946]/35 hover:shadow-[#E63946]/10 ${!canRedeem ? "opacity-75" : ""}`}><div className={`flex h-24 items-center justify-center rounded-xl bg-gradient-to-br ${reward.accent} text-white`}><Icon aria-hidden="true" className="h-10 w-10 transition duration-300 group-hover:scale-110" /></div><div className="mt-4 flex items-start justify-between gap-2"><h3 className="mb-0 text-base text-white">{reward.name}</h3><span className="shrink-0 rounded-full bg-[#E63946]/10 px-2 py-1 text-[11px] font-extrabold text-[#FF9CA4]">{reward.points} pts</span></div><p className="mb-0 mt-2 min-h-10 text-xs leading-5 text-[#A1A1AA]">{reward.description}</p><button type="button" onClick={() => redeemReward(reward)} disabled={!canRedeem} className="mt-4 min-h-10 w-full rounded-xl bg-[#E63946] px-3 text-sm font-extrabold text-white transition hover:bg-[#C92D3A] disabled:cursor-not-allowed disabled:bg-[#22222B] disabled:text-[#71717A]">{canRedeem ? "Redeem reward" : `Need ${reward.points - balance} more pts`}</button></article>; })}</div></section>

      <section className="mt-10" aria-labelledby="history-heading"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A855F7]/10 text-[#D8B4FE]"><History aria-hidden="true" className="h-5 w-5" /></div><div><h2 id="history-heading" className="mb-0 text-2xl text-white">Points history</h2><p className="mb-0 mt-1 text-sm text-[#A1A1AA]">A clear record of your loyalty activity.</p></div></div><div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#15151C]">{transactions.length ? <div className="divide-y divide-white/[0.08]">{transactions.map((transaction) => { const earned = transaction.points > 0; return <div key={transaction.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${earned ? "bg-emerald-400/10 text-emerald-300" : "bg-[#E63946]/10 text-[#FF727D]"}`}>{earned ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</div><div className="min-w-0"><p className="mb-0 truncate text-sm font-bold text-white">{transaction.description}</p><p className="mb-0 mt-1 flex items-center gap-1 text-xs text-[#71717A]"><Clock3 className="h-3 w-3" /> {transaction.date}</p></div></div><div className="flex items-center gap-4 pl-12 sm:pl-0"><span className={`text-sm font-extrabold ${earned ? "text-emerald-300" : "text-[#FF727D]"}`}>{earned ? "+" : ""}{transaction.points} pts</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${earned ? "bg-emerald-400/10 text-emerald-300" : "bg-[#E63946]/10 text-[#FF727D]"}`}>{transaction.status}</span></div></div>; })}</div> : <div className="px-5 py-10 text-center"><History className="mx-auto h-8 w-8 text-[#71717A]" /><p className="mb-0 mt-3 text-sm font-bold text-white">No loyalty transactions yet</p><p className="mb-0 mt-1 text-xs text-[#A1A1AA]">Complete an order to start earning points.</p></div>}</div></section>
    </section>
  );
}
