import { Gauge } from "lucide-react";

import { cn } from "@/lib/utils";

export const SPEED_STEPS = [0.8, 1, 1.2, 1.5, 2, 2.5] as const;

/** Snaps a suggested rate (e.g. from the CEFR level) onto the closest chip. */
export function snapSpeed(rate: number): number {
  return SPEED_STEPS.reduce((best, s) =>
    Math.abs(s - rate) < Math.abs(best - rate) ? s : best,
  ) as number;
}

/** Playback speed chips shared by listening + pronunciation practice. */
export function SpeedControl({
  value,
  onChange,
  label = "Speed",
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
        <Gauge className="h-3.5 w-3.5" />
        {label}
      </span>
      {SPEED_STEPS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          aria-pressed={value === s}
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-black transition-colors",
            value === s
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/70",
          )}
        >
          {s}×
        </button>
      ))}
    </div>
  );
}
