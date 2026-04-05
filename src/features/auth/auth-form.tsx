"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { login, register as registerUser } from "@/lib/services";
import { useAuthStore } from "@/store/auth-store";

interface AuthFormProps {
  locale: Locale;
  mode: "login" | "register";
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        d="M21.8 12.23c0-.72-.06-1.25-.2-1.8H12.2v3.41h5.52c-.11.85-.69 2.14-1.98 3l-.02.11 2.79 2.12.19.02c1.74-1.57 2.9-3.89 2.9-6.86Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.9c2.7 0 4.96-.87 6.61-2.36l-3.15-2.25c-.84.58-1.97.98-3.46.98-2.65 0-4.89-1.72-5.69-4.09l-.11.01-2.9 2.2-.04.1c1.64 3.18 5 5.41 8.74 5.41Z"
        fill="#34A853"
      />
      <path
        d="M6.51 14.18a5.8 5.8 0 0 1-.33-1.91c0-.66.12-1.3.31-1.91l-.01-.13-2.94-2.23-.1.04A9.77 9.77 0 0 0 2.4 12.27c0 1.42.35 2.77.98 3.98l3.13-2.07Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 6.27c1.88 0 3.15.8 3.87 1.46l2.83-2.7C17.14 3.43 14.9 2.64 12.2 2.64c-3.74 0-7.1 2.23-8.74 5.41l3.05 2.31c.82-2.37 3.06-4.09 5.69-4.09Z"
        fill="#EB4335"
      />
    </svg>
  );
}

export function AuthForm({ locale, mode }: AuthFormProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState("");
  type FormValues = {
    email: string;
    password: string;
    confirmPassword?: string;
    agreeTerms?: boolean;
  };

  const schema = useMemo(() => {
    if (mode === "login") {
      return z.object({
        email: z.string().email("Please enter a valid email."),
        password: z.string().min(6, "Password must be at least 6 characters."),
      });
    }

    return z
      .object({
        email: z.string().email("Please enter a valid email."),
        password: z.string().min(6, "Password must be at least 6 characters."),
        confirmPassword: z.string().min(6, "Password must be at least 6 characters."),
        agreeTerms: z.boolean().refine(Boolean, "Please accept the terms."),
      })
      .refine((value) => value.password === value.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
  }, [mode]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError("");

    try {
      const result =
        mode === "login"
          ? await login({ email: values.email, password: values.password })
          : await registerUser({ email: values.email, password: values.password });

      setSession(result);
      router.push(withLocale(locale, "/dashboard"));
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  };

  const termsAgreementContent =
    locale === "en" ? (
      <>
        I agree to the{" "}
        <Link href={withLocale(locale, "/terms")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.terms}
        </Link>{" "}
        and{" "}
        <Link href={withLocale(locale, "/privacy")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.privacy}
        </Link>
      </>
    ) : (
      <>
        我同意{" "}
        <Link href={withLocale(locale, "/terms")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.terms}
        </Link>{" "}
        {locale === "zh-Hant" ? "與" : "与"}{" "}
        <Link href={withLocale(locale, "/privacy")} className="font-medium text-sky-700 underline-offset-4 hover:underline">
          {t.home.footerLinks.privacy}
        </Link>
      </>
    );

  return (
    <div className="auth-form-fade w-full rounded-[30px] border border-[rgba(196,210,228,0.5)] bg-white/92 p-6 shadow-[0_24px_50px_rgba(31,55,92,0.08)] backdrop-blur-xl md:p-9">
      <div className="mb-7 space-y-3">
        <div className="inline-flex rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-sky-700">
          {mode === "login" ? (locale === "zh-Hant" ? "歡迎回來" : "WELCOME BACK") : locale === "zh-Hant" ? "免費開始" : "START FREE"}
        </div>
        <h1 className="text-balance text-[34px] font-semibold leading-[1.15] text-slate-900">
          {mode === "login"
            ? locale === "zh-Hant"
              ? "輸入你的工作信箱"
              : "Enter your work email"
            : locale === "zh-Hant"
              ? "建立你的工作帳號"
              : "Create your work account"}
        </h1>
        <p className="text-sm leading-6 text-slate-500">{mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}</p>
      </div>
      {mode === "login" ? (
        <>
          <Button type="button" variant="secondary" className="h-12 w-full rounded-[14px] text-base" disabled icon={<GoogleMark />}>
            {t.auth.googleAction}
          </Button>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[rgba(190,206,226,0.55)]" />
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{t.auth.orDivider}</span>
            <div className="h-px flex-1 bg-[rgba(190,206,226,0.55)]" />
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-500">{t.auth.googleHelper}</p>
        </>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label={t.auth.email}
          type="email"
          placeholder="name@company.com"
          error={errors.email?.message?.toString()}
          className="h-12 rounded-[14px]"
          {...register("email")}
        />
        <Input
          label={t.auth.password}
          type="password"
          placeholder="******"
          error={errors.password?.message?.toString()}
          className="h-12 rounded-[14px]"
          {...register("password")}
        />
        {mode === "register" ? (
          <>
            <Input
              label={t.auth.confirmPassword}
              type="password"
              placeholder="******"
              error={errors.confirmPassword?.message?.toString()}
              className="h-12 rounded-[14px]"
              {...register("confirmPassword")}
            />
            <label className="flex items-start gap-3 rounded-[16px] border border-slate-200 bg-slate-50/85 px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" {...register("agreeTerms")} />
              <span>{termsAgreementContent}</span>
            </label>
            {errors.agreeTerms ? <p className="text-sm text-rose-600">{errors.agreeTerms.message?.toString()}</p> : null}
          </>
        ) : null}
        <Button className="h-12 w-full rounded-[12px] text-base" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t.common.loading : mode === "login" ? t.auth.loginAction : t.auth.registerAction}
        </Button>
        {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        {mode === "login" ? (
          <>
            <span>{t.auth.forgotPassword}</span>
            <Link href={withLocale(locale, "/register")} className="font-medium text-sky-700">
              {t.auth.toRegister}
            </Link>
          </>
        ) : (
          <>
            <span>{t.auth.helper}</span>
            <Link href={withLocale(locale, "/login")} className="font-medium text-sky-700">
              {t.auth.toLogin}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
