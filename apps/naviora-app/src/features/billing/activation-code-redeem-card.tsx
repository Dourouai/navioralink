"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { formatActivationCodeForInput, normalizeActivationCode } from "@/lib/billing/activation-codes";
import {
  ActivationCodeRedeemError,
  previewActivationCodeRedemption,
  redeemActivationCode,
  type ActivationCodeRedemptionPreview,
  type ActivationCodePreviewOption,
} from "@/lib/services";

interface ActivationCodeRedeemCardProps {
  locale: Locale;
  isAuthenticated: boolean;
  returnPath: string;
}

function appendQueryParam(path: string, key: string, value: string) {
  const [pathname, queryString = ""] = path.split("?");
  const params = new URLSearchParams(queryString);
  params.set(key, value);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function replaceBrowserUrl(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(window.history.state, "", path);
}

export function ActivationCodeRedeemCard({
  locale,
  isAuthenticated,
  returnPath,
}: ActivationCodeRedeemCardProps) {
  const t = getMessages(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCode = searchParams?.get("redeemCode") ?? "";
  const redeemStatus = searchParams?.get("activationCodeStatus") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<ActivationCodeRedemptionPreview | null>(null);
  const autoRedeemAttemptedRef = useRef(false);

  const registerWithReturnPath = appendQueryParam(withLocale(locale, "/register"), "next", returnPath);
  const loginWithReturnPath = appendQueryParam(withLocale(locale, "/login"), "next", returnPath);

  useEffect(() => {
    if (!queryCode || code) {
      return;
    }

    setCode(formatActivationCodeForInput(queryCode));
  }, [code, queryCode]);

  useEffect(() => {
    if (redeemStatus === "success") {
      setSuccess(t.activationCode.success);
      setError("");
      return;
    }

    setSuccess("");
  }, [redeemStatus, t.activationCode.success]);

  const handleAutoRedeem = useEffectEvent((nextCode: string) => {
    void handleRedeem(nextCode, { auto: true });
  });

  function getOptionTitle(option: ActivationCodePreviewOption) {
    if (option.strategy === "upgrade_difference") {
      return locale === "zh-Hant" ? "差價升級" : locale === "zh-Hans" ? "差价升级" : "Upgrade with difference";
    }

    if (option.strategy === "start_now") {
      return locale === "zh-Hant" ? "立即生效 Plus" : locale === "zh-Hans" ? "立即生效 Plus" : "Start Plus now";
    }

    if (option.strategy === "queue_after_current") {
      return locale === "zh-Hant" ? "目前方案結束後生效" : locale === "zh-Hans" ? "当前方案结束后生效" : "Start after the current plan";
    }

    return locale === "zh-Hant" ? "立即生效" : locale === "zh-Hans" ? "立即生效" : "Activate now";
  }

  function getOptionBody(option: ActivationCodePreviewOption) {
    const nextLabel = `${option.nextPlanName} · ${option.nextPeriodEnd ? new Date(option.nextPeriodEnd).toLocaleDateString() : "—"}`;

    if (option.strategy === "upgrade_difference") {
      return locale === "zh-Hant"
        ? `把目前剩餘價值一起折算成 ${option.nextPlanName}，新的有效期到 ${nextLabel}。`
        : locale === "zh-Hans"
          ? `把当前剩余价值一起折算成 ${option.nextPlanName}，新的有效期到 ${nextLabel}。`
          : `Convert the remaining value into ${option.nextPlanName} access. The new end date becomes ${nextLabel}.`;
    }

    if (option.strategy === "start_now") {
      return locale === "zh-Hant"
        ? `先立即生效 ${option.nextPlanName}，目前 Starter 會順延到後面。`
        : locale === "zh-Hans"
          ? `先立即生效 ${option.nextPlanName}，当前 Starter 会顺延到后面。`
          : `Start ${option.nextPlanName} right away and move the current Starter time behind it.`;
    }

    if (option.strategy === "queue_after_current") {
      return locale === "zh-Hant"
        ? `保留目前方案不變，這組激活碼會在目前期限結束後接續生效。`
        : locale === "zh-Hans"
          ? `保留当前方案不变，这组激活码会在当前期限结束后接续生效。`
          : `Keep the current plan as-is and queue this activation code after the current end date.`;
    }

    return locale === "zh-Hant"
      ? `這組激活碼會立即生效，新的有效期到 ${nextLabel}。`
      : locale === "zh-Hans"
        ? `这组激活码会立即生效，新的有效期到 ${nextLabel}。`
        : `This activation code takes effect now and runs until ${nextLabel}.`;
  }

  async function applyRedemptionStrategy(codeToRedeem: string, strategy?: ActivationCodeRedemptionPreview["recommendedStrategy"]) {
    setPending(true);

    try {
      await redeemActivationCode({ code: codeToRedeem, strategy });
      setPreview(null);
      const successPath = appendQueryParam(returnPath, "activationCodeStatus", "success");
      router.replace(successPath);
      router.refresh();
    } catch (redeemError) {
      const message =
        redeemError instanceof ActivationCodeRedeemError
          ? redeemError.message
          : redeemError instanceof Error
            ? redeemError.message
            : t.activationCode.genericError;

      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function handleRedeem(rawCode: string, options?: { auto?: boolean }) {
    const normalizedCode = normalizeActivationCode(rawCode);

    if (!normalizedCode) {
      setError(t.activationCode.codeRequired);
      setSuccess("");
      return;
    }

    const formattedCode = formatActivationCodeForInput(normalizedCode);
    setCode(formattedCode);
    setError("");
    setSuccess("");

    if (!isAuthenticated) {
      const nextPath = appendQueryParam(returnPath, "redeemCode", normalizedCode);
      router.push(appendQueryParam(withLocale(locale, "/register"), "next", nextPath));
      return;
    }

    try {
      setPending(true);
      const nextPreview = await previewActivationCodeRedemption({ code: normalizedCode });

      if (nextPreview.requiresChoice) {
        setPreview(nextPreview);
        setPending(false);
        return;
      }

      await applyRedemptionStrategy(normalizedCode, nextPreview.recommendedStrategy);
    } catch (redeemError) {
      const message =
        redeemError instanceof ActivationCodeRedeemError
          ? redeemError.message
          : redeemError instanceof Error
            ? redeemError.message
            : t.activationCode.genericError;

      setError(message);

      if (options?.auto) {
        replaceBrowserUrl(returnPath);
      }
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !queryCode || autoRedeemAttemptedRef.current) {
      return;
    }

    autoRedeemAttemptedRef.current = true;
    handleAutoRedeem(queryCode);
  }, [isAuthenticated, queryCode]);

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Ticket size={18} className="text-violet-600" />
            {t.activationCode.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t.activationCode.body}</p>
        </div>
      </div>

      <div className="rounded-[24px] bg-white/88 p-4 ring-1 ring-[rgba(190,206,226,0.5)]">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">{t.activationCode.inputLabel}</label>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <input
              value={code}
              placeholder={t.activationCode.placeholder}
              onChange={(event) => {
                setCode(formatActivationCodeForInput(event.target.value));
                setError("");
                if (success) {
                  setSuccess("");
                }
              }}
              className={`h-12 w-full rounded-[16px] border bg-white/92 px-4 text-base text-slate-900 uppercase tracking-[0.16em] outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:ring-4 ${
                error
                  ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                  : "border-slate-200 focus:border-[rgba(18,119,255,0.5)] focus:ring-[rgba(18,119,255,0.12)]"
              } ${pending ? "cursor-not-allowed bg-slate-100/95 text-slate-500" : ""}`}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={pending}
            />

            <Button
              className="h-12 min-w-[180px] rounded-[16px] text-base md:self-start"
              disabled={pending}
              onClick={() => void handleRedeem(code)}
            >
              {pending ? t.common.loading : isAuthenticated ? t.activationCode.actionRedeem : t.activationCode.actionContinue}
            </Button>
          </div>

          {error ? (
            <div className="text-sm text-rose-600">{error}</div>
          ) : (
            <div className="space-y-1 text-sm leading-6 text-slate-500">
              <div>{t.activationCode.formatHint}</div>
              <div>{isAuthenticated ? t.activationCode.authenticatedHint : t.activationCode.guestHint}</div>
            </div>
          )}
        </div>

        {success ? <div className="mt-4 rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">{success}</div> : null}

        {!isAuthenticated ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{t.activationCode.loginHint}</span>
            <Link href={loginWithReturnPath} className="font-medium text-sky-700 hover:underline">
              {t.auth.toLogin}
            </Link>
            <span>·</span>
            <Link href={registerWithReturnPath} className="font-medium text-sky-700 hover:underline">
              {t.auth.toRegister}
            </Link>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(15,23,42,0.44)] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[640px] overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96))] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-[rgba(187,203,225,0.55)] sm:p-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">
                {locale === "zh-Hant" ? "選擇激活方式" : locale === "zh-Hans" ? "选择激活方式" : "Choose how to apply this code"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {locale === "zh-Hant"
                  ? `目前方案是 ${preview.currentPlanName ?? "Free"}，這組激活碼對應 ${preview.targetPlanName}。`
                  : locale === "zh-Hans"
                    ? `当前方案是 ${preview.currentPlanName ?? "Free"}，这组激活码对应 ${preview.targetPlanName}。`
                    : `The current plan is ${preview.currentPlanName ?? "Free"}, and this activation code unlocks ${preview.targetPlanName}.`}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {preview.options.map((option) => (
                <button
                  key={option.strategy}
                  type="button"
                  onClick={() => void applyRedemptionStrategy(normalizeActivationCode(code), option.strategy)}
                  disabled={pending}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    option.strategy === preview.recommendedStrategy
                      ? "border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(248,250,255,0.98))] ring-2 ring-[rgba(56,189,248,0.14)]"
                      : "border-slate-200 bg-white/90 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-slate-900">{getOptionTitle(option)}</div>
                    {option.strategy === preview.recommendedStrategy ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        {locale === "zh-Hant" ? "建議" : locale === "zh-Hans" ? "建议" : "Recommended"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">{getOptionBody(option)}</div>
                  {option.queuedPlanName && option.queuedPeriodEnd ? (
                    <div className="mt-3 rounded-[16px] bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
                      {locale === "zh-Hant"
                        ? `順延：${option.queuedPlanName} 到 ${new Date(option.queuedPeriodEnd).toLocaleDateString()}`
                        : locale === "zh-Hans"
                          ? `顺延：${option.queuedPlanName} 到 ${new Date(option.queuedPeriodEnd).toLocaleDateString()}`
                          : `Queued: ${option.queuedPlanName} until ${new Date(option.queuedPeriodEnd).toLocaleDateString()}`}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100/80 pt-4">
              <Button type="button" variant="ghost" onClick={() => setPreview(null)} disabled={pending}>
                {locale === "zh-Hant" ? "取消" : locale === "zh-Hans" ? "取消" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
