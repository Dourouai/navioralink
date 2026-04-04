"use client";

import { create } from "zustand";

import type { ChatMessage, QRDraftFromAI } from "@/types/ai";
import type { QRDesign } from "@/types/qr";

const initialMessages: ChatMessage[] = [];

interface QrCreateState {
  step: number;
  messages: ChatMessage[];
  draft: QRDraftFromAI;
  design: QRDesign;
  setStep: (step: number) => void;
  addMessage: (message: ChatMessage) => void;
  updateDraft: (draft: Partial<QRDraftFromAI>) => void;
  updateDesign: (design: Partial<QRDesign>) => void;
  updateLanguageRule: (index: number, payload: { language?: string; url?: string }) => void;
  addLanguageRule: () => void;
  removeLanguageRule: (index: number) => void;
  updateRegionRule: (index: number, payload: { region?: string; url?: string }) => void;
  addRegionRule: () => void;
  removeRegionRule: (index: number) => void;
  updateDeviceRule: (index: number, payload: { os?: string; url?: string }) => void;
  addDeviceRule: () => void;
  removeDeviceRule: (index: number) => void;
  updateParamRule: (index: number, payload: { key?: string; value?: string; url?: string }) => void;
  addParamRule: () => void;
  removeParamRule: (index: number) => void;
  updateAbRule: (index: number, payload: { variant?: "A" | "B"; weight?: number; url?: string }) => void;
}

export const useQrCreateStore = create<QrCreateState>((set) => ({
  step: 1,
  messages: initialMessages,
  draft: { ruleMode: "none", targetType: "web" },
  design: {
    qrStyle: "rounded",
    borderColor: "#0f172a",
    backgroundColor: "#ffffff",
    cornerBorderStyle: "rounded",
    cornerCenterStyle: "dot",
    correctionLevel: "H",
    logoType: "link",
    logoUrl: "/assets/qr-logos.svg#link",
  },
  setStep: (step) => set({ step }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateDraft: (draft) => set((state) => ({ draft: { ...state.draft, ...draft } })),
  updateDesign: (design) => set((state) => ({ design: { ...state.design, ...design } })),
  updateLanguageRule: (index, payload) =>
    set((state) => ({
      draft: {
        ...state.draft,
        languageRules: (state.draft.languageRules ?? []).map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, ...payload } : rule,
        ),
      },
    })),
  addLanguageRule: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        languageRules: [...(state.draft.languageRules ?? []), { language: "", url: "" }],
      },
    })),
  removeLanguageRule: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        languageRules: (state.draft.languageRules ?? []).filter((_, ruleIndex) => ruleIndex !== index),
      },
    })),
  updateRegionRule: (index, payload) =>
    set((state) => ({
      draft: {
        ...state.draft,
        regionRules: (state.draft.regionRules ?? []).map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, ...payload } : rule,
        ),
      },
    })),
  addRegionRule: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        regionRules: [...(state.draft.regionRules ?? []), { region: "", url: "" }],
      },
    })),
  removeRegionRule: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        regionRules: (state.draft.regionRules ?? []).filter((_, ruleIndex) => ruleIndex !== index),
      },
    })),
  updateDeviceRule: (index, payload) =>
    set((state) => ({
      draft: {
        ...state.draft,
        deviceRules: (state.draft.deviceRules ?? []).map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, ...payload } : rule,
        ),
      },
    })),
  addDeviceRule: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        deviceRules: [...(state.draft.deviceRules ?? []), { os: "", url: "" }],
      },
    })),
  removeDeviceRule: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        deviceRules: (state.draft.deviceRules ?? []).filter((_, ruleIndex) => ruleIndex !== index),
      },
    })),
  updateParamRule: (index, payload) =>
    set((state) => ({
      draft: {
        ...state.draft,
        paramRules: (state.draft.paramRules ?? []).map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, ...payload } : rule,
        ),
      },
    })),
  addParamRule: () =>
    set((state) => ({
      draft: {
        ...state.draft,
        paramRules: [...(state.draft.paramRules ?? []), { key: "", value: "", url: "" }],
      },
    })),
  removeParamRule: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        paramRules: (state.draft.paramRules ?? []).filter((_, ruleIndex) => ruleIndex !== index),
      },
    })),
  updateAbRule: (index, payload) =>
    set((state) => ({
      draft: {
        ...state.draft,
        abRules: (state.draft.abRules ?? []).map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, ...payload } : rule,
        ),
      },
    })),
}));
