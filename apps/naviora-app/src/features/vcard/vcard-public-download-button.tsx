"use client";

import { Download } from "lucide-react";

import type { Locale } from "@/i18n/config";
import type { VCardProfile } from "@/types/qr";

interface VCardPublicDownloadButtonProps {
  locale: Locale;
  displayName: string;
  profile: VCardProfile;
}

function escapeVCardValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function VCardPublicDownloadButton({ locale, displayName, profile }: VCardPublicDownloadButtonProps) {
  function downloadContact() {
    const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCardValue(displayName)}`];

    if (profile.company?.trim()) lines.push(`ORG:${escapeVCardValue(profile.company.trim())}`);
    if (profile.title?.trim()) lines.push(`TITLE:${escapeVCardValue(profile.title.trim())}`);
    if (profile.phone?.trim()) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(profile.phone.trim())}`);
    if (profile.email?.trim()) lines.push(`EMAIL:${escapeVCardValue(profile.email.trim())}`);
    if (profile.website?.trim()) lines.push(`URL:${escapeVCardValue(profile.website.trim())}`);

    lines.push("END:VCARD");

    const blob = new Blob([lines.join("\n")], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${displayName.replace(/\s+/g, "-").toLowerCase() || "contact"}.vcf`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadContact}
      className="inline-flex min-w-[210px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#9d4fb5_0%,#7c3aed_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(124,58,237,0.24)] transition hover:translate-y-[-1px]"
    >
      <Download size={16} />
      {locale === "zh-Hant" ? "保存聯絡人" : locale === "zh-Hans" ? "保存联系人" : "Add contact"}
    </button>
  );
}
