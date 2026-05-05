"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { logout, updateRecoveryPassword } from "@/lib/services";

interface ResetPasswordFormProps {
  locale: Locale;
}

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type ResetPasswordValues = z.infer<typeof schema>;

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setSubmitError("");
    setSuccess("");

    try {
      await updateRecoveryPassword({ newPassword: values.password });
      await logout().catch(() => undefined);
      setSuccess(t.auth.resetPasswordSuccess);
      window.setTimeout(() => {
        router.push(`${withLocale(locale, "/login")}?authNotice=${encodeURIComponent(t.auth.resetPasswordSuccess)}`);
      }, 800);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t.auth.resetPasswordInvalid);
    }
  };

  return (
    <div className="w-full rounded-[30px] border border-[rgba(196,210,228,0.5)] bg-white/92 p-6 shadow-[0_24px_50px_rgba(31,55,92,0.08)] backdrop-blur-xl md:p-9">
      <div className="mb-7 space-y-3">
        <div className="inline-flex rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-sky-700">
          {locale === "zh-Hant" ? "設定新密碼" : locale === "zh-Hans" ? "设置新密码" : "SET NEW PASSWORD"}
        </div>
        <h1 className="text-balance text-[34px] font-semibold leading-[1.15] text-slate-900">{t.auth.resetPasswordTitle}</h1>
        <p className="text-sm leading-6 text-slate-500">{t.auth.resetPasswordSubtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label={t.auth.password}
          type="password"
          placeholder="********"
          error={errors.password?.message?.toString()}
          className="h-12 rounded-[14px]"
          {...register("password")}
        />
        <Input
          label={t.auth.confirmPassword}
          type="password"
          placeholder="********"
          error={errors.confirmPassword?.message?.toString()}
          className="h-12 rounded-[14px]"
          {...register("confirmPassword")}
        />
        <Button className="h-12 w-full rounded-[12px] text-base" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t.common.loading : t.auth.resetPasswordAction}
        </Button>
        {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      </form>

      <div className="mt-6 text-sm text-slate-500">
        <Link href={withLocale(locale, "/login")} className="font-medium text-sky-700">
          {t.auth.backToLogin}
        </Link>
      </div>
    </div>
  );
}
