import { create } from "zustand";

interface SessionDialogState {
  // Delete Session Dialog
  isDeleteSessionModalOpen: boolean;
  deleteSessionId: string | null;
  deleteSessionName: string | null;
  deleteSessionCode: string | null;
  openDeleteSessionModal: (
    sessionId: string,
    sessionName: string,
    sessionCode: string
  ) => void;
  closeDeleteSessionModal: () => void;
}

export const useSessionDialogStore = create<SessionDialogState>((set) => ({
  // Delete Session Dialog
  isDeleteSessionModalOpen: false,
  deleteSessionId: null,
  deleteSessionName: null,
  deleteSessionCode: null,
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
}));
