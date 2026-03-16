"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { useAuthStore } from "@/store/auth-store";

interface AuthGateProps {
  locale: Locale;
  children: React.ReactNode;
}

export function AuthGate({ locale, children }: AuthGateProps) {
  const router = useRouter();
  const { token, hydrated, markHydrated } = useAuthStore();

  useEffect(() => {
    markHydrated();
  }, [markHydrated]);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace(withLocale(locale, "/login"));
    }
  }, [hydrated, locale, router, token]);

  if (!hydrated) {
    return <div className="glass-panel rounded-[28px] p-8 text-sm text-slate-500">Loading workspace...</div>;
  }

  if (!token) {
    return <div className="glass-panel rounded-[28px] p-8 text-sm text-slate-500">Redirecting to login...</div>;
  }

  return <>{children}</>;
}
