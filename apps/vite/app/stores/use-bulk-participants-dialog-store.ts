import { create } from "zustand";

interface BulkParticipantsDialogState {
  // Bulk Add Participants Dialog
  isBulkParticipantsDialogOpen: boolean;
  currentSessionId: string | null;
  currentSessionName: string | null;
  openBulkParticipantsDialog: (sessionId: string, sessionName: string) => void;
  closeBulkParticipantsDialog: () => void;
}

export const useBulkParticipantsDialogStore =
  create<BulkParticipantsDialogState>((set) => ({
    // Bulk Add Participants Dialog
    isBulkParticipantsDialogOpen: false,
    currentSessionId: null,
    currentSessionName: null,
    openBulkParticipantsDialog: (sessionId: string, sessionName: string) =>
      set({
        isBulkParticipantsDialogOpen: true,
        currentSessionId: sessionId,
        currentSessionName: sessionName,
      }),
    closeBulkParticipantsDialog: () =>
      set({
        isBulkParticipantsDialogOpen: false,
        currentSessionId: null,
        currentSessionName: null,
      }),
  }));
