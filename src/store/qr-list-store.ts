"use client";

import { create } from "zustand";

import type { QRCodeItem } from "@/types/qr";

interface QrListState {
  items: QRCodeItem[];
  initialized: boolean;
  initialize: (items: QRCodeItem[]) => void;
  archiveItem: (id: string) => void;
  restoreItem: (id: string) => void;
  deleteItem: (id: string) => void;
  addItem: (item: QRCodeItem) => void;
}

export const useQrListStore = create<QrListState>((set) => ({
  items: [],
  initialized: false,
  initialize: (items) =>
    set((state) => {
      if (state.initialized) {
        return state;
      }

      return {
        items,
        initialized: true,
      };
    }),
  archiveItem: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, status: "archived" } : item)),
    })),
  restoreItem: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, status: "draft" } : item)),
    })),
  deleteItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  addItem: (item) =>
    set((state) => ({
      items: [item, ...state.items],
    })),
}));
