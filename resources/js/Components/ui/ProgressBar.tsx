interface Props {
  current: number;
  max: number;
  label?: string;
}

export function ProgressBar({ current, max, label }: Props) {
  const pct = Math.min(100, (current / max) * 100);
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-xs text-slate-400">{current}/{max}</span>
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
