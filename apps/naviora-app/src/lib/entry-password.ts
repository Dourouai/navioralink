import { randomBytes, scryptSync } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_HASH_KEY_LENGTH = 32;

export function hashEntryPassword(password: string) {
  const normalizedPassword = password.trim();

  if (!normalizedPassword) {
    return null;
  }

  const salt = randomBytes(16).toString("base64url");
  const derivedKey = scryptSync(normalizedPassword, salt, PASSWORD_HASH_KEY_LENGTH).toString("base64url");
  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey}`;
}
