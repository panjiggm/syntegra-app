import { create } from "zustand";

interface UsersStore {
  // Delete User Modal State
  isDeleteUserModalOpen: boolean;
  deleteUserId: string | null;
  deleteUserName: string | null;

  // Actions
  openDeleteUserModal: (userId: string, userName: string) => void;
  closeDeleteUserModal: () => void;
}

export const useUsersStore = create<UsersStore>((set) => ({
  // Initial state
  isDeleteUserModalOpen: false,
  deleteUserId: null,
  deleteUserName: null,

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
}));
