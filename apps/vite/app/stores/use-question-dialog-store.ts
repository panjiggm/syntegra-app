import { create } from "zustand";

interface QuestionDialogState {
  isOpen: boolean;
  testId: string | null;
  editQuestionId: string | null;
  mode: "create" | "edit";
  openCreateDialog: (testId: string) => void;
  openEditDialog: (testId: string, questionId: string) => void;
  closeDialog: () => void;
}

export const useQuestionDialogStore = create<QuestionDialogState>((set) => ({
  isOpen: false,
  testId: null,
  editQuestionId: null,
  mode: "create",
  openCreateDialog: (testId: string) =>
    set({
      isOpen: true,
      testId,
      editQuestionId: null,
      mode: "create",
    }),
  openEditDialog: (testId: string, questionId: string) =>
    set({
      isOpen: true,
      testId,
      editQuestionId: questionId,
      mode: "edit",
    }),
  closeDialog: () =>
    set({
      isOpen: false,
      testId: null,
      editQuestionId: null,
      mode: "create",
    }),
}));
