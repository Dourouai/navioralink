import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";

import { createInMemoryRateLimiter, getClientIpFromHeaders } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().trim().email(),
});

const emailExistsRateLimiter = createInMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 12,
});

function hashEmailForRateLimit(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const payload = bodySchema.parse(await request.json());
    const normalizedEmail = payload.email.trim().toLowerCase();
    const rateLimitKey = `${getClientIpFromHeaders(request.headers)}:${hashEmailForRateLimit(normalizedEmail)}`;
    const limit = emailExistsRateLimiter.consume(rateLimitKey);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          code: "RATE_LIMITED",
          message: "Please retry in a moment.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        },
      );
    }

    return NextResponse.json({
      accepted: true,
      message: "If this email is eligible, continue with the next step.",
    });
  } catch {
    return NextResponse.json(
      {
        message: "Please provide a valid email address.",
      },
      { status: 400 },
    );
  }
}
