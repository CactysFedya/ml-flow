import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "danger" | "warning" | "info";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[clamp(8px,0.7vw,10px)] text-[length:var(--font-2xs)] font-semibold min-h-[clamp(18px,1.4vw,22px)]",
        tone === "default" && "bg-slate-100 text-slate-600",
        tone === "success" && "bg-emerald-50 text-emerald-600",
        tone === "danger" && "bg-rose-50 text-rose-500",
        tone === "warning" && "bg-amber-50 text-amber-600",
        tone === "info" && "bg-blue-50 text-blue-600",
        className,
      )}
      {...props}
    />
  );
}
