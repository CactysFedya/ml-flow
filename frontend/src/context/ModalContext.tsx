import React, { createContext, useState, useCallback } from "react";

export interface ModalConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

interface ModalContextType {
  modals: ModalConfig[];
  openModal: (config: ModalConfig) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<ModalConfig[]>([]);

  const openModal = useCallback((config: ModalConfig) => {
    setModals((prev) => [...prev, config]);
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, closeAllModals }}>
      {children}
    </ModalContext.Provider>
  );
}
