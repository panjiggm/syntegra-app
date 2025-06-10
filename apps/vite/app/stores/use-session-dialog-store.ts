import { create } from "zustand";

interface SessionDialogState {
  // Delete Session Dialog
  isOpen: boolean;
  mode: "create" | "edit";
  editSessionId: string | null;
  isDeleteSessionModalOpen: boolean;
  deleteSessionId: string | null;
  deleteSessionName: string | null;
  deleteSessionCode: string | null;
  openCreateSession: () => void;
  openEditDialog: (sessionId: string) => void;
  openDeleteSessionModal: (
    sessionId: string,
    sessionName: string,
    sessionCode: string
  ) => void;
  closeDeleteSessionModal: () => void;
  closeDialog: () => void;
}

export const useSessionDialogStore = create<SessionDialogState>((set) => ({
  isOpen: false,
  mode: "create",
  editSessionId: null,
  // Delete Session Dialog
  isDeleteSessionModalOpen: false,
  deleteSessionId: null,
  deleteSessionName: null,
  deleteSessionCode: null,
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
  openDeleteSessionModal: (
    sessionId: string,
    sessionName: string,
    sessionCode: string
  ) =>
    set({
      isDeleteSessionModalOpen: true,
      deleteSessionId: sessionId,
      deleteSessionName: sessionName,
      deleteSessionCode: sessionCode,
    }),
  closeDeleteSessionModal: () =>
    set({
      isDeleteSessionModalOpen: false,
      deleteSessionId: null,
      deleteSessionName: null,
      deleteSessionCode: null,
    }),
  closeDialog: () =>
    set({ isOpen: false, mode: "create", editSessionId: null }),
}));
