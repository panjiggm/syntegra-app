import { create } from "zustand";

interface SessionDialogState {
  isOpen: boolean;
  mode: "create" | "edit";
  editSessionId: string | null;
  openCreateSession: () => void;
  openEditDialog: (sessionId: string) => void;
  closeDialog: () => void;
}

export const useSessionDialogStore = create<SessionDialogState>((set) => ({
  isOpen: false,
  mode: "create",
  editSessionId: null,
  openCreateSession: () =>
    set({
      isOpen: true,
      mode: "create",
      editSessionId: null,
    }),
  openEditDialog: (sessionId: string) =>
    set({
      isOpen: true,
      mode: "edit",
      editSessionId: sessionId,
    }),
  closeDialog: () =>
    set({
      isOpen: false,
      mode: "create",
      editSessionId: null,
    }),
}));
