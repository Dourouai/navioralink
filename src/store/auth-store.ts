"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "@/types/user";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (payload: { token: string; user: User }) => void;
  updateUser: (payload: Partial<User>) => void;
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
      updateUser: (payload) => set((state) => (state.user ? { user: { ...state.user, ...payload } } : state)),
      clearSession: () => set({ token: null, user: null }),
      markHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "naviora-auth",
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
