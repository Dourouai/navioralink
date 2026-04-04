import { redirect } from "next/navigation";

import { defaultLocale, withLocale } from "@/i18n/config";

export default function SettingsRedirectPage() {
  redirect(withLocale(defaultLocale, "/settings"));
}
