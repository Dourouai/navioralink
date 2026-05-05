import type { NextRequest } from "next/server";
import { after, NextResponse } from "next/server";

import { normalizeEntryPathPrefix } from "@/lib/entry-url";
import {
  buildPublicRequestContext,
  getPlanConstraintResponseMessage,
  isPlanConstraintError,
  lookupPublicEntryAvailabilityBySlug,
  recordEntryVisit,
  resolvePublicEntryBySlug,
} from "@/lib/supabase/entry-routing";
import { resolveLegacyGoVCardRedirectBySlug } from "@/lib/supabase/public-vcard-server";
import {
  createEntryPasswordAccessCookieValue,
  getEntryPasswordAccessCookieName,
  hasEntryPasswordAccessCookie,
  verifyEntryPassword,
} from "@/lib/entry-password";

export const runtime = "nodejs";

type PublicStateCopy = {
  locale: string;
  badge: string;
  title: string;
  description: string;
  supporting: string;
  primaryLabel: string;
  primaryHref: string;
};

type PasswordGateCopy = {
  locale: string;
  badge: string;
  title: string;
  description: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitLabel: string;
  supporting: string;
  error: string | null;
};

type OpenAppConfirmCopy = {
  locale: string;
  badge: string;
  title: string;
  description: string;
  supporting: string;
  copyLabel: string;
  buttonLabel: string;
  initialStatus: string;
  pendingStatus: string;
  copyingStatus: string;
  successStatus: string;
  fallbackStatus: string;
  autoStartingStatus: string;
  autoBlockedStatus: string;
  autoCopyEnabled: boolean;
  targetUrl: string;
  copyText: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getNormalizedLocale(locale: string) {
  if (locale === "zh-Hans" || locale === "zh-Hant") {
    return locale;
  }

  return "en";
}

function getAppHref(locale: string, path = "") {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://naviora.link";
  const normalizedLocale = getNormalizedLocale(locale);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedLocale === "en") {
    return new URL(normalizedPath, baseUrl).toString();
  }

  return new URL(`/${normalizedLocale}${normalizedPath}`, baseUrl).toString();
}

function getEntryNotFoundCopy(locale: string): PublicStateCopy {
  if (locale === "zh-Hant") {
    return {
      locale,
      badge: "404 · 找不到這個入口",
      title: "這個入口可能還沒發布",
      description: "連結可能已失效、被歸檔，或輸入的分享網址不正確。",
      supporting: "你可以回到 Naviora 首頁，或聯絡分享這個入口的人重新確認網址。",
      primaryLabel: "回到 Naviora",
      primaryHref: getAppHref(locale),
    };
  }

  if (locale === "zh-Hans") {
    return {
      locale,
      badge: "404 · 找不到这个入口",
      title: "这个入口可能还没发布",
      description: "链接可能已失效、被归档，或输入的分享网址不正确。",
      supporting: "你可以回到 Naviora 首页，或联系分享这个入口的人重新确认网址。",
      primaryLabel: "回到 Naviora",
      primaryHref: getAppHref(locale),
    };
  }

  return {
    locale,
    badge: "404 · Entry not found",
    title: "This entry may not be live yet",
    description: "The link may have expired, been archived, or the shared URL may be incorrect.",
    supporting: "You can head back to Naviora or ask the person who shared it to confirm the link.",
    primaryLabel: "Back to Naviora",
    primaryHref: getAppHref(locale),
  };
}

function getEntryArchivedCopy(locale: string): PublicStateCopy {
  if (locale === "zh-Hant") {
    return {
      locale,
      badge: "404 · 此連結已歸檔",
      title: "此連結已歸檔",
      description: "這個公開入口已被建立者歸檔，目前不再對外開放。",
      supporting: "如果你仍需要查看內容，請聯絡分享這個入口的人重新啟用，或提供新的可用連結。",
      primaryLabel: "回到 Naviora",
      primaryHref: getAppHref(locale),
    };
  }

  if (locale === "zh-Hans") {
    return {
      locale,
      badge: "404 · 此链接已归档",
      title: "此链接已归档",
      description: "这个公开入口已被创建者归档，目前不再对外开放。",
      supporting: "如果你仍需要查看内容，请联系分享这个入口的人重新启用，或提供新的可用链接。",
      primaryLabel: "回到 Naviora",
      primaryHref: getAppHref(locale),
    };
  }

  return {
    locale,
    badge: "404 · Link archived",
    title: "This link has been archived",
    description: "This public entry has been archived by its owner and is no longer available.",
    supporting: "If you still need it, ask the person who shared it to reactivate the link or send a new one.",
    primaryLabel: "Back to Naviora",
    primaryHref: getAppHref(locale),
  };
}

function getPlanConstraintCopy(locale: string, description: string): PublicStateCopy {
  if (locale === "zh-Hant") {
    return {
      locale,
      badge: "已達方案訪問額度",
      title: "這個入口本月流量已用完",
      description,
      supporting: "升級方案後可立即恢復訪問，或聯絡入口建立者確認目前的套餐狀態。",
      primaryLabel: "升級方案",
      primaryHref: getAppHref(locale, "/pricing"),
    };
  }

  if (locale === "zh-Hans") {
    return {
      locale,
      badge: "已达套餐访问额度",
      title: "这个入口本月流量已用完",
      description,
      supporting: "升级套餐后可立即恢复访问，或联系入口创建者确认当前的套餐状态。",
      primaryLabel: "升级套餐",
      primaryHref: getAppHref(locale, "/pricing"),
    };
  }

  return {
    locale,
    badge: "Plan limit reached",
    title: "This entry has used up its monthly traffic",
    description,
    supporting: "Upgrade the workspace plan to restore traffic immediately, or contact the entry owner to confirm the current subscription.",
    primaryLabel: "Upgrade plan",
    primaryHref: getAppHref(locale, "/pricing"),
  };
}

function buildLanguageSwitcherHtml(request: NextRequest, activeLocale: string) {
  const currentUrl = request.nextUrl.clone();
  const locales = [
    { value: "en", label: "EN" },
    { value: "zh-Hans", label: "简体" },
    { value: "zh-Hant", label: "繁體" },
  ] as const;
  const ariaLabel =
    activeLocale === "zh-Hant"
      ? "切換語言"
      : activeLocale === "zh-Hans"
        ? "切换语言"
        : "Change language";

  const options = locales
    .map(({ value, label }) => {
      const href = currentUrl.clone();
      href.searchParams.delete("locale");

      if (value === "en") {
        href.searchParams.delete("lang");
      } else {
        href.searchParams.set("lang", value);
      }

      const selected = activeLocale === value ? ' selected="selected"' : "";
      return `<option value="${escapeHtml(href.toString())}" data-locale="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");

  return `<label class="language-switcher" aria-label="${escapeHtml(ariaLabel)}">
    <span class="language-icon" aria-hidden="true"></span>
    <select class="language-select" onchange="if (this.value) { const option = this.options[this.selectedIndex]; if (option && option.dataset.locale) { document.cookie = 'naviora_locale=' + encodeURIComponent(option.dataset.locale) + '; Path=/; Max-Age=31536000; SameSite=Lax'; } window.location.href = this.value; }">
      ${options}
    </select>
    <span class="language-chevron" aria-hidden="true"></span>
  </label>`;
}

function buildStatePageHtml(copy: PublicStateCopy, request: NextRequest) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(getNormalizedLocale(copy.locale))}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.title)} · Naviora</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(94, 196, 247, 0.16), transparent 34%),
          radial-gradient(circle at top right, rgba(141, 121, 255, 0.14), transparent 28%),
          linear-gradient(180deg, #f7fbff 0%, #f3f7ff 100%);
        color: #0f172a;
      }
      main {
        min-height: 100vh;
        display: flex;
        padding: 24px;
      }
      .shell {
        width: min(720px, 100%);
        min-height: calc(100vh - 48px);
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .shell-body {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: center;
      }
      .card {
        width: 100%;
        border-radius: 32px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.86);
        box-shadow: 0 24px 48px rgba(31, 55, 92, 0.09);
        padding: 32px;
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(124, 152, 255, 0.12), transparent 26%),
          radial-gradient(circle at bottom left, rgba(84, 200, 214, 0.1), transparent 28%);
        pointer-events: none;
      }
      .content {
        position: relative;
        z-index: 1;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(199, 214, 235, 0.7);
        color: #0369a1;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      h1 {
        margin: 22px 0 14px;
        font-size: clamp(34px, 5vw, 54px);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        color: #52627d;
        font-size: 17px;
        line-height: 1.8;
      }
      .supporting {
        margin-top: 14px;
        color: #6f819f;
        font-size: 15px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 28px;
      }
      .language-switcher {
        position: relative;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(199, 214, 235, 0.78);
        background: rgba(255, 255, 255, 0.92);
        padding: 0 40px 0 14px;
        min-height: 44px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      }
      .language-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-right: 8px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 6 6'/%3E%3Cpath d='m4 14 6-6 2-3'/%3E%3Cpath d='M2 5h12'/%3E%3Cpath d='M7 2h1'/%3E%3Cpath d='m22 22-5-10-5 10'/%3E%3Cpath d='M14 18h6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 16px;
      }
      .language-select {
        min-height: 44px;
        border: 0;
        background: transparent;
        color: #1f2f46;
        font-size: 14px;
        font-weight: 600;
        padding: 0;
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      .language-chevron {
        position: absolute;
        right: 14px;
        top: 50%;
        width: 14px;
        height: 14px;
        transform: translateY(-50%);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2393a4b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 14px;
        pointer-events: none;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 20px;
        border-radius: 16px;
        text-decoration: none;
        font-weight: 700;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }
      .button:hover {
        transform: translateY(-1px);
      }
      .button-primary {
        color: white;
        background: linear-gradient(135deg, #28b5ef 0%, #7d7bf6 100%);
        box-shadow: 0 16px 32px rgba(90, 130, 255, 0.22);
      }
      .footer {
        text-align: center;
        color: #8aa0bf;
        font-size: 12px;
        font-weight: 600;
      }
      .page-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-top: 18px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <div class="shell-body">
          <section class="card">
            <div class="content">
              <div class="badge">${escapeHtml(copy.badge)}</div>
              <h1>${escapeHtml(copy.title)}</h1>
              <p>${escapeHtml(copy.description)}</p>
              <p class="supporting">${escapeHtml(copy.supporting)}</p>
              <div class="actions">
                <a class="button button-primary" href="${escapeHtml(copy.primaryHref)}">${escapeHtml(copy.primaryLabel)}</a>
              </div>
            </div>
          </section>
        </div>
        <div class="page-footer">
          ${buildLanguageSwitcherHtml(request, copy.locale)}
          <div class="footer">Powered by Naviora</div>
        </div>
      </div>
    </main>
  </body>
</html>`;
}

function getPasswordGateCopy(locale: string, isPreviewRequest: boolean, error?: string | null): PasswordGateCopy {
  if (locale === "zh-Hant") {
    return {
      locale,
      badge: isPreviewRequest ? "Preview 受密碼保護" : "此入口受密碼保護",
      title: "請先輸入訪問密碼",
      description: isPreviewRequest ? "這個草稿預覽已開啟密碼保護，輸入正確密碼後才能繼續預覽。" : "這個入口已開啟密碼保護，輸入正確密碼後才能繼續瀏覽。",
      passwordLabel: "訪問密碼",
      passwordPlaceholder: "輸入密碼",
      submitLabel: "繼續",
      supporting: "密碼由入口建立者提供；若你沒有密碼，請聯絡分享這個入口的人。",
      error: error ?? null,
    };
  }

  if (locale === "zh-Hans") {
    return {
      locale,
      badge: isPreviewRequest ? "Preview 已受密码保护" : "此入口已受密码保护",
      title: "请先输入访问密码",
      description: isPreviewRequest ? "这个草稿预览已开启密码保护，输入正确密码后才能继续预览。" : "这个入口已开启密码保护，输入正确密码后才能继续浏览。",
      passwordLabel: "访问密码",
      passwordPlaceholder: "输入密码",
      submitLabel: "继续",
      supporting: "密码由入口创建者提供；如果你没有密码，请联系分享这个入口的人。",
      error: error ?? null,
    };
  }

  return {
    locale,
    badge: isPreviewRequest ? "Preview protected" : "Password protected entry",
    title: "Enter the access password",
    description: isPreviewRequest
      ? "This draft preview is protected. Enter the correct password before continuing."
      : "This entry is protected. Enter the correct password before continuing.",
    passwordLabel: "Access password",
    passwordPlaceholder: "Enter password",
    submitLabel: "Continue",
    supporting: "The password is provided by the entry owner. If you do not have it, contact the person who shared this link.",
    error: error ?? null,
  };
}

function getOpenAppDisplayName(locale: string, preset?: string | null, appName?: string | null) {
  const trimmedAppName = appName?.trim();

  if (preset !== "custom") {
    return locale === "en" ? "WeChat" : "微信";
  }

  if (trimmedAppName) {
    return trimmedAppName;
  }

  return locale === "en" ? "the app" : "App";
}

function getOpenAppConfirmCopy(
  locale: string,
  targetUrl: string,
  copyText: string,
  preset?: string | null,
  appName?: string | null,
  autoCopyEnabled = false,
): OpenAppConfirmCopy {
  const isWeChat = preset !== "custom";
  const displayName = getOpenAppDisplayName(locale, preset, appName);

  if (locale === "zh-Hant") {
    return {
      locale,
      badge: `確認後前往${displayName}`,
      title: `前往${displayName}`,
      description: `點一下按鈕後，會先複製下面的內容，再跳轉到${displayName}。`,
      supporting: "",
      copyLabel: "將複製以下內容",
      buttonLabel: `前往${displayName}`,
      initialStatus: autoCopyEnabled ? "正在嘗試自動複製並開啟目標..." : "準備就緒，點一下即可繼續。",
      pendingStatus: "準備就緒，點一下即可繼續。",
      copyingStatus: "正在複製內容並開啟目標...",
      successStatus: "已複製內容，正在為你開啟目標...",
      fallbackStatus: "未能確認是否複製成功，仍會繼續開啟目標。",
      autoStartingStatus: "正在嘗試自動複製並開啟目標...",
      autoBlockedStatus: "瀏覽器未允許自動複製，請點一下按鈕繼續。",
      autoCopyEnabled,
      targetUrl,
      copyText,
    };
  }

  if (locale === "zh-Hans") {
    return {
      locale,
      badge: `确认后前往${displayName}`,
      title: `前往${displayName}`,
      description: `点一下按钮后，会先复制下面的内容，再跳转到${displayName}。`,
      supporting: "",
      copyLabel: "将复制以下内容",
      buttonLabel: `前往${displayName}`,
      initialStatus: autoCopyEnabled ? "正在尝试自动复制并打开目标..." : "已准备好，点击按钮继续。",
      pendingStatus: "已准备好，点击按钮继续。",
      copyingStatus: "正在复制内容并打开目标...",
      successStatus: "内容已复制，正在为你打开目标...",
      fallbackStatus: "未能确认是否复制成功，仍会继续打开目标。",
      autoStartingStatus: "正在尝试自动复制并打开目标...",
      autoBlockedStatus: "浏览器未允许自动复制，请点击按钮继续。",
      autoCopyEnabled,
      targetUrl,
      copyText,
    };
  }

  return {
    locale,
    badge: `Confirm to continue to ${displayName}`,
    title: `Continue to ${displayName}`,
    description: `Tap the button to copy the text below, then continue to ${displayName}.`,
    supporting: "",
    copyLabel: "Text to copy",
    buttonLabel: `Continue to ${displayName}`,
    initialStatus: autoCopyEnabled ? "Trying to copy the text and open the destination automatically..." : "Ready when you are.",
    pendingStatus: "Ready when you are.",
    copyingStatus: "Copying text and opening the destination...",
    successStatus: "Text copied. Opening the destination...",
    fallbackStatus: "Could not confirm the copy result, but the destination will still open.",
    autoStartingStatus: "Trying to copy the text and open the destination automatically...",
    autoBlockedStatus: "Automatic copy was blocked by the browser. Tap the button to continue.",
    autoCopyEnabled,
    targetUrl,
    copyText,
  };
}

function buildPasswordGateHtml(copy: PasswordGateCopy, request: NextRequest) {
  const actionHref = request.nextUrl.toString();

  return `<!DOCTYPE html>
<html lang="${escapeHtml(getNormalizedLocale(copy.locale))}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.title)} · Naviora</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(94, 196, 247, 0.16), transparent 34%),
          radial-gradient(circle at top right, rgba(141, 121, 255, 0.14), transparent 28%),
          linear-gradient(180deg, #f7fbff 0%, #f3f7ff 100%);
        color: #0f172a;
      }
      main {
        min-height: 100vh;
        display: flex;
        padding: 24px;
      }
      .shell {
        width: min(720px, 100%);
        min-height: calc(100vh - 48px);
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .shell-body {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: center;
      }
      .card {
        width: 100%;
        border-radius: 32px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.86);
        box-shadow: 0 24px 48px rgba(31, 55, 92, 0.09);
        padding: 32px;
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(124, 152, 255, 0.12), transparent 26%),
          radial-gradient(circle at bottom left, rgba(84, 200, 214, 0.1), transparent 28%);
        pointer-events: none;
      }
      .content {
        position: relative;
        z-index: 1;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(199, 214, 235, 0.7);
        color: #0369a1;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      h1 {
        margin: 22px 0 14px;
        font-size: clamp(34px, 5vw, 54px);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        color: #52627d;
        font-size: 17px;
        line-height: 1.8;
      }
      .supporting {
        margin-top: 14px;
        color: #6f819f;
        font-size: 15px;
      }
      form {
        margin-top: 28px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .field label {
        font-size: 14px;
        font-weight: 700;
        color: #1f2f46;
      }
      .field input {
        width: 100%;
        min-height: 52px;
        border-radius: 18px;
        border: 1px solid rgba(190, 206, 226, 0.8);
        background: rgba(255, 255, 255, 0.95);
        padding: 0 16px;
        font-size: 16px;
        color: #0f172a;
        outline: none;
      }
      .field input:focus {
        border-color: rgba(56, 189, 248, 0.8);
        box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.12);
      }
      .error {
        margin-top: 12px;
        border-radius: 18px;
        border: 1px solid rgba(251, 113, 133, 0.18);
        background: rgba(255, 241, 242, 0.9);
        padding: 12px 14px;
        color: #be123c;
        font-size: 14px;
        line-height: 1.6;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 22px;
      }
      .language-switcher {
        position: relative;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(199, 214, 235, 0.78);
        background: rgba(255, 255, 255, 0.92);
        padding: 0 40px 0 14px;
        min-height: 44px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      }
      .language-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-right: 8px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 6 6'/%3E%3Cpath d='m4 14 6-6 2-3'/%3E%3Cpath d='M2 5h12'/%3E%3Cpath d='M7 2h1'/%3E%3Cpath d='m22 22-5-10-5 10'/%3E%3Cpath d='M14 18h6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 16px;
      }
      .language-select {
        min-height: 44px;
        border: 0;
        background: transparent;
        color: #1f2f46;
        font-size: 14px;
        font-weight: 600;
        padding: 0;
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      .language-chevron {
        position: absolute;
        right: 14px;
        top: 50%;
        width: 14px;
        height: 14px;
        transform: translateY(-50%);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2393a4b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 14px;
        pointer-events: none;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 20px;
        border-radius: 16px;
        border: 0;
        text-decoration: none;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }
      .button:hover {
        transform: translateY(-1px);
      }
      .button-primary {
        color: white;
        background: linear-gradient(135deg, #28b5ef 0%, #7d7bf6 100%);
        box-shadow: 0 16px 32px rgba(90, 130, 255, 0.22);
      }
      .footer {
        text-align: center;
        color: #8aa0bf;
        font-size: 12px;
        font-weight: 600;
      }
      .page-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-top: 18px;
      }
      @media (max-width: 640px) {
        .card {
          padding: 24px;
          border-radius: 28px;
        }
        .actions {
          flex-direction: column;
        }
        .button {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <div class="shell-body">
          <section class="card">
            <div class="content">
              <div class="badge">${escapeHtml(copy.badge)}</div>
              <h1>${escapeHtml(copy.title)}</h1>
              <p>${escapeHtml(copy.description)}</p>
              ${copy.supporting ? `<p class="supporting">${escapeHtml(copy.supporting)}</p>` : ""}
              <form method="post" action="${escapeHtml(actionHref)}">
                <div class="field">
                  <label for="password">${escapeHtml(copy.passwordLabel)}</label>
                  <input id="password" name="password" type="password" autocomplete="current-password" placeholder="${escapeHtml(copy.passwordPlaceholder)}" />
                </div>
                ${copy.error ? `<div class="error">${escapeHtml(copy.error)}</div>` : ""}
                <div class="actions">
                  <button class="button button-primary" type="submit">${escapeHtml(copy.submitLabel)}</button>
                </div>
              </form>
            </div>
          </section>
        </div>
        <div class="page-footer">
          ${buildLanguageSwitcherHtml(request, copy.locale)}
          <div class="footer">Powered by Naviora</div>
        </div>
      </div>
    </main>
  </body>
</html>`;
}

function buildOpenAppConfirmHtml(copy: OpenAppConfirmCopy, request: NextRequest) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(getNormalizedLocale(copy.locale))}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.title)} · Naviora</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(94, 196, 247, 0.16), transparent 34%),
          radial-gradient(circle at top right, rgba(141, 121, 255, 0.14), transparent 28%),
          linear-gradient(180deg, #f7fbff 0%, #f3f7ff 100%);
        color: #0f172a;
      }
      main {
        min-height: 100vh;
        display: flex;
        padding: 24px;
      }
      .shell {
        width: min(720px, 100%);
        min-height: calc(100vh - 48px);
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .shell-body {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: center;
      }
      .card {
        width: 100%;
        border-radius: 32px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.86);
        box-shadow: 0 24px 48px rgba(31, 55, 92, 0.09);
        padding: 32px;
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(124, 152, 255, 0.12), transparent 26%),
          radial-gradient(circle at bottom left, rgba(84, 200, 214, 0.1), transparent 28%);
        pointer-events: none;
      }
      .content {
        position: relative;
        z-index: 1;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(199, 214, 235, 0.7);
        color: #0369a1;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      h1 {
        margin: 22px 0 14px;
        font-size: clamp(34px, 5vw, 54px);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }
      p {
        margin: 0;
        color: #52627d;
        font-size: 17px;
        line-height: 1.8;
      }
      .supporting {
        margin-top: 14px;
        color: #6f819f;
        font-size: 15px;
      }
      .copy-card {
        margin-top: 24px;
        border-radius: 22px;
        border: 1px solid rgba(190, 206, 226, 0.9);
        background: rgba(248, 251, 255, 0.96);
        padding: 18px 18px 16px;
      }
      .copy-label {
        margin: 0 0 8px;
        color: #1f2f46;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.03em;
      }
      .copy-text {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: #0f172a;
        font-size: 18px;
        line-height: 1.8;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 52px;
        padding: 0 20px;
        border-radius: 18px;
        border: 0;
        text-decoration: none;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, opacity 160ms ease;
      }
      .button:hover {
        transform: translateY(-1px);
      }
      .button:disabled {
        opacity: 0.72;
        cursor: progress;
        transform: none;
      }
      .button-primary {
        color: white;
        background: linear-gradient(135deg, #28b5ef 0%, #7d7bf6 100%);
        box-shadow: 0 16px 32px rgba(90, 130, 255, 0.22);
      }
      .status {
        margin-top: 14px;
        color: #52627d;
        font-size: 14px;
        line-height: 1.7;
      }
      .language-switcher {
        position: relative;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(199, 214, 235, 0.78);
        background: rgba(255, 255, 255, 0.92);
        padding: 0 40px 0 14px;
        min-height: 44px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
      }
      .language-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-right: 8px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 6 6'/%3E%3Cpath d='m4 14 6-6 2-3'/%3E%3Cpath d='M2 5h12'/%3E%3Cpath d='M7 2h1'/%3E%3Cpath d='m22 22-5-10-5 10'/%3E%3Cpath d='M14 18h6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 16px;
      }
      .language-select {
        min-height: 44px;
        border: 0;
        background: transparent;
        color: #1f2f46;
        font-size: 14px;
        font-weight: 600;
        padding: 0;
        outline: none;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
      }
      .language-chevron {
        position: absolute;
        right: 14px;
        top: 50%;
        width: 14px;
        height: 14px;
        transform: translateY(-50%);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2393a4b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 14px;
        pointer-events: none;
      }
      .footer {
        text-align: center;
        color: #8aa0bf;
        font-size: 12px;
        font-weight: 600;
      }
      .page-footer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-top: 18px;
      }
      @media (max-width: 640px) {
        .card {
          padding: 24px;
          border-radius: 28px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <div class="shell-body">
          <section class="card">
            <div class="content">
              <div class="badge">${escapeHtml(copy.badge)}</div>
              <h1>${escapeHtml(copy.title)}</h1>
              <p>${escapeHtml(copy.description)}</p>
              <p class="supporting">${escapeHtml(copy.supporting)}</p>
              <section class="copy-card">
                <div class="copy-label">${escapeHtml(copy.copyLabel)}</div>
                <p class="copy-text">${escapeHtml(copy.copyText)}</p>
              </section>
              <div class="actions">
                <button
                  id="openapp-confirm"
                  class="button button-primary"
                  type="button"
                  data-target-url="${escapeHtml(copy.targetUrl)}"
                  data-copy-text="${escapeHtml(copy.copyText)}"
                  data-auto-copy="${copy.autoCopyEnabled ? "true" : "false"}"
                >${escapeHtml(copy.buttonLabel)}</button>
              </div>
              <p id="openapp-status" class="status">${escapeHtml(copy.initialStatus)}</p>
            </div>
          </section>
        </div>
        <div class="page-footer">
          ${buildLanguageSwitcherHtml(request, copy.locale)}
          <div class="footer">Powered by Naviora</div>
        </div>
      </div>
    </main>
    <script>
      const button = document.getElementById("openapp-confirm");
      const status = document.getElementById("openapp-status");
      const autoCopyEnabled = button?.getAttribute("data-auto-copy") === "true";
      let restoreTimer = null;
      let restoreDeadline = null;

      function cleanupRestoreTimer() {
        if (restoreTimer) {
          window.clearTimeout(restoreTimer);
          restoreTimer = null;
        }
      }

      function restoreDefaultState() {
        restoreDeadline = null;
        cleanupRestoreTimer();

        if (button) {
          button.disabled = false;
        }

        if (status) {
          status.textContent = ${JSON.stringify("__PENDING_STATUS__")};
        }
      }

      function scheduleRestoreState(delay = 2000) {
        restoreDeadline = Date.now() + delay;

        cleanupRestoreTimer();
        restoreTimer = window.setTimeout(() => {
          restoreDefaultState();
        }, delay);
      }

      function syncRestoreState() {
        if (!restoreDeadline) {
          return;
        }

        const remaining = restoreDeadline - Date.now();
        if (remaining <= 0) {
          restoreDefaultState();
          return;
        }

        scheduleRestoreState(remaining);
      }

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          syncRestoreState();
        }
      });

      window.addEventListener("pageshow", syncRestoreState);
      window.addEventListener("focus", syncRestoreState);

      async function copyText(value) {
        if (!value) {
          return false;
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          try {
            await navigator.clipboard.writeText(value);
            return true;
          } catch {
            // Fall through to the textarea fallback.
          }
        }

        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        let copied = false;

        try {
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        }

        textarea.remove();
        return copied;
      }

      async function startOpenAppFlow(triggeredByUser) {
        if (!button) {
          return;
        }

        const targetUrl = button.getAttribute("data-target-url") || "";
        const copyValue = button.getAttribute("data-copy-text") || "";

        if (!targetUrl) {
          return;
        }

        button.disabled = true;

        if (status) {
          status.textContent = triggeredByUser
            ? ${JSON.stringify("__COPYING_STATUS__")}
            : ${JSON.stringify("__AUTO_STARTING_STATUS__")};
        }

        const copied = await copyText(copyValue);

        if (!copied && !triggeredByUser && autoCopyEnabled) {
          restoreDeadline = null;
          cleanupRestoreTimer();
          button.disabled = false;

          if (status) {
            status.textContent = ${JSON.stringify("__AUTO_BLOCKED_STATUS__")};
          }

          return;
        }

        if (status) {
          status.textContent = copied
            ? ${JSON.stringify("__SUCCESS_STATUS__")}
            : ${JSON.stringify("__FALLBACK_STATUS__")};
        }

        scheduleRestoreState(2000);

        window.location.href = targetUrl;
      }

      button?.addEventListener("click", async () => {
        await startOpenAppFlow(true);
      });

      if (autoCopyEnabled && button) {
        window.addEventListener("load", () => {
          void startOpenAppFlow(false);
        }, { once: true });
      }
    </script>
  </body>
</html>`
    .replace("\"__PENDING_STATUS__\"", JSON.stringify(copy.pendingStatus))
    .replace("\"__AUTO_STARTING_STATUS__\"", JSON.stringify(copy.autoStartingStatus))
    .replace("\"__AUTO_BLOCKED_STATUS__\"", JSON.stringify(copy.autoBlockedStatus))
    .replace("\"__COPYING_STATUS__\"", JSON.stringify(copy.copyingStatus))
    .replace("\"__SUCCESS_STATUS__\"", JSON.stringify(copy.successStatus))
    .replace("\"__FALLBACK_STATUS__\"", JSON.stringify(copy.fallbackStatus));
}

function hasPasswordAccess(request: NextRequest, pathPrefix: string, slug: string, entryId: string, passwordHash: string | null) {
  if (!passwordHash) {
    return true;
  }

  const cookieName = getEntryPasswordAccessCookieName(slug, pathPrefix);
  const cookieValue = request.cookies.get(cookieName)?.value;
  return hasEntryPasswordAccessCookie(cookieValue, entryId, passwordHash);
}

async function buildLegacyGoVCardRedirectResponse(request: NextRequest, pathPrefix: string, slug: string) {
  if (pathPrefix !== "c") {
    return null;
  }

  const legacyRedirectHref = await resolveLegacyGoVCardRedirectBySlug(slug, {
    previewToken: request.nextUrl.searchParams.get("preview_token")?.trim() ?? null,
  });

  if (!legacyRedirectHref) {
    return null;
  }

  const redirectUrl = new URL(legacyRedirectHref);
  request.nextUrl.searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(redirectUrl, { status: request.method === "POST" ? 303 : 307 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ prefix?: string; slug: string }> },
) {
  const { prefix, slug } = await context.params;
  const isPreviewRequest = Boolean(request.nextUrl.searchParams.get("preview_token")?.trim());
  const requestContext = buildPublicRequestContext(request);
  const locale = requestContext.resolvedLocale;
  const normalizedPathPrefix = prefix ? normalizeEntryPathPrefix(prefix) : "l";
  let resolved = null;

  if (prefix && !normalizedPathPrefix) {
    const copy = getEntryNotFoundCopy(locale);
    return new NextResponse(buildStatePageHtml(copy, request), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const effectivePathPrefix = normalizedPathPrefix ?? "l";

  try {
    resolved = await resolvePublicEntryBySlug(request, slug, locale, requestContext, effectivePathPrefix);
  } catch (error) {
    if (isPlanConstraintError(error)) {
      const description = getPlanConstraintResponseMessage(error);
      const copy = getPlanConstraintCopy(locale, description);
      return new NextResponse(buildStatePageHtml(copy, request), {
        status: 429,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }

    throw error;
  }

  if (!resolved) {
    const legacyRedirect = await buildLegacyGoVCardRedirectResponse(request, effectivePathPrefix, slug);
    if (legacyRedirect) {
      return legacyRedirect;
    }

    const entryAvailability = !isPreviewRequest ? await lookupPublicEntryAvailabilityBySlug(slug, effectivePathPrefix) : null;
    const copy = entryAvailability?.status === "archived" ? getEntryArchivedCopy(locale) : getEntryNotFoundCopy(locale);
    return new NextResponse(buildStatePageHtml(copy, request), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  if (!hasPasswordAccess(request, resolved.entry.path_prefix, slug, resolved.entry.id, resolved.entry.password_hash)) {
    const copy = getPasswordGateCopy(locale, isPreviewRequest);
    return new NextResponse(buildPasswordGateHtml(copy, request), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  if (!isPreviewRequest) {
    after(async () => {
      try {
        await recordEntryVisit(resolved);
      } catch (error) {
        console.error("Failed to record entry visit", error);
      }
    });
  }

  if (resolved.target.kind === "openapp") {
    const copyText = resolved.target.open_app?.copyText?.trim();

    if (copyText) {
      const copy = getOpenAppConfirmCopy(
        locale,
        resolved.resolvedUrl,
        copyText,
        resolved.target.open_app?.preset ?? null,
        resolved.target.open_app?.appName ?? null,
        Boolean(resolved.target.open_app?.silentCopy),
      );
      return new NextResponse(buildOpenAppConfirmHtml(copy, request), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }
  }

  return NextResponse.redirect(resolved.resolvedUrl, { status: 307 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ prefix?: string; slug: string }> },
) {
  const { prefix, slug } = await context.params;
  const isPreviewRequest = Boolean(request.nextUrl.searchParams.get("preview_token")?.trim());
  const requestContext = buildPublicRequestContext(request);
  const locale = requestContext.resolvedLocale;
  const normalizedPathPrefix = prefix ? normalizeEntryPathPrefix(prefix) : "l";
  let resolved = null;

  if (prefix && !normalizedPathPrefix) {
    const copy = getEntryNotFoundCopy(locale);
    return new NextResponse(buildStatePageHtml(copy, request), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const effectivePathPrefix = normalizedPathPrefix ?? "l";

  try {
    resolved = await resolvePublicEntryBySlug(request, slug, locale, requestContext, effectivePathPrefix);
  } catch (error) {
    if (isPlanConstraintError(error)) {
      const description = getPlanConstraintResponseMessage(error);
      const copy = getPlanConstraintCopy(locale, description);
      return new NextResponse(buildStatePageHtml(copy, request), {
        status: 429,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    }

    throw error;
  }

  if (!resolved) {
    const legacyRedirect = await buildLegacyGoVCardRedirectResponse(request, effectivePathPrefix, slug);
    if (legacyRedirect) {
      return legacyRedirect;
    }

    const entryAvailability = !isPreviewRequest ? await lookupPublicEntryAvailabilityBySlug(slug, effectivePathPrefix) : null;
    const copy = entryAvailability?.status === "archived" ? getEntryArchivedCopy(locale) : getEntryNotFoundCopy(locale);
    return new NextResponse(buildStatePageHtml(copy, request), {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  if (!resolved.entry.password_hash) {
    return NextResponse.redirect(request.nextUrl, { status: 303 });
  }

  const formData = await request.formData();
  const submittedPassword = String(formData.get("password") ?? "");

  if (!verifyEntryPassword(submittedPassword, resolved.entry.password_hash)) {
    const copy = getPasswordGateCopy(
      locale,
      isPreviewRequest,
      locale === "zh-Hant"
        ? "密碼不正確，請重新輸入。"
        : locale === "zh-Hans"
          ? "密码不正确，请重新输入。"
          : "Incorrect password. Please try again.",
    );

    return new NextResponse(buildPasswordGateHtml(copy, request), {
      status: 401,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }

  const response = NextResponse.redirect(request.nextUrl, { status: 303 });
  response.cookies.set(getEntryPasswordAccessCookieName(slug, resolved.entry.path_prefix), createEntryPasswordAccessCookieValue(resolved.entry.id, resolved.entry.password_hash), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
