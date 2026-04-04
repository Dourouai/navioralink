"use client";

import Link from "next/link";
import { CreditCard, KeyRound, Mail, ReceiptText, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { requestEmailChangeCode, requestPasswordChangeCode, updateAccountEmail, updateAccountPassword } from "@/lib/services";
import { currentPlan, billingHistory } from "@/mock/billing";
import { useAuthStore } from "@/store/auth-store";

interface SettingsCenterProps {
  locale: Locale;
}

const timezoneOptions = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Vancouver",
  "Australia/Sydney",
];

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh-Hant" ? "zh-Hant" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh-Hant" ? "zh-Hant" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsageValue(value: number, type: "default" | "storage", locale: Locale) {
  if (!Number.isFinite(value)) {
    return getMessages(locale).common.unlimited;
  }

  if (type === "storage") {
    return `${value} MB`;
  }

  return new Intl.NumberFormat(locale === "zh-Hant" ? "zh-Hant" : "en-US").format(value);
}

interface SecurityModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}

function SecurityModal({ open, title, description, onClose, children }: SecurityModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(15,23,42,0.44)] px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96))] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-[rgba(187,203,225,0.55)] sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={title}
        >
          <X size={18} />
        </button>

        <div className="pr-10">
          <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function SettingsCenter({ locale }: SettingsCenterProps) {
  const t = getMessages(locale);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [activeModal, setActiveModal] = useState<"email" | "password" | null>(null);
  const [emailForm, setEmailForm] = useState({
    currentPassword: "",
    newEmail: "",
    verificationCode: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    verificationCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailErrors, setEmailErrors] = useState<{
    currentPassword?: string;
    newEmail?: string;
    verificationCode?: string;
  }>({});
  const [passwordErrors, setPasswordErrors] = useState<{
    verificationCode?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [emailSuccess, setEmailSuccess] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [emailCodePending, setEmailCodePending] = useState(false);
  const [passwordCodePending, setPasswordCodePending] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(user?.timezone ?? "UTC");
  const [timezoneSuccess, setTimezoneSuccess] = useState("");

  const currentEmail = user?.email ?? "hello@naviora.com";
  const accountName = user?.name ?? "Naviora User";
  const canEditNewEmail = emailForm.currentPassword.trim().length > 0;
  const canSetNextPassword = passwordForm.verificationCode.trim().length > 0;
  const usageItems = [
    {
      label: t.settings.usageEntries,
      used: currentPlan.usage.entries.used,
      limit: currentPlan.usage.entries.limit,
      type: "default" as const,
    },
    {
      label: t.settings.usageAiConversations,
      used: currentPlan.usage.aiConversations.used,
      limit: currentPlan.usage.aiConversations.limit,
      type: "default" as const,
    },
    {
      label: t.settings.usageMonthlyVisits,
      used: currentPlan.usage.monthlyVisits.used,
      limit: currentPlan.usage.monthlyVisits.limit,
      type: "default" as const,
    },
    {
      label: t.settings.usageStorage,
      used: currentPlan.usage.storageMb.used,
      limit: currentPlan.usage.storageMb.limit,
      type: "storage" as const,
    },
  ];
  const timezonePreview = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale === "zh-Hant" ? "zh-Hant" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: selectedTimezone,
      }).format(new Date());
    } catch {
      return "";
    }
  }, [locale, selectedTimezone]);

  useEffect(() => {
    if (user?.timezone) {
      setSelectedTimezone(user.timezone);
      return;
    }

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone) {
      setSelectedTimezone(browserTimezone);
    }
  }, [user?.timezone]);

  function openEmailModal() {
    setActiveModal("email");
    setEmailErrors({});
    setEmailCodeSent(false);
    setEmailForm({
      currentPassword: "",
      newEmail: "",
      verificationCode: "",
    });
  }

  function openPasswordModal() {
    setActiveModal("password");
    setPasswordErrors({});
    setPasswordCodeSent(false);
    setPasswordForm({
      verificationCode: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  function closeActiveModal() {
    setActiveModal(null);
    setEmailErrors({});
    setPasswordErrors({});
  }

  async function handleEmailCodeSend() {
    const nextErrors: typeof emailErrors = {};
    const normalizedEmail = emailForm.newEmail.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!emailForm.currentPassword.trim()) {
      nextErrors.currentPassword = t.settings.currentPasswordRequired;
    }

    if (!isValidEmail) {
      nextErrors.newEmail = t.settings.emailInvalid;
    } else if (normalizedEmail.toLowerCase() === currentEmail.toLowerCase()) {
      nextErrors.newEmail = t.settings.emailSame;
    }

    if (Object.keys(nextErrors).length > 0) {
      setEmailErrors(nextErrors);
      return;
    }

    setEmailCodePending(true);
    setEmailErrors({});

    try {
      await requestEmailChangeCode(normalizedEmail);
      setEmailCodeSent(true);
    } finally {
      setEmailCodePending(false);
    }
  }

  async function handlePasswordCodeSend() {
    setPasswordCodePending(true);
    setPasswordErrors((currentErrors) => ({ ...currentErrors, verificationCode: undefined }));

    try {
      await requestPasswordChangeCode(currentEmail);
      setPasswordCodeSent(true);
    } finally {
      setPasswordCodePending(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailSuccess("");
    setEmailErrors({});

    const normalizedEmail = emailForm.newEmail.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const nextErrors: typeof emailErrors = {};

    if (!emailForm.currentPassword.trim()) {
      nextErrors.currentPassword = t.settings.currentPasswordRequired;
    }

    if (!isValidEmail) {
      nextErrors.newEmail = t.settings.emailInvalid;
    }

    if (normalizedEmail.toLowerCase() === currentEmail.toLowerCase()) {
      nextErrors.newEmail = t.settings.emailSame;
    }

    if (!emailForm.verificationCode.trim()) {
      nextErrors.verificationCode = t.settings.verificationCodeRequired;
    }

    if (Object.keys(nextErrors).length > 0) {
      setEmailErrors(nextErrors);
      return;
    }

    setEmailPending(true);
    try {
      await updateAccountEmail(normalizedEmail);
      updateUser({ email: normalizedEmail });
      setEmailSuccess(t.settings.emailUpdated);
      closeActiveModal();
    } finally {
      setEmailPending(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSuccess("");
    setPasswordErrors({});
    const nextErrors: typeof passwordErrors = {};

    if (!passwordForm.verificationCode.trim()) {
      nextErrors.verificationCode = t.settings.verificationCodeRequired;
    }

    if (passwordForm.newPassword.length < 8) {
      nextErrors.newPassword = t.settings.passwordTooShort;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = t.settings.passwordMismatch;
    }

    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      return;
    }

    setPasswordPending(true);
    try {
      await updateAccountPassword();
      setPasswordSuccess(t.settings.passwordUpdated);
      closeActiveModal();
    } finally {
      setPasswordPending(false);
    }
  }

  function handleTimezoneSave() {
    updateUser({ timezone: selectedTimezone });
    setTimezoneSuccess(t.settings.timezoneUpdated);
    window.setTimeout(() => setTimezoneSuccess(""), 1800);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={t.common.settings}
        title={t.settings.title}
        description={t.settings.subtitle}
        actions={
          <>
            <Link href={withLocale(locale, "/upgrade")}>
              <Button variant="secondary">{t.settings.managePlan}</Button>
            </Link>
            <Link href={withLocale(locale, "/about")}>
              <Button>{t.settings.contactSales}</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ShieldCheck size={18} className="text-emerald-600" />
                {t.settings.overviewTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t.settings.overviewBody}</p>
            </div>
            <Badge tone="success">{t.settings.verifiedStatus}</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.accountName}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{accountName}</div>
            </div>
            <div className="rounded-[22px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.accountEmail}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{currentEmail}</div>
            </div>
            <div className="rounded-[22px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.memberSince}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{formatDate(user?.createdAt ?? "2026-03-16T08:00:00.000Z", locale)}</div>
            </div>
            <div className="rounded-[22px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.accountStatus}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{t.settings.verifiedStatus}</div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(236,251,255,0.96),rgba(244,240,255,0.94))] p-5 ring-1 ring-[rgba(174,206,241,0.42)]">
            <div className="text-sm font-semibold text-slate-900">{t.settings.securityTitle}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t.settings.securityBody}</p>
          </div>

          <div className="rounded-[24px] bg-white/92 p-5 ring-1 ring-[rgba(190,206,226,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t.settings.timezoneTitle}</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t.settings.timezoneBody}</p>
              </div>
              <Button type="button" variant="secondary" onClick={handleTimezoneSave} className="shrink-0 whitespace-nowrap rounded-[14px] px-4 py-2">
                {t.settings.saveTimezone}
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">{t.settings.timezoneLabel}</span>
                <select
                  value={selectedTimezone}
                  onChange={(event) => setSelectedTimezone(event.target.value)}
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-white/92 px-4 text-sm text-slate-900 outline-none transition focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                >
                  {Array.from(new Set([...timezoneOptions, selectedTimezone])).map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-[18px] bg-[rgba(243,247,255,0.86)] px-4 py-3 text-sm text-slate-600 ring-1 ring-[rgba(190,206,226,0.46)]">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.timezoneCurrentTime}</div>
                <div className="mt-2 font-medium text-slate-900">{timezonePreview}</div>
              </div>
            </div>

            {timezoneSuccess ? <div className="mt-4 rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{timezoneSuccess}</div> : null}
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <CreditCard size={18} className="text-sky-600" />
                {t.settings.currentPlanTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t.settings.currentPlanBody}</p>
            </div>
            <Badge tone="info">{currentPlan.name}</Badge>
          </div>

          <div className="rounded-[24px] bg-[linear-gradient(165deg,#121c2f_0%,#1a2b45_60%,#131f36_100%)] p-5 text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-sky-200">{t.settings.currentPlanLabel}</div>
                <div className="mt-2 text-3xl font-semibold">{currentPlan.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-300">{t.settings.billingCycle}</div>
                <div className="mt-2 text-xl font-semibold">
                  {formatCurrency(currentPlan.price, currentPlan.currency, locale)} / {currentPlan.billingCycle === "monthly" ? t.settings.monthly : t.settings.yearly}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] bg-white/10 px-4 py-3 ring-1 ring-white/12">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-300">{t.settings.renewalDate}</div>
                <div className="mt-2 text-sm font-semibold text-white">{formatDate(currentPlan.renewalDate, locale)}</div>
              </div>
              <div className="rounded-[18px] bg-white/10 px-4 py-3 ring-1 ring-white/12">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-300">{t.settings.paymentMethod}</div>
                <div className="mt-2 text-sm font-semibold text-white">{currentPlan.paymentMethod}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">{t.settings.usageTitle}</div>
            <div className="mt-4 space-y-4">
              {usageItems.map((item) => {
                const progress = Number.isFinite(item.limit) ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 100;
                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className="text-slate-500">
                        {formatUsageValue(item.used, item.type, locale)} / {formatUsageValue(item.limit, item.type, locale)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div className="h-2.5 rounded-full bg-[linear-gradient(135deg,#1abef3_0%,#3f8cff_58%,#8d79ff_100%)]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Mail size={18} className="text-sky-600" />
                {t.settings.emailTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t.settings.emailBody}</p>
            </div>
            <Button variant="secondary" onClick={openEmailModal} className="shrink-0 whitespace-nowrap rounded-[14px] px-4 py-2">
              {t.settings.changeEmailAction}
            </Button>
          </div>

          <div className="rounded-[24px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.currentEmail}</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{currentEmail}</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{t.settings.emailFlowHint}</p>
          </div>

          {emailSuccess ? <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{emailSuccess}</div> : null}
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <KeyRound size={18} className="text-violet-600" />
                {t.settings.passwordTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t.settings.passwordBody}</p>
            </div>
            <Button variant="secondary" onClick={openPasswordModal} className="shrink-0 whitespace-nowrap rounded-[14px] px-4 py-2">
              {t.settings.changePasswordAction}
            </Button>
          </div>

          <div className="rounded-[24px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.accountEmail}</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{currentEmail}</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{t.settings.passwordFlowHint}</p>
          </div>

          {passwordSuccess ? <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{passwordSuccess}</div> : null}
        </Card>
      </div>

      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ReceiptText size={18} className="text-amber-600" />
              {t.settings.billingHistoryTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t.settings.billingHistoryBody}</p>
          </div>
          <Badge tone="default">{billingHistory.length}</Badge>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white/90">
          <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.7fr] gap-3 border-b border-slate-100 px-5 py-3 text-xs uppercase tracking-[0.14em] text-slate-400 md:grid">
            <div>{t.settings.invoiceNumber}</div>
            <div>{t.settings.invoiceDate}</div>
            <div>{t.settings.invoiceAmount}</div>
            <div>{t.settings.invoiceStatus}</div>
          </div>

          {billingHistory.map((invoice) => {
            const statusTone: "default" | "success" | "danger" = invoice.status === "paid" ? "success" : invoice.status === "failed" ? "danger" : "default";
            const statusLabel = invoice.status === "paid" ? t.settings.paid : invoice.status === "failed" ? t.settings.failed : t.settings.pending;

            return (
              <div
                key={invoice.id}
                className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-700 md:grid-cols-[1.2fr_1fr_0.8fr_0.7fr] md:items-center"
              >
                <div className="font-semibold text-slate-900">{invoice.id}</div>
                <div>{formatDate(invoice.issuedAt, locale)}</div>
                <div>{formatCurrency(invoice.amount, invoice.currency, locale)}</div>
                <div>
                  <Badge tone={statusTone}>{statusLabel}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <SecurityModal open={activeModal === "email"} title={t.settings.emailModalTitle} description={t.settings.emailModalBody} onClose={closeActiveModal}>
        <form className="space-y-4" onSubmit={handleEmailSubmit}>
          <Input label={t.settings.currentEmail} value={currentEmail} disabled className="h-12 rounded-[16px]" />
          <Input
            label={t.settings.currentPassword}
            type="password"
            value={emailForm.currentPassword}
            onChange={(event) => {
              setEmailForm((currentForm) => ({ ...currentForm, currentPassword: event.target.value }));
              setEmailErrors((currentErrors) => ({ ...currentErrors, currentPassword: undefined }));
            }}
            error={emailErrors.currentPassword}
            hint={t.settings.emailPasswordStepHint}
            className="h-12 rounded-[16px]"
          />

          {canEditNewEmail ? (
            <>
              <Input
                label={t.settings.newEmail}
                type="email"
                value={emailForm.newEmail}
                onChange={(event) => {
                  setEmailForm((currentForm) => ({ ...currentForm, newEmail: event.target.value }));
                  setEmailErrors((currentErrors) => ({ ...currentErrors, newEmail: undefined }));
                }}
                placeholder="name@company.com"
                error={emailErrors.newEmail}
                className="h-12 rounded-[16px]"
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <Input
                  label={t.settings.emailVerificationCode}
                  value={emailForm.verificationCode}
                  onChange={(event) => {
                    setEmailForm((currentForm) => ({ ...currentForm, verificationCode: event.target.value }));
                    setEmailErrors((currentErrors) => ({ ...currentErrors, verificationCode: undefined }));
                  }}
                  error={emailErrors.verificationCode}
                  hint={emailCodeSent ? t.settings.verificationCodeSent : undefined}
                  className="h-12 rounded-[16px]"
                />
                <Button type="button" variant="secondary" onClick={handleEmailCodeSend} disabled={emailCodePending} className="h-12 rounded-[16px] px-5">
                  {emailCodePending ? t.common.loading : emailCodeSent ? t.settings.resendVerificationCode : t.settings.sendVerificationCode}
                </Button>
              </div>
            </>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeActiveModal}>
              {t.settings.cancelAction}
            </Button>
            <Button type="submit" disabled={emailPending}>
              {emailPending ? t.common.loading : t.settings.saveEmail}
            </Button>
          </div>
        </form>
      </SecurityModal>

      <SecurityModal
        open={activeModal === "password"}
        title={t.settings.passwordModalTitle}
        description={t.settings.passwordModalBody}
        onClose={closeActiveModal}
      >
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <div className="rounded-[20px] bg-[rgba(243,247,255,0.86)] px-4 py-3 text-sm text-slate-600 ring-1 ring-[rgba(190,206,226,0.46)]">
            <div className="font-medium text-slate-900">{t.settings.accountEmail}</div>
            <div className="mt-1">{currentEmail}</div>
          </div>

          <div className="rounded-[20px] bg-white/92 p-4 ring-1 ring-[rgba(190,206,226,0.46)]">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input
              label={t.settings.passwordVerificationCode}
              value={passwordForm.verificationCode}
              onChange={(event) => {
                setPasswordForm((currentForm) => ({ ...currentForm, verificationCode: event.target.value }));
                setPasswordErrors((currentErrors) => ({ ...currentErrors, verificationCode: undefined }));
              }}
              error={passwordErrors.verificationCode}
              hint={passwordCodeSent ? t.settings.verificationCodeSent : t.settings.passwordCodeHint}
              className="h-12 rounded-[16px]"
            />
              <Button
                type="button"
                variant="secondary"
                onClick={handlePasswordCodeSend}
                disabled={passwordCodePending}
                className="h-12 min-w-[116px] rounded-[16px] px-5 whitespace-nowrap"
              >
              {passwordCodePending ? t.common.loading : passwordCodeSent ? t.settings.resendVerificationCode : t.settings.sendVerificationCode}
            </Button>
            </div>
          </div>

          {canSetNextPassword ? (
            <div className="rounded-[20px] bg-white/92 p-4 ring-1 ring-[rgba(190,206,226,0.46)] space-y-4">
              <Input
                label={t.settings.newPassword}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => {
                  setPasswordForm((currentForm) => ({ ...currentForm, newPassword: event.target.value }));
                  setPasswordErrors((currentErrors) => ({ ...currentErrors, newPassword: undefined }));
                }}
                error={passwordErrors.newPassword}
                className="h-12 rounded-[16px]"
              />
              <Input
                label={t.settings.confirmNewPassword}
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => {
                  setPasswordForm((currentForm) => ({ ...currentForm, confirmPassword: event.target.value }));
                  setPasswordErrors((currentErrors) => ({ ...currentErrors, confirmPassword: undefined }));
                }}
                error={passwordErrors.confirmPassword}
                className="h-12 rounded-[16px]"
              />
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={closeActiveModal}>
              {t.settings.cancelAction}
            </Button>
            <Button type="submit" disabled={passwordPending}>
              {passwordPending ? t.common.loading : t.settings.savePassword}
            </Button>
          </div>
        </form>
      </SecurityModal>
    </div>
  );
}
