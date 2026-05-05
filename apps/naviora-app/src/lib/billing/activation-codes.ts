export const ACTIVATION_CODE_ERROR_CODES = [
  "ACTIVATION_CODE_REQUIRED",
  "ACTIVATION_CODE_INVALID",
  "ACTIVATION_CODE_EXPIRED",
  "ACTIVATION_CODE_UNAVAILABLE",
  "ACTIVATION_CODE_LIMIT_REACHED",
  "ACTIVATION_CODE_ALREADY_REDEEMED",
  "ACTIVATION_CODE_AUTH_REQUIRED",
  "ACTIVATION_CODE_STRATEGY_REQUIRED",
] as const;

export type ActivationCodeErrorCode = (typeof ACTIVATION_CODE_ERROR_CODES)[number];

const activationCodeErrorCodeSet = new Set<string>(ACTIVATION_CODE_ERROR_CODES);
const ACTIVATION_CODE_PREFIX = "NAV";
const ACTIVATION_CODE_BODY_LENGTH = 12;
const ACTIVATION_CODE_GROUP_SIZE = 4;

export function normalizeActivationCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith(ACTIVATION_CODE_PREFIX)) {
    return `${ACTIVATION_CODE_PREFIX}${normalized.slice(
      ACTIVATION_CODE_PREFIX.length,
      ACTIVATION_CODE_PREFIX.length + ACTIVATION_CODE_BODY_LENGTH,
    )}`;
  }

  if (normalized.length === ACTIVATION_CODE_BODY_LENGTH) {
    return `${ACTIVATION_CODE_PREFIX}${normalized}`;
  }

  return normalized;
}

export function formatActivationCodeForInput(value: string) {
  const normalized = normalizeActivationCode(value);
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith(ACTIVATION_CODE_PREFIX)) {
    const body = normalized.slice(ACTIVATION_CODE_PREFIX.length);
    const groupedBody = body.match(new RegExp(`.{1,${ACTIVATION_CODE_GROUP_SIZE}}`, "g"))?.join("-") ?? "";
    return groupedBody ? `${ACTIVATION_CODE_PREFIX}-${groupedBody}` : ACTIVATION_CODE_PREFIX;
  }

  return normalized.match(new RegExp(`.{1,${ACTIVATION_CODE_GROUP_SIZE}}`, "g"))?.join("-") ?? normalized;
}

export function isActivationCodeErrorCode(value: string | null | undefined): value is ActivationCodeErrorCode {
  return Boolean(value && activationCodeErrorCodeSet.has(value));
}
