"use client";

import type { Locale } from "@/i18n/config";
import type { TencentCaptchaChallengePayload } from "@/types/tencent-captcha";

interface TencentCaptchaResultPayload {
  ret?: number;
  ticket?: string;
  randstr?: string;
  errorCode?: number | string;
  errorMessage?: string;
}

interface TencentCaptchaInstance {
  show: () => void;
  destroy?: () => void;
}

// Correct signature per official docs: new TencentCaptcha(DOM, CaptchaAppId, callback, options)
interface TencentCaptchaConstructor {
  new (
    dom: Element,
    appId: string,
    callback: (payload: TencentCaptchaResultPayload) => void,
    options?: Record<string, unknown>,
  ): TencentCaptchaInstance;
}

declare global {
  interface Window {
    TencentCaptcha?: TencentCaptchaConstructor;
  }
}

function getTencentCaptchaAppId() {
  return process.env.NEXT_PUBLIC_TENCENT_CAPTCHA_APP_ID?.trim() || null;
}

function getErrorMessage(locale: Locale, code: "load_failed" | "cancelled" | "failed") {
  if (locale === "zh-Hant") {
    if (code === "load_failed") return "驗證服務暫時不可用，請稍後再試。";
    if (code === "cancelled") return "你已取消驗證，請重新完成驗證後再繼續。";
    return "驗證沒有通過，請再試一次。";
  }
  if (locale === "zh-Hans") {
    if (code === "load_failed") return "验证服务暂时不可用，请稍后再试。";
    if (code === "cancelled") return "你已取消验证，请重新完成验证后再继续。";
    return "验证没有通过，请再试一次。";
  }
  if (code === "load_failed") return "Verification is temporarily unavailable. Please try again.";
  if (code === "cancelled") return "Verification was cancelled. Please complete it to continue.";
  return "Verification did not pass. Please try again.";
}

/** Wait for the script pre-loaded by layout.tsx to register window.TencentCaptcha */
function waitForCaptchaGlobal(timeoutMs = 10000): Promise<TencentCaptchaConstructor> {
  return new Promise((resolve, reject) => {
    if (window.TencentCaptcha) {
      resolve(window.TencentCaptcha);
      return;
    }
    const deadline = Date.now() + timeoutMs;
    const interval = setInterval(() => {
      if (window.TencentCaptcha) {
        clearInterval(interval);
        resolve(window.TencentCaptcha);
      } else if (Date.now() >= deadline) {
        clearInterval(interval);
        reject(new Error("[captcha] window.TencentCaptcha not available after timeout"));
      }
    }, 100);
  });
}

export function isTencentCaptchaEnabledInBrowser() {
  return Boolean(getTencentCaptchaAppId());
}

export async function runTencentCaptchaChallenge(params: {
  locale: Locale;
  action: "login" | "register_send_code";
}): Promise<TencentCaptchaChallengePayload | null> {
  if (typeof window === "undefined") return null;

  const appId = getTencentCaptchaAppId();
  if (!appId) return null;

  let Captcha: TencentCaptchaConstructor;
  try {
    Captcha = await waitForCaptchaGlobal();
  } catch (err) {
    console.error("[captcha] Script not ready:", err);
    throw new Error(getErrorMessage(params.locale, "load_failed"));
  }

  return new Promise<TencentCaptchaChallengePayload>((resolve, reject) => {
    let resolved = false;
    let instance: TencentCaptchaInstance | null = null;

    // Create a temporary container element as required by the SDK
    const container = document.createElement("div");
    document.body.appendChild(container);

    const cleanup = () => {
      try { instance?.destroy?.(); } catch { /* ignore */ }
      try { document.body.removeChild(container); } catch { /* ignore */ }
    };

    const fail = (code: "cancelled" | "failed") => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new Error(getErrorMessage(params.locale, code)));
    };

    try {
      instance = new Captcha(
        container,
        appId,
        (payload) => {
          if (resolved) return;
          if (payload.ret === 0 && payload.ticket?.trim() && payload.randstr?.trim()) {
            resolved = true;
            cleanup();
            resolve({ ticket: payload.ticket.trim(), randstr: payload.randstr.trim() });
            return;
          }
          if (payload.ret === 2) { fail("cancelled"); return; }
          console.error("[captcha] Unexpected payload:", payload);
          fail("failed");
        },
        { bizState: params.action },
      );
      instance.show();
    } catch (err) {
      console.error("[captcha] Constructor or show() failed:", err);
      cleanup();
      fail("failed");
    }
  });
}
