import { create } from "zustand";

interface TestDialogState {
  // Delete Test Dialog
  isDeleteTestModalOpen: boolean;
  deleteTestId: string | null;
  deleteTestName: string | null;
  openDeleteTestModal: (testId: string, testName: string) => void;
  closeDeleteTestModal: () => void;
}

export const useTestDialogStore = create<TestDialogState>((set) => ({
  // Delete Test Dialog
  isDeleteTestModalOpen: false,
  deleteTestId: null,
  deleteTestName: null,
  openDeleteTestModal: (testId: string, testName: string) =>
    set({
      isDeleteTestModalOpen: true,
      deleteTestId: testId,
      deleteTestName: testName,
    }),
  closeDeleteTestModal: () =>
    set({
      isDeleteTestModalOpen: false,
      deleteTestId: null,
      deleteTestName: null,
    }),
}));
