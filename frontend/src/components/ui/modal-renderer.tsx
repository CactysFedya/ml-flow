import { useContext, useState } from "react";
import { ModalContext } from "@/context/ModalContext";
import { Dialog } from "@/components/ui/dialog";

export function ModalRenderer() {
  const context = useContext(ModalContext);

  if (!context || context.modals.length === 0) {
    return null;
  }

  return (
    <>
      {context.modals.map((modal) => (
        <ModalDialog
          key={modal.id}
          id={modal.id}
          title={modal.title}
          component={modal.component}
          props={modal.props}
          onClose={() => context.closeModal(modal.id)}
        />
      ))}
    </>
  );
}

interface ModalDialogProps {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  onClose: () => void;
}

function ModalDialog({ id, title, component: Component, props, onClose }: ModalDialogProps) {
  const [open, setOpen] = useState(true);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title={title}>
      <Component {...props} modalId={id} onClose={onClose} />
    </Dialog>
  );
}
