import { describe, expect, it } from "vitest";

import { createInMemoryRateLimiter, getClientIpFromHeaders } from "./rate-limit";

describe("createInMemoryRateLimiter", () => {
  it("allows requests until the limit and then blocks", () => {
    let now = 1_000;
    const limiter = createInMemoryRateLimiter({
      windowMs: 60_000,
      maxRequests: 2,
      now: () => now,
    });

    expect(limiter.consume("ip:email").allowed).toBe(true);
    expect(limiter.consume("ip:email").allowed).toBe(true);

    const blocked = limiter.consume("ip:email");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    now += 60_001;

    const reset = limiter.consume("ip:email");
    expect(reset.allowed).toBe(true);
  });

  it("isolates different keys", () => {
    const limiter = createInMemoryRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      now: () => 1_000,
    });

    expect(limiter.consume("key-a").allowed).toBe(true);
    expect(limiter.consume("key-a").allowed).toBe(false);
    expect(limiter.consume("key-b").allowed).toBe(true);
  });
});

describe("getClientIpFromHeaders", () => {
  it("uses the first ip from x-forwarded-for", () => {
    const headers = {
      get(name: string) {
        if (name === "x-forwarded-for") {
          return "1.1.1.1, 2.2.2.2";
        }

        return null;
      },
    } as unknown as Headers;

    expect(getClientIpFromHeaders(headers)).toBe("1.1.1.1");
  });

  it("falls back to unknown when no header exists", () => {
    const headers = {
      get() {
        return null;
      },
    } as unknown as Headers;

    expect(getClientIpFromHeaders(headers)).toBe("unknown");
  });
});
