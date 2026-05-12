import { useContext } from "react";
import { ModalContext, type ModalConfig } from "@/context/ModalContext";

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }

  return {
    openModal: (config: ModalConfig) => context.openModal(config),
    closeModal: (id: string) => context.closeModal(id),
    closeAllModals: () => context.closeAllModals(),
  };
}
