import { Head } from "@inertiajs/react";
import { motion } from "motion/react";
import { Wallet, TvMinimal, Users, SackDollar, ChartNoAxesCombined, Play, CreditCard, User, Hourglass, Inbox, Flame, TrendingUp } from "lucide-react";
import { GlassCard, StatCard, ProgressBar } from "@/Components/ui";
import { formatUSD } from "@/lib/utils";
import AppLayout from "@/Components/layout/AppLayout";

interface Props {
  stats: {
    balance_cents: number;
    ads_watched: number;
    referral_count: number;
    total_earned_cents: number;
    today_ads: number;
    streak: number;
  };
  ads: Array<{ id: number; title: string; reward_cents: number; duration_seconds: number }>;
  transactions: Array<{ id: string; type: string; amount_cents: number; status: string; description: string; created_at: string }>;
}

export default function Dashboard({ stats, ads, transactions }: Props) {
  return (
    <AppLayout>
      <Head title="Dashboard - EARNNOVA" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Welcome back! Ready to earn?</p>
          </div>
        </div>

        <motion.div initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Wallet />} value={formatUSD(stats.balance_cents)} label="Balance" />
          <StatCard icon={<TvMinimal />} value={String(stats.ads_watched)} label="Ads Watched" color="text-blue-400" />
          <StatCard icon={<Users />} value={String(stats.referral_count)} label="Referrals" color="text-amber-500" />
          <StatCard icon={<SackDollar />} value={formatUSD(stats.total_earned_cents)} label="Total Earned" color="text-purple-400" />
        </motion.div>

        <GlassCard>
          <ProgressBar current={stats.today_ads} max={30} label="Daily Progress" />
          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
            <Flame className="w-3 h-3 text-amber-500" /> Streak: {stats.streak} day{stats.streak !== 1 ? "s" : ""}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard title={<><TvMinimal className="w-4 h-4 text-emerald-500" /> Available Ads</>}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {ads?.length > 0 ? ads.map(ad => (
                <div key={ad.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ad.title}</p>
                    <p className="text-xs text-slate-400">{ad.duration_seconds}s · <span className="text-emerald-500 font-semibold">+{formatUSD(ad.reward_cents)}</span></p>
                  </div>
                  <button className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
                    <Play className="w-3 h-3 inline mr-1" /> Watch
                  </button>
                </div>
              )) : (
                <div className="text-center text-slate-500 py-8 text-sm">
                  <Hourglass className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No ads available right now
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard title={<><TrendingUp className="w-4 h-4 text-amber-500" /> Recent Activity</>}>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {transactions?.length > 0 ? transactions.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-all">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${tx.amount_cents >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"}`}>
                    {tx.amount_cents >= 0 ? "+" : "−"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{tx.type.replace("_", " ")}</p>
                    <p className="text-[10px] text-slate-500">{tx.created_at}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount_cents >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                    {tx.amount_cents >= 0 ? "+" : ""}{formatUSD(Math.abs(tx.amount_cents))}
                  </span>
                </div>
              )) : (
                <div className="text-center text-slate-500 py-8 text-sm">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  Start earning to see activity here
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <motion.div initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
          className="grid grid-cols-4 gap-3">
          {[
            { href: "/earn", icon: Play, label: "Watch", color: "text-emerald-500" },
            { href: "/withdraw", icon: CreditCard, label: "Withdraw", color: "text-blue-400" },
            { href: "/referrals", icon: Users, label: "Refer", color: "text-amber-500" },
            { href: "/profile", icon: User, label: "Profile", color: "text-purple-400" },
          ].map(action => (
            <motion.div key={action.label} variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}>
              <a href={action.href} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] hover:-translate-y-0.5 transition-all text-slate-400 hover:text-white">
                <action.icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-[11px] font-medium">{action.label}</span>
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </AppLayout>
  );
}
