// apps/frontend/src/stores/useModalStore.ts
import { create } from "zustand";

interface ModalState {
  // Create User Modal
  isCreateUserModalOpen: boolean;
  openCreateUserModal: () => void;
  closeCreateUserModal: () => void;

  // Edit User Modal
  isEditUserModalOpen: boolean;
  editUserId: string | null;
  openEditUserModal: (userId: string) => void;
  closeEditUserModal: () => void;

  // Delete User Modal (NEW)
  isDeleteUserModalOpen: boolean;
  deleteUserId: string | null;
  deleteUserName: string | null;
  openDeleteUserModal: (userId: string, userName: string) => void;
  closeDeleteUserModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  // Create User Modal
  isCreateUserModalOpen: false,
  openCreateUserModal: () => set({ isCreateUserModalOpen: true }),
  closeCreateUserModal: () => set({ isCreateUserModalOpen: false }),

  // Edit User Modal
  isEditUserModalOpen: false,
  editUserId: null,
  openEditUserModal: (userId: string) =>
    set({ isEditUserModalOpen: true, editUserId: userId }),
  closeEditUserModal: () =>
    set({ isEditUserModalOpen: false, editUserId: null }),

  // Delete User Modal (NEW)
  isDeleteUserModalOpen: false,
  deleteUserId: null,
  deleteUserName: null,
  openDeleteUserModal: (userId: string, userName: string) =>
    set({
      isDeleteUserModalOpen: true,
      deleteUserId: userId,
      deleteUserName: userName,
    }),
  closeDeleteUserModal: () =>
    set({
      isDeleteUserModalOpen: false,
      deleteUserId: null,
      deleteUserName: null,
    }),
}));
