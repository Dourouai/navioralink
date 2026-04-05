"use client";

import Image from "next/image";
import { AtSign, Download, Facebook, Globe, Instagram, Linkedin, Mail, MessageCircleMore, Phone, Youtube } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { Locale } from "@/i18n/config";
import { readVCardProfile, resolveVCardAvatarSrc } from "@/lib/vcard";
import type { VCardProfile, VCardSocialPlatform } from "@/types/qr";

interface VCardPublicPageProps {
  locale: Locale;
  id: string;
}

function getSocialIcon(platform: VCardSocialPlatform) {
  if (platform === "linkedin") return Linkedin;
  if (platform === "instagram") return Instagram;
  if (platform === "facebook") return Facebook;
  if (platform === "youtube") return Youtube;
  if (platform === "wechat") return MessageCircleMore;
  if (platform === "website") return Globe;
  return AtSign;
}

function getSocialLabel(platform: VCardSocialPlatform, locale: Locale) {
  if (platform === "wechat") {
    return locale === "en" ? "WeChat" : "微信";
  }

  if (platform === "website") {
    return locale === "zh-Hant" ? "網站" : locale === "zh-Hans" ? "网站" : "Website";
  }

  return platform === "x" ? "X" : platform.charAt(0).toUpperCase() + platform.slice(1);
}

function escapeVCardValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function VCardPublicPage({ locale, id }: VCardPublicPageProps) {
  const [profile, setProfile] = useState<VCardProfile | null>(null);

  useEffect(() => {
    setProfile(readVCardProfile(id));
  }, [id]);

  const displayName =
    profile?.fullName?.trim() ||
    (locale === "zh-Hant" ? "聯絡人名片" : locale === "zh-Hans" ? "联系人名片" : "Contact card");
  const avatarSrc = resolveVCardAvatarSrc(profile, id, displayName);
  const companyLine =
    [profile?.title?.trim(), profile?.company?.trim()].filter(Boolean).join(" / ") ||
    profile?.company?.trim() ||
    profile?.title?.trim() ||
    (locale === "zh-Hant" ? "聯絡名片" : locale === "zh-Hans" ? "联系人名片" : "Contact card");
  const socialLinks = useMemo(() => (profile?.socialLinks ?? []).filter((item) => item.url.trim()), [profile?.socialLinks]);
  const contactCards = [
    profile?.phone?.trim()
      ? {
          id: "phone",
          label: locale === "zh-Hant" ? "手機號碼" : locale === "zh-Hans" ? "手机号码" : "Mobile phone",
          value: profile.phone.trim(),
          href: `tel:${profile.phone.trim()}`,
          icon: Phone,
        }
      : null,
    profile?.email?.trim()
      ? {
          id: "email",
          label: "Email",
          value: profile.email.trim(),
          href: `mailto:${profile.email.trim()}`,
          icon: Mail,
        }
      : null,
    profile?.website?.trim()
      ? {
          id: "website",
          label: locale === "zh-Hant" ? "網站" : locale === "zh-Hans" ? "网站" : "Website",
          value: profile.website.trim(),
          href: profile.website.trim(),
          icon: Globe,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    value: string;
    href: string;
    icon: typeof Phone;
  }>;

  function downloadContact() {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVCardValue(displayName)}`,
    ];

    if (profile?.company?.trim()) lines.push(`ORG:${escapeVCardValue(profile.company.trim())}`);
    if (profile?.title?.trim()) lines.push(`TITLE:${escapeVCardValue(profile.title.trim())}`);
    if (profile?.phone?.trim()) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(profile.phone.trim())}`);
    if (profile?.email?.trim()) lines.push(`EMAIL:${escapeVCardValue(profile.email.trim())}`);
    if (profile?.website?.trim()) lines.push(`URL:${escapeVCardValue(profile.website.trim())}`);

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,188,245,0.16),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_50%,#f8f8ff_100%)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <section className="w-full max-w-[760px]">
          <div className="flex flex-col items-center pt-4 sm:pt-8">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] ring-4 ring-white sm:h-28 sm:w-28">
              <Image src={avatarSrc} alt={displayName} fill unoptimized sizes="112px" className="object-cover" />
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-[31px] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[38px]">{displayName}</h1>
              <div className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-400 sm:text-[13px]">
                {companyLine}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={downloadContact}
                className="inline-flex min-w-[210px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#9d4fb5_0%,#7c3aed_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(124,58,237,0.24)] transition hover:translate-y-[-1px]"
              >
                <Download size={16} />
                {locale === "zh-Hant" ? "保存聯絡人" : locale === "zh-Hans" ? "保存联系人" : "Add contact"}
              </button>

              {profile?.phone?.trim() ? (
                <a
                  href={`tel:${profile.phone.trim()}`}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f6eefe] text-[#954da9] ring-1 ring-[rgba(148,77,169,0.12)] transition hover:bg-[#efe4fb]"
                  aria-label={locale === "zh-Hant" ? "撥打電話" : locale === "zh-Hans" ? "拨打电话" : "Call"}
                >
                  <Phone size={18} />
                </a>
              ) : null}

              {profile?.email?.trim() ? (
                <a
                  href={`mailto:${profile.email.trim()}`}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f6eefe] text-[#954da9] ring-1 ring-[rgba(148,77,169,0.12)] transition hover:bg-[#efe4fb]"
                  aria-label="Email"
                >
                  <Mail size={18} />
                </a>
              ) : null}

              {profile?.website?.trim() ? (
                <a
                  href={profile.website.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f6eefe] text-[#954da9] ring-1 ring-[rgba(148,77,169,0.12)] transition hover:bg-[#efe4fb]"
                  aria-label={locale === "zh-Hant" ? "開啟網站" : locale === "zh-Hans" ? "打开网站" : "Open website"}
                >
                  <Globe size={18} />
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-10 space-y-4 sm:mt-12 sm:space-y-5">
            {socialLinks.length ? (
              <div className="rounded-[28px] border border-[rgba(190,206,226,0.55)] bg-white/92 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:px-6">
                <div className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {locale === "zh-Hant" ? "社交媒體" : locale === "zh-Hans" ? "社交媒体" : "Social media"}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {socialLinks.map((item) => {
                    const Icon = getSocialIcon(item.platform);
                    const iconNode = (
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f6eefe] text-[#954da9] ring-1 ring-[rgba(148,77,169,0.12)] transition hover:bg-[#efe4fb]">
                        <Icon size={18} />
                      </div>
                    );

                    return item.platform === "wechat" ? (
                      <div key={`${item.platform}-${item.url}`} title={item.url}>
                        {iconNode}
                      </div>
                    ) : (
                      <a key={`${item.platform}-${item.url}`} href={item.url} target="_blank" rel="noreferrer" aria-label={getSocialLabel(item.platform, locale)}>
                        {iconNode}
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {contactCards.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.id === "website" ? "_blank" : undefined}
                  rel={item.id === "website" ? "noreferrer" : undefined}
                  className="flex items-start gap-4 rounded-[28px] border border-[rgba(190,206,226,0.55)] bg-white/94 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] transition hover:border-[rgba(148,77,169,0.24)] sm:px-6 sm:py-6"
                >
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#f6eefe] text-[#954da9]">
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                    <div className="mt-2 break-words text-base font-medium text-slate-900">{item.value}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <footer className="w-full max-w-[760px] pt-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <LanguageSwitcher locale={locale} className="shrink-0" />
            <div className="text-[11px] font-medium tracking-[0.04em] text-slate-400">Powered by Naviora</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
