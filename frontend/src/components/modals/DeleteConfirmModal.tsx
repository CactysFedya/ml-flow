import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmModalProps {
  title: string;
  message: string;
  itemName: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function DeleteConfirmModal({
  title,
  message,
  itemName,
  isLoading = false,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{message}</p>
        </div>
      </div>

      <div className="rounded-lg bg-red-50 border border-red-200 p-3">
        <p className="text-sm text-red-800">
          This will permanently delete <strong>{itemName}</strong>. This action cannot be undone.
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleConfirm}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {isLoading ? "Deleting..." : "Delete"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
