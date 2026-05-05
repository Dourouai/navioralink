import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getTencentCaptchaAppId, getTencentCaptchaFailureMessage, hasTencentCaptchaServerEnv, verifyTencentCaptcha } from "@/lib/tencent-captcha";
import { createInMemoryRateLimiter, getClientIpFromHeaders } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { writeLoginLog } from "@/lib/login-log";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email(),
  locale: z.string(),
  captcha: z
    .object({
      ticket: z.string().trim().min(1),
      randstr: z.string().trim().min(1),
    })
    .nullable()
    .optional(),
});

const registrationOtpRateLimiter = createInMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 8,
});

function hashEmailForRateLimit(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function resolveLocale(value?: string | null): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

function getCaptchaRequiredMessage(locale: Locale) {
  if (locale === "zh-Hant") {
    return "請先完成驗證後再發送驗證碼。";
  }

  if (locale === "zh-Hans") {
    return "请先完成验证后再发送验证码。";
  }

  return "Please complete verification before sending the code.";
}

function getRateLimitedMessage(locale: Locale) {
  if (locale === "zh-Hant") {
    return "請稍後再試。";
  }

  if (locale === "zh-Hans") {
    return "请稍后再试。";
  }

  return "Please retry in a moment.";
}

export async function POST(request: NextRequest) {
  try {
    const payload = bodySchema.parse(await request.json());
    const locale = resolveLocale(payload.locale);
    const normalizedEmail = payload.email.trim().toLowerCase();
    const clientIp = getClientIpFromHeaders(request.headers);
    const userAgent = request.headers.get("user-agent");
    const rateLimitKey = `${clientIp}:${hashEmailForRateLimit(normalizedEmail)}`;
    const limit = registrationOtpRateLimiter.consume(rateLimitKey);

    if (!limit.allowed) {
      writeLoginLog({ type: "register", status: "rate_limited", email: normalizedEmail, ipAddress: clientIp, userAgent });
      return NextResponse.json(
        { message: getRateLimitedMessage(locale) },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        },
      );
    }

    if (hasTencentCaptchaServerEnv()) {
      if (!payload.captcha?.ticket || !payload.captcha?.randstr) {
        return NextResponse.json({ message: getCaptchaRequiredMessage(locale) }, { status: 400 });
      }

      const captchaResult = await verifyTencentCaptcha({
        ticket: payload.captcha.ticket,
        randstr: payload.captcha.randstr,
        userIp: clientIp,
      });

      if (!captchaResult.success) {
        writeLoginLog({ type: "register", status: "captcha_failed", email: normalizedEmail, ipAddress: clientIp, userAgent });
        return NextResponse.json(
          {
            message: getTencentCaptchaFailureMessage({ locale, result: captchaResult, ticket: payload.captcha.ticket }),
            code: captchaResult.captchaCode,
            requestId: captchaResult.requestId,
          },
          { status: 400 },
        );
      }
    } else if (getTencentCaptchaAppId() && !payload.captcha?.ticket) {
      return NextResponse.json({ message: getCaptchaRequiredMessage(locale) }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        data: {
          locale,
        },
      },
    });

    if (error) {
      writeLoginLog({ type: "register", status: "failed", email: normalizedEmail, ipAddress: clientIp, userAgent });
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    writeLoginLog({ type: "register", status: "success", email: normalizedEmail, ipAddress: clientIp, userAgent });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Please provide a valid email address." }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to send the verification code right now.",
      },
      { status: 500 },
    );
  }
}
