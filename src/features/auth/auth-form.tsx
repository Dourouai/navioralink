"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { login, register as registerUser } from "@/mock/services";
import { useAuthStore } from "@/store/auth-store";

interface AuthFormProps {
  locale: Locale;
  mode: "login" | "register";
}

export function AuthForm({ locale, mode }: AuthFormProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const token = useAuthStore((state) => state.token);
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

  const onSubmit = async () => {
    const result = mode === "login" ? await login() : await registerUser();
    setSession(result);
    router.push(withLocale(locale, "/dashboard"));
  };

  useEffect(() => {
    if (token) {
      router.replace(withLocale(locale, "/dashboard"));
    }
  }, [locale, router, token]);

  return (
    <Card className="mx-auto w-full max-w-xl p-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}</h1>
        <p className="text-sm leading-6 text-slate-500">{mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label={t.auth.email} type="email" placeholder="hello@zapsqr.com" error={errors.email?.message?.toString()} {...register("email")} />
        <Input label={t.auth.password} type="password" placeholder="******" error={errors.password?.message?.toString()} {...register("password")} />
        {mode === "register" ? (
          <>
            <Input
              label={t.auth.confirmPassword}
              type="password"
              placeholder="******"
              error={errors.confirmPassword?.message?.toString()}
              {...register("confirmPassword")}
            />
            <label className="flex items-start gap-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <input type="checkbox" className="mt-1 h-4 w-4" {...register("agreeTerms")} />
              <span>{t.auth.agreeTerms}</span>
            </label>
            {errors.agreeTerms ? <p className="text-sm text-rose-600">{errors.agreeTerms.message?.toString()}</p> : null}
          </>
        ) : null}
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t.common.loading : mode === "login" ? t.auth.loginAction : t.auth.registerAction}
        </Button>
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
    </Card>
  );
}
