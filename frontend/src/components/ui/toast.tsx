import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/context/NotificationContext";

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

export function Toast({ notification, onClose }: ToastProps) {
  const iconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colorMap = {
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "text-emerald-600",
      title: "text-emerald-900",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "text-red-600",
      title: "text-red-900",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-600",
      title: "text-amber-900",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      title: "text-blue-900",
    },
  };

  const Icon = iconMap[notification.type];
  const colors = colorMap[notification.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.08)]",
        colors.bg,
        colors.border,
      )}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", colors.icon)} />
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-sm", colors.title)}>{notification.title}</div>
        {notification.message && <div className="text-sm text-slate-600 mt-1">{notification.message}</div>}
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
