export const DEVICE_SYSTEMS = [
  { value: "ios", zhHant: "iOS", en: "iOS" },
  { value: "android", zhHant: "Android", en: "Android" },
  { value: "ipados", zhHant: "iPadOS", en: "iPadOS" },
  { value: "windows", zhHant: "Windows", en: "Windows" },
  { value: "macos", zhHant: "macOS", en: "macOS" },
  { value: "other", zhHant: "其他系統", en: "Other" },
] as const;

export type DeviceSystemValue = (typeof DEVICE_SYSTEMS)[number]["value"];
