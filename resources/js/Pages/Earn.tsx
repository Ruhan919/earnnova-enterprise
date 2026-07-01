import { Head } from "@inertiajs/react";
import AppLayout from "@/Components/layout/AppLayout";
import { GlassCard } from "@/Components/ui";

export default function Earn() {
  return (
    <AppLayout>
      <Head title="Earn - EARNNOVA" />
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-white">Earn</h1>
        <GlassCard>
          <div className="text-center text-slate-500 py-8 text-sm">
            <p className="text-lg mb-2">🚧</p>
            <p>Earn page coming soon</p>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
