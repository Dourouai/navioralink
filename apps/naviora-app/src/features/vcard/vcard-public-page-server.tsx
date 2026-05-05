import Image from "next/image";
import { Globe, Mail, Phone } from "lucide-react";

import type { Locale } from "@/i18n/config";
import { getVCardSocialDisplayValue, getVCardSocialLabel, resolveVCardAvatarSrc, resolveVCardSocialHref } from "@/lib/vcard";
import type { VCardProfile } from "@/types/qr";

import { VCardPublicDownloadButton } from "./vcard-public-download-button";
import { VCardPublicLanguageSwitcher } from "./vcard-public-language-switcher";
import { VCardSocialCard } from "./vcard-social-card";

interface VCardPublicPageServerProps {
  locale: Locale;
  id: string;
  profile: VCardProfile | null;
}

function getAppHomeHref(locale: Locale) {
  const base = "https://www.naviora.link";

  if (locale === "en") {
    return `${base}/`;
  }

  return `${base}/${locale}`;
}

function getMissingCopy(locale: Locale) {
  if (locale === "zh-Hant") {
    return {
      badge: "內容遺失警報",
      title: "這張名片可能被風吹進了數位宇宙。",
      description: "我們沒有找到這個內容頁對應的資料。它可能已被刪除、尚未發布，或同步時偷偷開了個小差。",
      supporting: "也不排除它只是暫時躲起來整理髮型。總之，先回首頁比較穩。",
      primaryLabel: "返回首頁",
      secondary: "如果你是建立者，建議下一步把 vCard 內容正式存到伺服器，這樣不同裝置都能打開。",
    };
  }

  if (locale === "zh-Hans") {
    return {
      badge: "内容丢失警报",
      title: "这张名片可能被风吹进了数字宇宙。",
      description: "我们没有找到这个内容页对应的数据。它可能已经被删除、还没发布，或者同步时偷偷开了个小差。",
      supporting: "也不排除它只是暂时躲起来整理发型。总之，先回首页比较稳。",
      primaryLabel: "返回首页",
      secondary: "如果你是创建者，建议下一步把 vCard 内容正式存到服务端，这样不同设备都能打开。",
    };
  }

  return {
    badge: "Content lost in transit",
    title: "This card may have drifted into the digital cosmos.",
    description: "We could not find any published content behind this page. It may have been deleted, not published yet, or wandered off during sync.",
    supporting: "There is also a non-zero chance it is backstage fixing its hair. Either way, the homepage is a safer landing spot.",
    primaryLabel: "Back to homepage",
    secondary: "If you own this card, the next best move is storing the vCard on the server so it works across devices.",
  };
}

function VCardMissingState({ locale, id }: { locale: Locale; id: string }) {
  const copy = getMissingCopy(locale);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,188,245,0.16),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_50%,#f8f8ff_100%)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[760px] flex-col">
        <div className="flex flex-1 items-center">
          <div className="relative w-full overflow-hidden rounded-[34px] border border-[rgba(190,206,226,0.55)] bg-white/94 p-8 shadow-[0_24px_50px_rgba(15,23,42,0.08)] sm:p-10">
            <div className="pointer-events-none absolute -right-10 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(141,121,255,0.22),transparent_70%)]" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(26,190,243,0.16),transparent_70%)]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(175,205,232,0.7)] bg-[#f6fbff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,#1ea7ff,#ff9c43)]" />
                {copy.badge}
              </div>

              <h1 className="mt-6 text-balance text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-[52px]">
                {copy.title}
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">{copy.description}</p>
              <p className="mt-3 text-base leading-7 text-slate-500">{copy.supporting}</p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={getAppHomeHref(locale)}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f7adf,#27a7f7)] px-6 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(15,122,223,0.24)] transition hover:translate-y-[-1px]"
                >
                  {copy.primaryLabel}
                </a>
              </div>

              <div className="mt-8 rounded-[24px] border border-[rgba(190,206,226,0.55)] bg-[#f8fbff] px-5 py-4 text-sm leading-6 text-slate-500">
                {copy.secondary}
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-6 flex justify-center pb-2">
          <div className="flex flex-col items-center justify-center gap-2 text-[11px] font-medium tracking-[0.04em] text-slate-400">
            <VCardPublicLanguageSwitcher locale={locale} id={id} tone="minimal" />
            <div>Powered by Naviora</div>
          </div>
        </footer>
      </div>
    </main>
  );
}

export function VCardPublicPageServer({ locale, id, profile }: VCardPublicPageServerProps) {
  if (!profile) {
    return <VCardMissingState locale={locale} id={id} />;
  }

  const socialLinks = (profile.socialLinks ?? [])
    .filter((item) => item.url.trim())
    .map((item) => ({
      ...item,
      href: resolveVCardSocialHref(item.platform, item.url),
      displayValue: getVCardSocialDisplayValue(item.platform, item.url),
      label: getVCardSocialLabel(item.platform, locale),
    }));
  const displayName =
    profile.fullName?.trim() ||
    (locale === "zh-Hant" ? "聯絡人名片" : locale === "zh-Hans" ? "联系人名片" : "Contact card");
  const avatarSrc = resolveVCardAvatarSrc(profile, id, displayName);
  const companyLine =
    [profile.title?.trim(), profile.company?.trim()].filter(Boolean).join(" / ") ||
    profile.company?.trim() ||
    profile.title?.trim() ||
    (locale === "zh-Hant" ? "聯絡名片" : locale === "zh-Hans" ? "联系人名片" : "Contact card");
  const contactCards = [
    profile.phone?.trim()
      ? {
          id: "phone",
          label: locale === "zh-Hant" ? "手機號碼" : locale === "zh-Hans" ? "手机号码" : "Mobile phone",
          value: profile.phone.trim(),
          href: `tel:${profile.phone.trim()}`,
          icon: Phone,
        }
      : null,
    profile.email?.trim()
      ? {
          id: "email",
          label: "Email",
          value: profile.email.trim(),
          href: `mailto:${profile.email.trim()}`,
          icon: Mail,
        }
      : null,
    profile.website?.trim()
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(90,188,245,0.16),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_50%,#f8f8ff_100%)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        <section className="w-full max-w-[760px]">
          <div className="flex flex-col items-center pt-4 sm:pt-8">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] ring-4 ring-white sm:h-28 sm:w-28">
              <Image src={avatarSrc} alt={displayName} fill priority sizes="112px" className="object-cover" />
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-[31px] font-semibold leading-tight tracking-tight text-slate-950 sm:text-[38px]">{displayName}</h1>
              <div className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-400 sm:text-[13px]">{companyLine}</div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <VCardPublicDownloadButton locale={locale} displayName={displayName} profile={profile} />

              {profile.phone?.trim() ? (
                <a
                  href={`tel:${profile.phone.trim()}`}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f6eefe] text-[#954da9] ring-1 ring-[rgba(148,77,169,0.12)] transition hover:bg-[#efe4fb]"
                  aria-label={locale === "zh-Hant" ? "撥打電話" : locale === "zh-Hans" ? "拨打电话" : "Call"}
                >
                  <Phone size={18} />
                </a>
              ) : null}

              {profile.email?.trim() ? (
                <a
                  href={`mailto:${profile.email.trim()}`}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f6eefe] text-[#954da9] ring-1 ring-[rgba(148,77,169,0.12)] transition hover:bg-[#efe4fb]"
                  aria-label="Email"
                >
                  <Mail size={18} />
                </a>
              ) : null}

              {profile.website?.trim() ? (
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
              <section className="space-y-3">
                <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {locale === "zh-Hant" ? "社交媒體與通訊" : locale === "zh-Hans" ? "社交媒体与通讯" : "Social & messaging"}
                </div>
                <div className="grid gap-3">
                  {socialLinks.map((item) => {
                    return (
                      <VCardSocialCard
                        key={`${item.platform}-${item.url}`}
                        displayValue={item.displayValue}
                        href={item.href}
                        label={item.label}
                        locale={locale}
                        platform={item.platform}
                        value={item.url}
                      />
                    );
                  })}
                </div>
              </section>
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

        <footer className="flex w-full max-w-[760px] justify-center pt-6">
          <div className="flex flex-col items-center justify-center gap-2 text-[11px] font-medium tracking-[0.04em] text-slate-400">
            <VCardPublicLanguageSwitcher locale={locale} id={id} tone="minimal" />
            <div>Powered by Naviora</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
