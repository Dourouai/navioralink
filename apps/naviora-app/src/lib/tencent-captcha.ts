import "server-only";

import { captcha } from "tencentcloud-sdk-nodejs-captcha";
import type { Locale } from "@/i18n/config";
import type { TencentCaptchaChallengePayload } from "@/types/tencent-captcha";

export interface TencentCaptchaVerifyResult {
  enabled: boolean;
  success: boolean;
  captchaCode: number | null;
  evilLevel: number | null;
  message: string;
  requestId: string | null;
}

const DEFAULT_TENCENT_CAPTCHA_ENDPOINT = "captcha.intl.tencentcloudapi.com";
const DEFAULT_TENCENT_CAPTCHA_REGION = "ap-singapore";
const DEFAULT_TENCENT_CAPTCHA_TYPE = 9;

export type TencentCaptchaTicketKind = "normal" | "trerror" | null;

function normalizeNumber(value?: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getTencentCaptchaAppId() {
  return normalizeNumber(process.env.NEXT_PUBLIC_TENCENT_CAPTCHA_APP_ID?.trim());
}

export function hasTencentCaptchaPublicEnv() {
  return Boolean(getTencentCaptchaAppId());
}

export function hasTencentCaptchaServerEnv() {
  return Boolean(
    getTencentCaptchaAppId() &&
      process.env.TENCENT_CAPTCHA_SECRET_ID?.trim() &&
      process.env.TENCENT_CAPTCHA_SECRET_KEY?.trim() &&
      process.env.TENCENT_CAPTCHA_APP_SECRET_KEY?.trim(),
  );
}

function getTencentCaptchaServerConfig() {
  const captchaAppId = getTencentCaptchaAppId();
  const secretId = process.env.TENCENT_CAPTCHA_SECRET_ID?.trim();
  const secretKey = process.env.TENCENT_CAPTCHA_SECRET_KEY?.trim();
  const appSecretKey = process.env.TENCENT_CAPTCHA_APP_SECRET_KEY?.trim();
  const endpoint = process.env.TENCENT_CAPTCHA_ENDPOINT?.trim() || DEFAULT_TENCENT_CAPTCHA_ENDPOINT;
  const region = process.env.TENCENT_CAPTCHA_REGION?.trim() || DEFAULT_TENCENT_CAPTCHA_REGION;

  if (!captchaAppId || !secretId || !secretKey || !appSecretKey) {
    throw new Error(
      "Tencent captcha env is missing. Add NEXT_PUBLIC_TENCENT_CAPTCHA_APP_ID, TENCENT_CAPTCHA_SECRET_ID, TENCENT_CAPTCHA_SECRET_KEY, and TENCENT_CAPTCHA_APP_SECRET_KEY first.",
    );
  }

  return {
    captchaAppId,
    secretId,
    secretKey,
    appSecretKey,
    endpoint,
    region,
  };
}

export function getTencentCaptchaType() {
  return DEFAULT_TENCENT_CAPTCHA_TYPE;
}

export function getTencentCaptchaTicketKind(ticket?: string | null): TencentCaptchaTicketKind {
  const normalized = ticket?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return null;
  }

  return normalized.startsWith("trerror") ? "trerror" : "normal";
}

export function getTencentCaptchaFailureMessage(params: {
  locale: Locale;
  result: Pick<TencentCaptchaVerifyResult, "captchaCode">;
  ticket?: string | null;
}) {
  const { locale, result, ticket } = params;
  const ticketKind = getTencentCaptchaTicketKind(ticket);

  if (result.captchaCode === 21 && ticketKind === "trerror") {
    if (locale === "zh-Hant") {
      return "驗證服務剛剛因網路波動沒有完成，請稍後重試。";
    }

    if (locale === "zh-Hans") {
      return "验证服务刚刚因网络波动没有完成，请稍后重试。";
    }

    return "Verification could not complete because of a network issue. Please try again.";
  }

  if (result.captchaCode === 21) {
    if (locale === "zh-Hant") {
      return "這次請求被風控攔截，請稍後再試或更換網路環境。";
    }

    if (locale === "zh-Hans") {
      return "这次请求被风控拦截，请稍后再试或更换网络环境。";
    }

    return "This request was blocked by risk control. Please try again later or switch networks.";
  }

  if (result.captchaCode === 16 || result.captchaCode === 100) {
    if (locale === "zh-Hant") {
      return "驗證服務設定暫時異常，請聯繫管理員檢查 Captcha 設定。";
    }

    if (locale === "zh-Hans") {
      return "验证服务配置暂时异常，请联系管理员检查 Captcha 设置。";
    }

    return "Captcha configuration is temporarily invalid. Please contact support.";
  }

  if (locale === "zh-Hant") {
    return "驗證沒有通過，請再試一次。";
  }

  if (locale === "zh-Hans") {
    return "验证没有通过，请再试一次。";
  }

  return "Verification did not pass. Please try again.";
}

export async function verifyTencentCaptcha(params: TencentCaptchaChallengePayload & { userIp?: string | null }) {
  if (!hasTencentCaptchaServerEnv()) {
    return {
      enabled: false,
      success: true,
      captchaCode: null,
      evilLevel: null,
      message: "Tencent captcha is not enabled.",
      requestId: null,
    } satisfies TencentCaptchaVerifyResult;
  }

  const config = getTencentCaptchaServerConfig();
  const userIp = params.userIp?.trim() || "0.0.0.0";
  const ticket = params.ticket.trim();
  const randstr = params.randstr.trim();

  const CaptchaClient = captcha.v20190722.Client;
  const client = new CaptchaClient({
    credential: {
      secretId: config.secretId,
      secretKey: config.secretKey,
    },
    region: config.region,
    profile: {
      signMethod: "TC3-HMAC-SHA256",
      httpProfile: {
        endpoint: config.endpoint,
        reqMethod: "POST",
        reqTimeout: 10,
      },
    },
  });

  const response = await client.DescribeCaptchaResult({
    CaptchaAppId: config.captchaAppId,
    CaptchaType: getTencentCaptchaType(),
    Ticket: ticket,
    Randstr: randstr,
    UserIp: userIp,
    NeedGetCaptchaTime: 1,
    AppSecretKey: config.appSecretKey,
  });

  const captchaCode = typeof response.CaptchaCode === "number" ? response.CaptchaCode : null;
  const evilLevel = typeof response.EvilLevel === "number" ? response.EvilLevel : null;
  const message = typeof response.CaptchaMsg === "string" && response.CaptchaMsg.trim() ? response.CaptchaMsg.trim() : "Captcha verification failed.";
  const requestId = typeof response.RequestId === "string" ? response.RequestId : null;

  // captchaCode === 1: normal pass
  // captchaCode === 21 + trerror ticket: auto-pass from Tencent that failed due to network issue.
  // Per Tencent's recommendation, trerror tickets should be treated as a pass since they
  // represent failed silent risk assessment (network issue), not a security threat.
  const isTrerrorPass =
    captchaCode === 21 && getTencentCaptchaTicketKind(ticket) === "trerror";
  const success = captchaCode === 1 || isTrerrorPass;

  return {
    enabled: true,
    success,
    captchaCode,
    evilLevel,
    message,
    requestId,
  } satisfies TencentCaptchaVerifyResult;
}
