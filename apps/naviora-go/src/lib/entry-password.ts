import { createHash, scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_HASH_KEY_LENGTH = 32;

function encodeEntryAccessPayload(entryId: string, passwordHash: string) {
  return createHash("sha256").update(`${entryId}:${passwordHash}`).digest("base64url");
}

export function verifyEntryPassword(password: string, storedHash: string | null) {
  const normalizedPassword = password.trim();
  const normalizedHash = storedHash?.trim();

  if (!normalizedPassword || !normalizedHash) {
    return false;
  }

  const [prefix, salt, expectedKey] = normalizedHash.split("$");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !expectedKey) {
    return false;
  }

  const derivedKey = scryptSync(normalizedPassword, salt, PASSWORD_HASH_KEY_LENGTH).toString("base64url");
  if (derivedKey.length !== expectedKey.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(derivedKey), Buffer.from(expectedKey));
}

export function getEntryPasswordAccessCookieName(slug: string, pathPrefix?: string | null) {
  const normalizedPathPrefix = pathPrefix?.trim().replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const normalizedSlug = slug.trim().replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `naviora-entry-access-${normalizedPathPrefix || "l"}-${normalizedSlug || "default"}`;
}

export function createEntryPasswordAccessCookieValue(entryId: string, passwordHash: string) {
  return encodeEntryAccessPayload(entryId, passwordHash);
}

export function hasEntryPasswordAccessCookie(cookieValue: string | undefined, entryId: string, passwordHash: string | null) {
  if (!cookieValue || !passwordHash) {
    return false;
  }

  const expectedValue = encodeEntryAccessPayload(entryId, passwordHash);
  if (cookieValue.length !== expectedValue.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(cookieValue), Buffer.from(expectedValue));
}
