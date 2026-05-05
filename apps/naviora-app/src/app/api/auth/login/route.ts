import { createHash } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { getTencentCaptchaAppId, getTencentCaptchaFailureMessage, hasTencentCaptchaServerEnv, verifyTencentCaptcha } from "@/lib/tencent-captcha";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { mergeAuthUserWithProfile } from "@/lib/supabase/profiles-shared";
import { ensureProfileForUserServer } from "@/lib/supabase/profiles-server";
import { createInMemoryRateLimiter, getClientIpFromHeaders } from "@/lib/rate-limit";
import { writeLoginLog } from "@/lib/login-log";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  locale: z.string().optional(),
  captcha: z
    .object({
      ticket: z.string().trim().min(1),
      randstr: z.string().trim().min(1),
    })
    .nullable()
    .optional(),
});

const loginRateLimiter = createInMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

function hashEmailForRateLimit(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function resolveLocale(value?: string | null): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

function getCaptchaRequiredMessage(locale: Locale) {
  if (locale === "zh-Hant") {
    return "請先完成驗證後再登入。";
  }

  if (locale === "zh-Hans") {
    return "请先完成验证后再登录。";
  }

  return "Please complete verification before signing in.";
}

function getCaptchaFailedMessage(locale: Locale) {
  if (locale === "zh-Hant") {
    return "驗證沒有通過，請再試一次。";
  }

  if (locale === "zh-Hans") {
    return "验证没有通过，请再试一次。";
  }

  return "Verification did not pass. Please try again.";
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
    const limit = loginRateLimiter.consume(rateLimitKey);

    if (!limit.allowed) {
      writeLoginLog({ type: "login", status: "rate_limited", email: normalizedEmail, ipAddress: clientIp, userAgent });
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
        writeLoginLog({ type: "login", status: "captcha_failed", email: normalizedEmail, ipAddress: clientIp, userAgent });
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

    const cookieStore = await cookies();
    const cookiesToSet: Array<{ name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }> = [];
    const { url, publishableKey } = getSupabaseEnv();
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(nextCookies) {
          nextCookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: payload.password,
    });

    if (error) {
      writeLoginLog({ type: "login", status: "failed", email: normalizedEmail, ipAddress: clientIp, userAgent });
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    let authUser = data.user;
    if (!authUser) {
      return NextResponse.json({ message: "Unable to load your account." }, { status: 400 });
    }

    if (locale && authUser.user_metadata?.locale !== locale) {
      const { data: localeUpdateData } = await supabase.auth.updateUser({
        data: {
          ...(authUser.user_metadata ?? {}),
          locale,
        },
      });

      authUser = localeUpdateData.user ?? authUser;
    }

    const profile = await ensureProfileForUserServer(authUser, {
      supabase,
      defaultLocale: locale,
    });

    writeLoginLog({ type: "login", status: "success", email: normalizedEmail, userId: authUser.id, ipAddress: clientIp, userAgent });

    const response = NextResponse.json({
      token: data.session?.access_token ?? null,
      user: mergeAuthUserWithProfile(authUser, profile),
    });

    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Please provide a valid email and password." }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to sign in right now.",
      },
      { status: 500 },
    );
  }
}
