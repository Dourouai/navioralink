"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { resendVerificationEmail } from "@/lib/services";

interface VerifyEmailActionsProps {
  locale: Locale;
  email?: string;
}

export function VerifyEmailActions({ locale, email }: VerifyEmailActionsProps) {
  const t = getMessages(locale);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email) {
      setError(t.auth.verifyEmailResendUnavailable);
      return;
    }

    setPending(true);
    setSuccess("");
    setError("");

    try {
      await resendVerificationEmail({ email, locale });
      setSuccess(t.auth.verifyEmailResent);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : t.auth.verifyEmailResendUnavailable);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <Button type="button" variant="secondary" onClick={handleResend} disabled={pending || !email} className="h-11 rounded-[12px] px-5">
        {pending ? t.common.loading : t.auth.verifyEmailResend}
      </Button>
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
