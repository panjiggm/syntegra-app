import { create } from "zustand";

interface QuestionDialogState {
  isOpen: boolean;
  testId: string | null;
  editQuestionId: string | null;
  mode: "create" | "edit";
  // Delete question dialog state
  isDeleteQuestionModalOpen: boolean;
  deleteQuestionId: string | null;
  deleteQuestionText: string | null;
  openCreateDialog: (testId: string) => void;
  openEditDialog: (testId: string, questionId: string) => void;
  closeDialog: () => void;
  // Delete question actions
  openDeleteQuestionModal: (questionId: string, questionText: string) => void;
  closeDeleteQuestionModal: () => void;
}

export const useQuestionDialogStore = create<QuestionDialogState>((set) => ({
  isOpen: false,
  testId: null,
  editQuestionId: null,
  mode: "create",
  // Delete question state
  isDeleteQuestionModalOpen: false,
  deleteQuestionId: null,
  deleteQuestionText: null,
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
  // Delete question actions
  openDeleteQuestionModal: (questionId: string, questionText: string) =>
    set({
      isDeleteQuestionModalOpen: true,
      deleteQuestionId: questionId,
      deleteQuestionText: questionText,
    }),
  closeDeleteQuestionModal: () =>
    set({
      isDeleteQuestionModalOpen: false,
      deleteQuestionId: null,
      deleteQuestionText: null,
    }),
}));
