import { useContext } from "react";
import { NotificationContext } from "@/context/NotificationContext";
import { Toast } from "@/components/ui/toast";

export function ToastContainer() {
  const context = useContext(NotificationContext);

  if (!context) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 pointer-events-none md:p-6">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {context.notifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={context.removeNotification}
          />
        ))}
      </div>
    </div>
  );
}
