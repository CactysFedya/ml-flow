import { useContext } from "react";
import { NotificationContext, type Notification, type NotificationType } from "@/context/NotificationContext";

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }

  return {
    success: (title: string, message?: string, duration?: number) =>
      context.addNotification({ type: "success", title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      context.addNotification({ type: "error", title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      context.addNotification({ type: "warning", title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      context.addNotification({ type: "info", title, message, duration }),
  };
}
