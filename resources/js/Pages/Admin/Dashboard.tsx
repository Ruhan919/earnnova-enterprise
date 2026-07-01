import { Head } from "@inertiajs/react";
import AppLayout from "@/Components/layout/AppLayout";
import { StatCard } from "@/Components/ui";
import { Shield, Users, TvMinimal, CreditCard, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  return (
    <AppLayout>
      <Head title="Admin - EARNNOVA" />
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" /> Admin Dashboard
        </h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Users />} value="0" label="Total Users" color="text-amber-500" />
          <StatCard icon={<TvMinimal />} value="0" label="Active Ads" color="text-emerald-500" />
          <StatCard icon={<CreditCard />} value="0" label="Pending WDs" color="text-blue-400" />
          <StatCard icon={<TrendingUp />} value="$0.00" label="Total Paid" color="text-purple-400" />
        </div>
      </div>
    </AppLayout>
  );
}
