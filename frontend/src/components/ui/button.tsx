import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "ui-control inline-flex items-center justify-center font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
        variant === "default" && "bg-primary text-white shadow-[0_8px_16px_rgba(47,109,246,0.16)] hover:bg-[#245fe4]",
        variant === "secondary" && "bg-slate-50 text-slate-700 hover:bg-slate-100",
        variant === "ghost" && "text-primary hover:bg-primary/5",
        className,
      )}
      {...props}
    />
  );
}
