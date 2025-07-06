import { create } from "zustand";

interface UsersStore {
  // Delete User Modal State
  isDeleteUserModalOpen: boolean;
  deleteUserId: string | null;
  deleteUserName: string | null;

  // Bulk Delete Modal State
  isBulkDeleteModalOpen: boolean;
  bulkDeleteUserIds: string[];
  bulkDeleteUserNames: string[];
  isBulkDeleting: boolean;

  // Actions
  openDeleteUserModal: (userId: string, userName: string) => void;
  closeDeleteUserModal: () => void;
  openBulkDeleteModal: (userIds: string[], userNames: string[]) => void;
  closeBulkDeleteModal: () => void;
  setBulkDeleting: (isDeleting: boolean) => void;
}

export const useUsersStore = create<UsersStore>((set) => ({
  // Initial state
  isDeleteUserModalOpen: false,
  deleteUserId: null,
  deleteUserName: null,

  // Bulk delete initial state
  isBulkDeleteModalOpen: false,
  bulkDeleteUserIds: [],
  bulkDeleteUserNames: [],
  isBulkDeleting: false,

  // Actions
  openDeleteUserModal: (userId: string, userName: string) => {
    console.log("Opening delete modal for:", userId, userName);
    set({
      isDeleteUserModalOpen: true,
      deleteUserId: userId,
      deleteUserName: userName,
    });
  },

  closeDeleteUserModal: () =>
    set({
      isDeleteUserModalOpen: false,
      deleteUserId: null,
      deleteUserName: null,
    }),

  openBulkDeleteModal: (userIds: string[], userNames: string[]) => {
    console.log("Opening bulk delete modal for:", userIds, userNames);
    set({
      isBulkDeleteModalOpen: true,
      bulkDeleteUserIds: userIds,
      bulkDeleteUserNames: userNames,
      isBulkDeleting: false,
    });
  },

  closeBulkDeleteModal: () =>
    set({
      isBulkDeleteModalOpen: false,
      bulkDeleteUserIds: [],
      bulkDeleteUserNames: [],
      isBulkDeleting: false,
    }),

  setBulkDeleting: (isDeleting: boolean) =>
    set({
      isBulkDeleting: isDeleting,
    }),
}));
