import { create } from "zustand";

// Types for Test data
interface TestData {
  id: string;
  name: string;
  description?: string;
  module_type: string;
  category: string;
  question_type?:
    | "multiple_choice"
    | "true_false"
    | "text"
    | "rating_scale"
    | "drawing"
    | "sequence"
    | "matrix"
    | undefined
    | null;
  time_limit?: number;
  total_questions?: number;
  status: "active" | "inactive" | "archived" | "draft";
  created_at?: string;
  updated_at?: string;
}

// Store state interface
interface QuestionDialogState {
  // Main Dialog/Drawer States
  isOpen: boolean;
  testId: string | null;
  editQuestionId: string | null;
  mode: "create" | "edit";
  currentTest: TestData | null;

  // Delete Question Modal States
  isDeleteQuestionModalOpen: boolean;
  deleteQuestionId: string | null;
  deleteQuestionText: string | null;

  // View Question Modal States
  isViewQuestionModalOpen: boolean;
  viewQuestionId: string | null;

  // Actions for Main Dialog/Drawer
  openCreateDialog: (testId: string, currentTest: TestData) => void;
  openEditDialog: (
    testId: string,
    questionId: string,
    currentTest: TestData
  ) => void;
  closeDialog: () => void;

  // Actions for Delete Modal
  openDeleteQuestionModal: (questionId: string, questionText: string) => void;
  closeDeleteQuestionModal: () => void;

  // Actions for View Modal
  openViewQuestionModal: (questionId: string) => void;
  closeViewQuestionModal: () => void;

  // Utility Actions
  resetState: () => void;
  setCurrentTest: (test: TestData) => void;
}

// Initial state
const initialState = {
  // Main Dialog/Drawer
  isOpen: false,
  testId: null,
  editQuestionId: null,
  mode: "create" as const,
  currentTest: null,

  // Delete Question Modal
  isDeleteQuestionModalOpen: false,
  deleteQuestionId: null,
  deleteQuestionText: null,

  // View Question Modal
  isViewQuestionModalOpen: false,
  viewQuestionId: null,
};

// Create the store
export const useQuestionDialogStore = create<QuestionDialogState>((set) => ({
  // Initial state
  ...initialState,

  // Main Dialog/Drawer Actions
  openCreateDialog: (testId: string, currentTest: TestData) => {
    set({
      isOpen: true,
      testId,
      editQuestionId: null,
      mode: "create",
      currentTest,
      // Close other modals
      isDeleteQuestionModalOpen: false,
      isViewQuestionModalOpen: false,
    });
  },

  openEditDialog: (
    testId: string,
    questionId: string,
    currentTest: TestData
  ) => {
    set({
      isOpen: true,
      testId,
      editQuestionId: questionId,
      mode: "edit",
      currentTest,
      // Close other modals
      isDeleteQuestionModalOpen: false,
      isViewQuestionModalOpen: false,
    });
  },

  closeDialog: () => {
    set({
      isOpen: false,
      testId: null,
      editQuestionId: null,
      mode: "create",
      currentTest: null,
    });
  },

  // Delete Question Modal Actions
  openDeleteQuestionModal: (questionId: string, questionText: string) => {
    set({
      isDeleteQuestionModalOpen: true,
      deleteQuestionId: questionId,
      deleteQuestionText: questionText,
      // Close other modals
      isOpen: false,
      isViewQuestionModalOpen: false,
    });
  },

  closeDeleteQuestionModal: () => {
    set({
      isDeleteQuestionModalOpen: false,
      deleteQuestionId: null,
      deleteQuestionText: null,
    });
  },

  // View Question Modal Actions
  openViewQuestionModal: (questionId: string) => {
    set({
      isViewQuestionModalOpen: true,
      viewQuestionId: questionId,
      // Close other modals
      isOpen: false,
      isDeleteQuestionModalOpen: false,
    });
  },

  closeViewQuestionModal: () => {
    set({
      isViewQuestionModalOpen: false,
      viewQuestionId: null,
    });
  },

  // Utility Actions
  resetState: () => {
    set(initialState);
  },

  setCurrentTest: (test: TestData) => {
    set({ currentTest: test });
  },
}));

// Convenience hooks for specific modals (backward compatibility)
export const useQuestionCreateDialog = () => {
  const store = useQuestionDialogStore();
  return {
    isOpen: store.isOpen && store.mode === "create",
    testId: store.testId,
    currentTest: store.currentTest,
    openDialog: store.openCreateDialog,
    closeDialog: store.closeDialog,
  };
};

export const useQuestionEditDialog = () => {
  const store = useQuestionDialogStore();
  return {
    isOpen: store.isOpen && store.mode === "edit",
    testId: store.testId,
    questionId: store.editQuestionId,
    currentTest: store.currentTest,
    openDialog: store.openEditDialog,
    closeDialog: store.closeDialog,
  };
};

export const useQuestionDeleteModal = () => {
  const store = useQuestionDialogStore();
  return {
    isOpen: store.isDeleteQuestionModalOpen,
    questionId: store.deleteQuestionId,
    questionText: store.deleteQuestionText,
    openModal: store.openDeleteQuestionModal,
    closeModal: store.closeDeleteQuestionModal,
  };
};

export const useQuestionViewModal = () => {
  const store = useQuestionDialogStore();
  return {
    isOpen: store.isViewQuestionModalOpen,
    questionId: store.viewQuestionId,
    openModal: store.openViewQuestionModal,
    closeModal: store.closeViewQuestionModal,
  };
};

// Type exports for external use
export type { TestData, QuestionDialogState };
