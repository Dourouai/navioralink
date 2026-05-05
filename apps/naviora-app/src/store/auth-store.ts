"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "@/types/user";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (payload: { token?: string | null; user: User }) => void;
  syncUser: (user: User | null) => void;
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
      setSession: ({ token = null, user }) => set({ token, user }),
      syncUser: (user) => set((state) => ({ token: user ? state.token : null, user })),
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
