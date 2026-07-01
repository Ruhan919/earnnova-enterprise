import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
}

export function GlassCard({ children, className, title }: Props) {
  return (
    <div className={cn("glass-card p-4", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
