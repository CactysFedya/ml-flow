import { Button } from "@/components/ui/button";
import { useNotification } from "@/hooks/useNotification";

export function NotificationDemo() {
  const { success, error, warning, info } = useNotification();

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() =>
          success("Operation successful!", "Your project has been created successfully.", 4000)
        }
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        Success
      </Button>
      <Button
        onClick={() =>
          error("Operation failed", "Failed to create project: Invalid name format.", 4000)
        }
        className="bg-red-600 hover:bg-red-700"
      >
        Error
      </Button>
      <Button
        onClick={() =>
          warning("Warning", "This action cannot be undone. Proceed with caution.", 4000)
        }
        className="bg-amber-600 hover:bg-amber-700"
      >
        Warning
      </Button>
      <Button
        onClick={() => info("Information", "Dataset is being processed in the background.", 4000)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        Info
      </Button>
    </div>
  );
}
