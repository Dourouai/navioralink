"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "@/types/user";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (payload: { token: string; user: User }) => void;
  clearSession: () => void;
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: ({ token, user }) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "zaps-auth",
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
