import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface RegistrationData {
  // Step 1: Data Wajib
  name: string;
  phone: string;
  email: string;
  nik: string;
  gender: "male" | "female" | "other" | "";
  birth_place: string;
  birth_date: string;

  // Step 2: Data Tambahan
  education:
    | "sd"
    | "smp"
    | "sma"
    | "diploma"
    | "s1"
    | "s2"
    | "s3"
    | "other"
    | "";
  religion:
    | "islam"
    | "kristen"
    | "katolik"
    | "hindu"
    | "buddha"
    | "konghucu"
    | "other"
    | "";

  // Step 3: Alamat dan Wilayah
  address: string;
  province_code: string;
  province: string;
  regency_code: string;
  regency: string;
  district_code: string;
  district: string;
  village_code: string;
  village: string;
  postal_code: string;
}

interface RegistrationStore {
  // State
  currentStep: number;
  isLoading: boolean;
  data: RegistrationData;

  // Actions
  setCurrentStep: (step: number) => void;
  setLoading: (loading: boolean) => void;
  updateData: (data: Partial<RegistrationData>) => void;
  resetData: () => void;
  nextStep: () => void;
  prevStep: () => void;
  canProceedToStep: (step: number) => boolean;
}

const initialData: RegistrationData = {
  name: "",
  phone: "",
  email: "",
  nik: "",
  gender: "",
  birth_place: "",
  birth_date: "",
  education: "",
  religion: "",
  address: "",
  province_code: "",
  province: "",
  regency_code: "",
  regency: "",
  district_code: "",
  district: "",
  village_code: "",
  village: "",
  postal_code: "",
};

export const useRegistrationStore = create<RegistrationStore>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      isLoading: false,
      data: initialData,

      setCurrentStep: (step: number) => {
        set({ currentStep: step });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      updateData: (newData: Partial<RegistrationData>) => {
        set((state) => ({
          data: { ...state.data, ...newData },
        }));
      },

      resetData: () => {
        set({
          currentStep: 1,
          isLoading: false,
          data: initialData,
        });
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 4) {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      canProceedToStep: (step: number) => {
        const { data } = get();

        switch (step) {
          case 1:
            return true;
          case 2:
            // Step 1 data must be complete
            return !!(
              data.name &&
              data.phone &&
              data.email &&
              data.nik &&
              data.gender &&
              data.birth_place &&
              data.birth_date
            );
          case 3:
            // Step 1 & 2 data must be complete
            return !!(
              data.name &&
              data.phone &&
              data.email &&
              data.nik &&
              data.gender &&
              data.birth_place &&
              data.birth_date &&
              data.education &&
              data.religion
            );
          case 4:
            // All previous steps must be complete
            return !!(
              data.name &&
              data.phone &&
              data.email &&
              data.nik &&
              data.gender &&
              data.birth_place &&
              data.birth_date &&
              data.education &&
              data.religion &&
              data.address &&
              data.province &&
              data.regency &&
              data.district &&
              data.village &&
              data.postal_code
            );
          default:
            return false;
        }
      },
    }),
    {
      name: "registration-store",
      storage: createJSONStorage(() => localStorage),
      // Clear the store on registration success
      partialize: (state) => ({
        currentStep: state.currentStep,
        data: state.data,
      }),
    }
  )
);
