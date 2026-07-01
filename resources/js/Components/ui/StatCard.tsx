import { cn } from "@/lib/utils";

interface Props {
  icon: React.ReactNode;
  value: string;
  label: string;
  color?: string;
}

export function StatCard({ icon, value, label, color = "text-emerald-500" }: Props) {
  return (
    <div className="stat-card">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5 text-lg", `bg-${color}/10`, color)}>
        {icon}
      </div>
      <div className={cn("text-xl font-bold tracking-tight", color)}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5 font-medium uppercase tracking-wide">{label}</div>
    </div>
  );
}
