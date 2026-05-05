"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { requestPasswordReset } from "@/lib/services";

interface ForgotPasswordFormProps {
  locale: Locale;
}

const schema = z.object({
  email: z.string().email("Please enter a valid email."),
});

type ForgotPasswordValues = z.infer<typeof schema>;

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const t = getMessages(locale);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setSubmitError("");
    setSuccess("");

    try {
      await requestPasswordReset({ email: values.email, locale });
      setSuccess(t.auth.forgotPasswordSent);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="w-full rounded-[30px] border border-[rgba(196,210,228,0.5)] bg-white/92 p-6 shadow-[0_24px_50px_rgba(31,55,92,0.08)] backdrop-blur-xl md:p-9">
      <div className="mb-7 space-y-3">
        <div className="inline-flex rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-sky-700">
          {locale === "zh-Hant" ? "密碼重設" : locale === "zh-Hans" ? "密码重置" : "PASSWORD RESET"}
        </div>
        <h1 className="text-balance text-[34px] font-semibold leading-[1.15] text-slate-900">{t.auth.forgotPasswordTitle}</h1>
        <p className="text-sm leading-6 text-slate-500">{t.auth.forgotPasswordSubtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label={t.auth.email}
          type="email"
          placeholder="name@company.com"
          error={errors.email?.message?.toString()}
          className="h-12 rounded-[14px]"
          {...register("email")}
        />
        <p className="text-sm text-slate-500">{t.auth.forgotPasswordHint}</p>
        <Button className="h-12 w-full rounded-[12px] text-base" type="submit" disabled={isSubmitting}>
          {isSubmitting ? t.common.loading : t.auth.forgotPasswordAction}
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
