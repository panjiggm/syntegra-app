"use client";

import { create } from "zustand";

interface SessionModule {
  test_id: string;
  test_name?: string;
  test_category?: string;
  sequence: number;
  is_required: boolean;
  weight: number;
}

interface SessionDialogState {
  // Create Session Dialog
  isCreateSessionOpen: boolean;
  openCreateSession: () => void;
  closeCreateSession: () => void;

  // Edit Session Dialog
  isEditSessionOpen: boolean;
  editSessionId: string | null;
  openEditSession: (sessionId: string) => void;
  closeEditSession: () => void;

  // Delete Session Dialog
  isDeleteSessionOpen: boolean;
  deleteSessionId: string | null;
  deleteSessionName: string | null;
  openDeleteSession: (sessionId: string, sessionName: string) => void;
  closeDeleteSession: () => void;

  // Session Detail Dialog
  isDetailSessionOpen: boolean;
  detailSessionId: string | null;
  openDetailSession: (sessionId: string) => void;
  closeDetailSession: () => void;

  // Session Modules State
  selectedModules: SessionModule[];
  setSelectedModules: (modules: SessionModule[]) => void;
  addModule: (module: SessionModule) => void;
  removeModule: (testId: string) => void;
  updateModule: (testId: string, updates: Partial<SessionModule>) => void;
  clearModules: () => void;

  // Form State
  isFormSubmitting: boolean;
  setFormSubmitting: (submitting: boolean) => void;
}

export const useSessionStore = create<SessionDialogState>((set, get) => ({
  // Create Session Dialog
  isCreateSessionOpen: false,
  openCreateSession: () => set({ isCreateSessionOpen: true }),
  closeCreateSession: () =>
    set({
      isCreateSessionOpen: false,
      selectedModules: [],
      isFormSubmitting: false,
    }),

  // Edit Session Dialog
  isEditSessionOpen: false,
  editSessionId: null,
  openEditSession: (sessionId: string) =>
    set({
      isEditSessionOpen: true,
      editSessionId: sessionId,
    }),
  closeEditSession: () =>
    set({
      isEditSessionOpen: false,
      editSessionId: null,
      selectedModules: [],
      isFormSubmitting: false,
    }),

  // Delete Session Dialog
  isDeleteSessionOpen: false,
  deleteSessionId: null,
  deleteSessionName: null,
  openDeleteSession: (sessionId: string, sessionName: string) =>
    set({
      isDeleteSessionOpen: true,
      deleteSessionId: sessionId,
      deleteSessionName: sessionName,
    }),
  closeDeleteSession: () =>
    set({
      isDeleteSessionOpen: false,
      deleteSessionId: null,
      deleteSessionName: null,
    }),

  // Session Detail Dialog
  isDetailSessionOpen: false,
  detailSessionId: null,
  openDetailSession: (sessionId: string) =>
    set({
      isDetailSessionOpen: true,
      detailSessionId: sessionId,
    }),
  closeDetailSession: () =>
    set({
      isDetailSessionOpen: false,
      detailSessionId: null,
    }),

  // Session Modules State
  selectedModules: [],
  setSelectedModules: (modules: SessionModule[]) =>
    set({ selectedModules: modules }),

  addModule: (module: SessionModule) => {
    const { selectedModules } = get();
    const exists = selectedModules.find((m) => m.test_id === module.test_id);
    if (!exists) {
      set({
        selectedModules: [...selectedModules, module].sort(
          (a, b) => a.sequence - b.sequence
        ),
      });
    }
  },

  removeModule: (testId: string) => {
    const { selectedModules } = get();
    set({
      selectedModules: selectedModules.filter((m) => m.test_id !== testId),
    });
  },

  updateModule: (testId: string, updates: Partial<SessionModule>) => {
    const { selectedModules } = get();
    set({
      selectedModules: selectedModules
        .map((m) => (m.test_id === testId ? { ...m, ...updates } : m))
        .sort((a, b) => a.sequence - b.sequence),
    });
  },

  clearModules: () => set({ selectedModules: [] }),

  // Form State
  isFormSubmitting: false,
  setFormSubmitting: (submitting: boolean) =>
    set({ isFormSubmitting: submitting }),
}));
