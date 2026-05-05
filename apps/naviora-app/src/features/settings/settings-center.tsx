"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreditCard, KeyRound, Mail, ReceiptText, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ActivationCodeRedeemCard } from "@/features/billing/activation-code-redeem-card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getIntlLocale } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import {
  getConnectedAuthIdentities,
  linkGoogleIdentity,
  unlinkGoogleIdentity,
  requestEmailChangeCode,
  requestPasswordChangeCode,
  updateAccountEmail,
  updateAccountPassword,
  updateAccountProfile,
  verifyCurrentPasswordForEmailChange,
  requestPlanDowngrade,
} from "@/lib/services";
import { useAuthStore } from "@/store/auth-store";
import type { BillingHistoryItem, CurrentPlanSnapshot, MembershipChangeItem } from "@/types/billing";

interface SettingsCenterProps {
  locale: Locale;
  currentPlan: CurrentPlanSnapshot;
  billingHistory: BillingHistoryItem[];
  membershipChanges: MembershipChangeItem[];
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
const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getPlanLabel(planCode: "free" | "starter" | "premium" | null | undefined) {
  if (planCode === "starter") {
    return "Starter";
  }

  if (planCode === "premium") {
    return "Plus";
  }

  return "Free";
}

function getMembershipChangeActionLabel(
  action: MembershipChangeItem["action"],
  locale: Locale,
) {
  if (action === "upgrade") {
    return locale === "zh-Hant" ? "升級" : locale === "zh-Hans" ? "升级" : "Upgrade";
  }

  if (action === "downgrade") {
    return locale === "zh-Hant" ? "降級" : locale === "zh-Hans" ? "降级" : "Downgrade";
  }

  return locale === "zh-Hant" ? "激活碼生效" : locale === "zh-Hans" ? "激活码生效" : "Activation code";
}

function formatCurrency(value: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUsageValue(value: number, type: "default" | "storage", locale: Locale) {
  if (!Number.isFinite(value)) {
    return getMessages(locale).common.unlimited;
  }

  if (type === "storage") {
    return `${value} MB`;
  }

  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

function getBillingNoticeMessage(code: string, locale: Locale) {
  const t = getMessages(locale);

  switch (code) {
    case "checkout-complete":
      return t.settings.billingNoticeCheckoutComplete;
    case "plan-updated":
      return t.settings.billingNoticePlanUpdated;
    case "current-plan":
      return t.settings.billingNoticeCurrentPlan;
    default:
      return "";
  }
}

function getBillingErrorMessage(code: string, locale: Locale) {
  const t = getMessages(locale);

  switch (code) {
    case "invalid-plan":
    case "invalid-billing-cycle":
      return t.settings.billingErrorInvalidSelection;
    case "billing-unavailable":
      return t.settings.billingErrorUnavailable;
    case "billing-request-failed":
      return t.settings.billingErrorRequestFailed;
    case "portal-unavailable":
      return t.settings.billingErrorPortalUnavailable;
    default:
      return "";
  }
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
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96))] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-[rgba(187,203,225,0.55)] sm:p-6">
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

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function GoogleMark({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
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

export function SettingsCenter({ locale, currentPlan, billingHistory, membershipChanges }: SettingsCenterProps) {
  const t = getMessages(locale);
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const authNotice = searchParams?.get("authNotice") ?? "";
  const authError = searchParams?.get("authError") ?? "";
  const billingNotice = searchParams?.get("billingNotice") ?? "";
  const billingError = searchParams?.get("billingError") ?? "";

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
  const [emailPasswordPending, setEmailPasswordPending] = useState(false);
  const [emailCodePending, setEmailCodePending] = useState(false);
  const [passwordCodePending, setPasswordCodePending] = useState(false);
  const [emailPasswordVerified, setEmailPasswordVerified] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [emailPasswordSuccess, setEmailPasswordSuccess] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState(user?.timezone ?? "UTC");
  const [timezoneSuccess, setTimezoneSuccess] = useState("");
  const [timezonePending, setTimezonePending] = useState(false);
  const [timezoneError, setTimezoneError] = useState("");
  const [authIdentities, setAuthIdentities] = useState<Array<{ provider: string; identityId: string }>>([]);
  const [authProvidersPending, setAuthProvidersPending] = useState(false);
  const [authProviderSuccess, setAuthProviderSuccess] = useState("");
  const [authProviderError, setAuthProviderError] = useState("");
  const [googleLinkPending, setGoogleLinkPending] = useState(false);
  const [googleUnlinkPending, setGoogleUnlinkPending] = useState(false);
  const [downgradePending, setDowngradePending] = useState(false);
  const [downgradeSuccess, setDowngradeSuccess] = useState("");
  const [downgradeError, setDowngradeError] = useState("");
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const currentEmail = user?.email ?? "hello@naviora.com";
  const accountName = user?.name ?? "Naviora User";
  const canEditNewEmail = emailPasswordVerified;
  const canSetNextPassword = passwordForm.verificationCode.trim().length > 0;
  const authProviders = authIdentities.map((identity) => identity.provider);
  const googleConnected = authProviders.includes("google");
  const canUnlinkGoogle = googleConnected && authIdentities.length >= 2;
  const billingNoticeMessage = getBillingNoticeMessage(billingNotice, locale);
  const billingErrorMessage = getBillingErrorMessage(billingError, locale);
  const manageBillingHref = `/api/billing/portal?locale=${locale}`;
  const pricingPageHref = withLocale(locale, "/upgrade");
  const canManageBilling = Boolean(currentPlan.billingPortalAvailable);
  const canUpgradeFromFree = currentPlan.code === "free";
  const canUpgradeToPlus = currentPlan.code === "starter";
  const canDowngradeToStarter = currentPlan.code === "premium";
  const upgradeToPlusHref = `/api/billing/checkout?plan=premium&billing=${currentPlan.billingCycle}&locale=${locale}`;
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
      return new Intl.DateTimeFormat(getIntlLocale(locale), {
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

  useEffect(() => {
    if (!user?.id) {
      setAuthIdentities([]);
      setAuthProvidersPending(false);
      return;
    }

    let active = true;
    setAuthProvidersPending(true);

    getConnectedAuthIdentities()
      .then((identities) => {
        if (!active) return;
        setAuthIdentities(identities);
      })
      .catch((error) => {
        if (!active) return;
        setAuthProviderError(error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE);
      })
      .finally(() => {
        if (!active) return;
        setAuthProvidersPending(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!authNotice) {
      return;
    }

    setAuthProviderSuccess(authNotice);
    setAuthProviderError("");
  }, [authNotice]);

  useEffect(() => {
    if (!authError) {
      return;
    }

    setAuthProviderError(authError);
  }, [authError]);

  useEffect(() => {
    if (!authProviderSuccess) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAuthProviderSuccess("");
    }, 3600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [authProviderSuccess]);

  function openEmailModal() {
    setActiveModal("email");
    setEmailErrors({});
    setEmailPasswordSuccess("");
    setEmailPasswordVerified(false);
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
    setPasswordSuccess("");
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
    setEmailPasswordSuccess("");
    setEmailPasswordVerified(false);
  }

  async function handleEmailPasswordVerify() {
    const nextErrors: typeof emailErrors = {};

    if (!emailForm.currentPassword.trim()) {
      nextErrors.currentPassword = t.settings.currentPasswordRequired;
    }

    if (Object.keys(nextErrors).length > 0) {
      setEmailErrors(nextErrors);
      return;
    }

    setEmailPasswordPending(true);
    setEmailErrors((currentErrors) => ({
      ...currentErrors,
      currentPassword: undefined,
      newEmail: undefined,
      verificationCode: undefined,
    }));

    try {
      await verifyCurrentPasswordForEmailChange({
        currentPassword: emailForm.currentPassword,
        currentEmail,
      });
      setEmailPasswordVerified(true);
      setEmailPasswordSuccess(t.settings.emailPasswordVerified);
    } catch (error) {
      setEmailPasswordVerified(false);
      setEmailPasswordSuccess("");
      setEmailErrors({
        currentPassword: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
      });
    } finally {
      setEmailPasswordPending(false);
    }
  }

  async function handleEmailCodeSend() {
    const nextErrors: typeof emailErrors = {};
    const normalizedEmail = emailForm.newEmail.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!emailPasswordVerified) {
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
    setEmailErrors((currentErrors) => ({ ...currentErrors, newEmail: undefined, verificationCode: undefined }));

    try {
      await requestEmailChangeCode({
        newEmail: normalizedEmail,
        currentEmail,
        locale,
      });
      setEmailCodeSent(true);
    } catch (error) {
      setEmailErrors({
        currentPassword: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
      });
    } finally {
      setEmailCodePending(false);
    }
  }

  async function handlePasswordCodeSend() {
    setPasswordCodePending(true);
    setPasswordErrors((currentErrors) => ({ ...currentErrors, verificationCode: undefined }));

    try {
      await requestPasswordChangeCode(locale);
      setPasswordCodeSent(true);
    } catch (error) {
      setPasswordErrors({
        verificationCode: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
      });
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

    if (!emailPasswordVerified) {
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
      const updatedUser = await updateAccountEmail({
        newEmail: normalizedEmail,
        verificationCode: emailForm.verificationCode.trim(),
      });
      updateUser(updatedUser);
      setEmailSuccess(t.settings.emailUpdated);
      closeActiveModal();
    } catch (error) {
      setEmailErrors({
        verificationCode: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
      });
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
      await updateAccountPassword({
        verificationCode: passwordForm.verificationCode.trim(),
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(t.settings.passwordUpdated);
      closeActiveModal();
    } catch (error) {
      setPasswordErrors({
        verificationCode: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
      });
    } finally {
      setPasswordPending(false);
    }
  }

  async function handleTimezoneSave() {
    setTimezonePending(true);
    setTimezoneError("");
    setTimezoneSuccess("");

    try {
      const updatedUser = await updateAccountProfile({ timezone: selectedTimezone });
      updateUser(updatedUser);
      setTimezoneSuccess(t.settings.timezoneUpdated);
      window.setTimeout(() => setTimezoneSuccess(""), 1800);
    } catch (error) {
      setTimezoneError(error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setTimezonePending(false);
    }
  }

  async function handleGoogleConnect() {
    setAuthProviderError("");
    setAuthProviderSuccess("");
    setGoogleLinkPending(true);

    try {
      await linkGoogleIdentity(locale);
    } catch (error) {
      setAuthProviderError(error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE);
      setGoogleLinkPending(false);
    }
  }

  async function handleGoogleDisconnect() {
    setAuthProviderError("");
    setAuthProviderSuccess("");
    setGoogleUnlinkPending(true);

    try {
      const result = await unlinkGoogleIdentity(locale);
      const identities = await getConnectedAuthIdentities();
      setAuthIdentities(identities);
      setAuthProviderSuccess(result.notice);
    } catch (error) {
      setAuthProviderError(error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setGoogleUnlinkPending(false);
    }
  }

  async function handlePlanDowngrade() {
    setDowngradePending(true);
    setDowngradeError("");
    setDowngradeSuccess("");

    try {
      const result = await requestPlanDowngrade();
      setShowDowngradeModal(false);
      setDowngradeSuccess(
        locale === "zh-Hant"
          ? `已切換為 Starter，新的有效期到 ${result.currentPeriodEnd ? formatDate(result.currentPeriodEnd, locale) : "稍後同步"}。`
          : locale === "zh-Hans"
            ? `已切换为 Starter，新的有效期到 ${result.currentPeriodEnd ? formatDate(result.currentPeriodEnd, locale) : "稍后同步"}。`
            : `The workspace is now on Starter. The new access date is ${result.currentPeriodEnd ? formatDate(result.currentPeriodEnd, locale) : "updating shortly"}.`,
      );
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setDowngradeError(error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setDowngradePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={t.common.settings}
        title={t.settings.title}
        description={t.settings.subtitle}
        actions={
          <>
            <Link href={pricingPageHref}>
              <Button variant="secondary">{t.settings.managePlan}</Button>
            </Link>
            <Link href={withLocale(locale, "/about")}>
              <Button>{t.settings.contactSales}</Button>
            </Link>
          </>
        }
      />

      {billingNoticeMessage ? (
        <div className="rounded-[20px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
          {billingNoticeMessage}
        </div>
      ) : null}
      {billingErrorMessage ? (
        <div className="rounded-[20px] bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          {billingErrorMessage}
        </div>
      ) : null}

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
                {timezonePending ? t.common.loading : t.settings.saveTimezone}
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
            {timezoneError ? <div className="mt-4 rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">{timezoneError}</div> : null}
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
                <div className="mt-2 text-sm font-semibold text-white">{currentPlan.renewalDate ? formatDate(currentPlan.renewalDate, locale) : "—"}</div>
              </div>
              <div className="rounded-[18px] bg-white/10 px-4 py-3 ring-1 ring-white/12">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-300">{t.settings.paymentMethod}</div>
                <div className="mt-2 text-sm font-semibold text-white">{currentPlan.paymentMethod || "—"}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={pricingPageHref}>
              <Button variant="secondary">{t.settings.managePlan}</Button>
            </Link>
            {canUpgradeToPlus ? (
              <Link href={upgradeToPlusHref}>
                <Button>{locale === "zh-Hant" ? "Upgrade to Plus" : locale === "zh-Hans" ? "Upgrade to Plus" : "Upgrade to Plus"}</Button>
              </Link>
            ) : null}
            {canDowngradeToStarter ? (
              <Button variant="secondary" onClick={() => setShowDowngradeModal(true)}>
                {locale === "zh-Hant" ? "降級成 Starter" : locale === "zh-Hans" ? "降级成 Starter" : "Downgrade to Starter"}
              </Button>
            ) : null}
            {canManageBilling ? (
              <Link href={manageBillingHref}>
                <Button>{t.settings.manageBilling}</Button>
              </Link>
            ) : null}
            {canUpgradeFromFree ? (
              <Link href={pricingPageHref}>
                <Button>{t.settings.upgradeNow}</Button>
              </Link>
            ) : null}
          </div>

          {downgradeSuccess ? (
            <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{downgradeSuccess}</div>
          ) : null}
          {downgradeError ? (
            <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">{downgradeError}</div>
          ) : null}

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

        <ActivationCodeRedeemCard locale={locale} isAuthenticated returnPath={withLocale(locale, "/settings")} />
      </div>

      <div className="grid gap-6">
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

        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <GoogleMark />
                {t.settings.signInMethodsTitle}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t.settings.signInMethodsBody}</p>
            </div>
            <Badge tone={googleConnected ? "success" : "default"}>
              {googleConnected ? t.settings.googleLinkedStatus : t.settings.googleNotLinkedStatus}
            </Badge>
          </div>

          <div className="rounded-[24px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.emailProviderLabel}</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{currentEmail}</div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{t.settings.emailProviderHint}</p>
          </div>

          <div className="rounded-[24px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{t.settings.googleProviderLabel}</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Google</div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {googleConnected ? t.settings.googleLinkedHint : t.settings.googleConnectHint}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  variant="secondary"
                  onClick={handleGoogleConnect}
                  disabled={googleConnected || googleLinkPending || googleUnlinkPending || authProvidersPending}
                  className="whitespace-nowrap rounded-[14px] px-4 py-2"
                >
                  {googleConnected
                    ? t.settings.googleAlreadyLinkedAction
                    : googleLinkPending || authProvidersPending
                      ? t.common.loading
                      : t.settings.connectGoogleAction}
                </Button>
                {googleConnected ? (
                  <Button
                    variant="ghost"
                    onClick={handleGoogleDisconnect}
                    disabled={!canUnlinkGoogle || googleUnlinkPending || googleLinkPending || authProvidersPending}
                    className="whitespace-nowrap rounded-[14px] px-4 py-2 text-slate-600"
                  >
                    {googleUnlinkPending ? t.common.loading : t.settings.disconnectGoogleAction}
                  </Button>
                ) : null}
              </div>
            </div>
            {googleConnected && !canUnlinkGoogle ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">{t.settings.googleDisconnectHint}</p>
            ) : null}
          </div>

          {authProviderSuccess ? (
            <div className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{authProviderSuccess}</div>
          ) : null}
          {authProviderError ? (
            <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">{authProviderError}</div>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ShieldCheck size={18} className="text-emerald-600" />
              {locale === "zh-Hant" ? "會員狀態變更" : locale === "zh-Hans" ? "会员状态变更" : "Membership changes"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {locale === "zh-Hant"
                ? "記錄激活碼生效、升級與降級，以及變更前後的方案與有效期。"
                : locale === "zh-Hans"
                  ? "记录激活码生效、升级与降级，以及变更前后的方案与有效期。"
                  : "See activation-code changes, upgrades, and downgrades with the plan and end date before and after each change."}
            </p>
          </div>
          <Badge tone="default">{membershipChanges.length}</Badge>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white/90">
          <div className="hidden grid-cols-[0.9fr_1fr_1fr_0.9fr] gap-3 border-b border-slate-100 px-5 py-3 text-xs uppercase tracking-[0.14em] text-slate-400 md:grid">
            <div>{locale === "zh-Hant" ? "操作" : locale === "zh-Hans" ? "操作" : "Action"}</div>
            <div>{locale === "zh-Hant" ? "上一個方案" : locale === "zh-Hans" ? "上一个方案" : "Previous"}</div>
            <div>{locale === "zh-Hant" ? "目前方案" : locale === "zh-Hans" ? "目前方案" : "Current"}</div>
            <div>{locale === "zh-Hant" ? "時間" : locale === "zh-Hans" ? "时间" : "Time"}</div>
          </div>

          {membershipChanges.length ? (
            membershipChanges.map((change) => (
              <div
                key={change.id}
                className="grid gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-700 md:grid-cols-[0.9fr_1fr_1fr_0.9fr] md:items-center"
              >
                <div>
                  <Badge tone={change.action === "downgrade" ? "info" : change.action === "upgrade" ? "success" : "default"}>
                    {getMembershipChangeActionLabel(change.action, locale)}
                  </Badge>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{change.previousPlanCode ? getPlanLabel(change.previousPlanCode) : "—"}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {change.previousPeriodEnd ? formatDate(change.previousPeriodEnd, locale) : "—"}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{getPlanLabel(change.currentPlanCode)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {change.currentPeriodEnd ? formatDate(change.currentPeriodEnd, locale) : "—"}
                  </div>
                </div>
                <div className="text-slate-500">{formatDate(change.createdAt, locale)}</div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-slate-500">
              {locale === "zh-Hant"
                ? "目前還沒有會員變更紀錄。"
                : locale === "zh-Hans"
                  ? "当前还没有会员变更记录。"
                  : "No membership changes have been recorded yet."}
            </div>
          )}
        </div>
      </Card>

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

          {billingHistory.length ? billingHistory.map((invoice) => {
            const statusTone: "default" | "info" | "success" | "danger" = invoice.status === "paid" ? "success" : "info";
            const statusLabel = invoice.status === "paid" ? t.settings.paid : t.settings.refunded;

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
          }) : (
            <div className="px-5 py-8 text-sm text-slate-500">{t.settings.billingHistoryEmpty}</div>
          )}
        </div>
      </Card>

      <SecurityModal
        open={showDowngradeModal}
        title={locale === "zh-Hant" ? "降級成 Starter" : locale === "zh-Hans" ? "降级成 Starter" : "Downgrade to Starter"}
        description={
          locale === "zh-Hant"
            ? "降級後會立刻改用 Starter 權益，並依照目前剩餘價值重新換算有效期。此操作不退款。"
            : locale === "zh-Hans"
              ? "降级后会立刻改用 Starter 权益，并按照当前剩余价值重新换算有效期。此操作不退款。"
              : "The workspace will switch to Starter immediately. We will recalculate the access end date from the remaining value, and this change does not issue a refund."
        }
        onClose={() => {
          if (!downgradePending) {
            setShowDowngradeModal(false);
          }
        }}
      >
        <div className="space-y-4">
          <div className="rounded-[18px] bg-[rgba(243,247,255,0.86)] px-4 py-3 text-sm leading-6 text-slate-600 ring-1 ring-[rgba(190,206,226,0.46)]">
            {locale === "zh-Hant"
              ? "管理訂閱入口仍會保留在旁邊；如果你後續需要處理外部帳單，也可以再到訂閱中心查看。"
              : locale === "zh-Hans"
                ? "管理订阅入口仍会保留在旁边；如果你后续需要处理外部账单，也可以再到订阅中心查看。"
                : "The billing portal entry stays available beside this action if you still need to review the external billing record later."}
          </div>

          {downgradeError ? (
            <div className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">{downgradeError}</div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100/80 pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowDowngradeModal(false)} disabled={downgradePending}>
              {t.settings.cancelAction}
            </Button>
            <Button type="button" onClick={() => void handlePlanDowngrade()} disabled={downgradePending}>
              {downgradePending
                ? t.common.loading
                : locale === "zh-Hant"
                  ? "確認降級"
                  : locale === "zh-Hans"
                    ? "确认降级"
                    : "Confirm downgrade"}
            </Button>
          </div>
        </div>
      </SecurityModal>

      <SecurityModal open={activeModal === "email"} title={t.settings.emailModalTitle} description={t.settings.emailModalBody} onClose={closeActiveModal}>
        <form className="space-y-4" onSubmit={handleEmailSubmit}>
          <Input label={t.settings.currentEmail} value={currentEmail} disabled className="h-12 rounded-[16px]" />

          <div className="rounded-[18px] border border-[rgba(190,206,226,0.55)] bg-white/92 p-4">
            <Input
              label={t.settings.currentPassword}
              labelBadge={t.common.required}
              type="password"
              value={emailForm.currentPassword}
              onChange={(event) => {
                const nextPassword = event.target.value;
                setEmailForm((currentForm) => ({
                  ...currentForm,
                  currentPassword: nextPassword,
                  ...(emailPasswordVerified
                    ? {
                        newEmail: "",
                        verificationCode: "",
                      }
                    : {}),
                }));
                setEmailPasswordVerified(false);
                setEmailPasswordSuccess("");
                setEmailCodeSent(false);
                setEmailErrors((currentErrors) => ({
                  ...currentErrors,
                  currentPassword: undefined,
                  newEmail: undefined,
                  verificationCode: undefined,
                }));
              }}
              error={emailErrors.currentPassword}
              hint={!emailPasswordVerified ? t.settings.emailPasswordStepHint : undefined}
              className="h-12 rounded-[16px]"
            />

            {emailPasswordSuccess ? (
              <div className="mt-3 rounded-[16px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
                {emailPasswordSuccess}
              </div>
            ) : null}

            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleEmailPasswordVerify}
                disabled={emailPasswordPending}
                className="h-11 rounded-[16px] px-4"
              >
                {emailPasswordPending ? t.common.loading : t.settings.verifyCurrentPasswordAction}
              </Button>
            </div>
          </div>

          {canEditNewEmail ? (
            <div className="space-y-4 rounded-[18px] border border-[rgba(190,206,226,0.55)] bg-white/92 p-4">
              <Input
                label={t.settings.newEmail}
                labelBadge={t.common.required}
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

              <div className="rounded-[18px] border border-[rgba(190,206,226,0.55)] bg-slate-50/70 p-3.5">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_152px] sm:items-end">
                  <label className="block space-y-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span>{t.settings.emailVerificationCode}</span>
                      <span className="text-[12px] font-semibold text-rose-500">{t.common.required}</span>
                    </span>
                    <input
                      value={emailForm.verificationCode}
                      onChange={(event) => {
                        setEmailForm((currentForm) => ({ ...currentForm, verificationCode: event.target.value }));
                        setEmailErrors((currentErrors) => ({ ...currentErrors, verificationCode: undefined }));
                      }}
                      className={`h-12 w-full rounded-[16px] border bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
                        emailErrors.verificationCode
                          ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                          : "border-slate-200 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                      }`}
                    />
                    {emailErrors.verificationCode ? <p className="text-sm text-rose-600">{emailErrors.verificationCode}</p> : null}
                    {!emailErrors.verificationCode && emailCodeSent ? <p className="text-sm text-slate-500">{t.settings.verificationCodeSent}</p> : null}
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleEmailCodeSend}
                    disabled={emailCodePending}
                    className="h-12 w-full rounded-[16px] px-4 sm:w-auto"
                  >
                    {emailCodePending ? t.common.loading : emailCodeSent ? t.settings.resendVerificationCode : t.settings.sendVerificationCode}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100/80 pt-4">
            <Button type="button" variant="ghost" onClick={closeActiveModal}>
              {t.settings.cancelAction}
            </Button>
            <Button type="submit" disabled={emailPending || !emailPasswordVerified}>
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

          <div className="rounded-[18px] bg-white/92 p-4 ring-1 ring-[rgba(190,206,226,0.46)]">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_148px] sm:items-end">
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span>{t.settings.passwordVerificationCode}</span>
                  <span className="text-[12px] font-semibold text-rose-500">{t.common.required}</span>
                </span>
                <input
                  value={passwordForm.verificationCode}
                  onChange={(event) => {
                    setPasswordForm((currentForm) => ({ ...currentForm, verificationCode: event.target.value }));
                    setPasswordErrors((currentErrors) => ({ ...currentErrors, verificationCode: undefined }));
                  }}
                  className={`h-12 w-full rounded-[16px] border bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
                    passwordErrors.verificationCode
                      ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-[rgba(18,119,255,0.5)] focus:ring-4 focus:ring-[rgba(18,119,255,0.12)]"
                  }`}
                />
                {passwordErrors.verificationCode ? <p className="text-sm text-rose-600">{passwordErrors.verificationCode}</p> : null}
                {!passwordErrors.verificationCode ? (
                  <p className="text-sm text-slate-500">{passwordCodeSent ? t.settings.verificationCodeSent : t.settings.passwordCodeHint}</p>
                ) : null}
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={handlePasswordCodeSend}
                disabled={passwordCodePending}
                className="h-12 w-full min-w-[108px] rounded-[16px] px-4 whitespace-nowrap sm:w-auto"
              >
                {passwordCodePending ? t.common.loading : passwordCodeSent ? t.settings.resendVerificationCode : t.settings.sendVerificationCode}
              </Button>
            </div>
          </div>

          {canSetNextPassword ? (
            <div className="space-y-3 rounded-[18px] bg-white/92 p-4 ring-1 ring-[rgba(190,206,226,0.46)]">
              <Input
                label={t.settings.newPassword}
                labelBadge={t.common.required}
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
                labelBadge={t.common.required}
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

          <div className="flex items-center justify-end gap-3 border-t border-slate-100/80 pt-4">
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
