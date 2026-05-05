import { Globe, Mail, Phone } from "lucide-react";
import type { CSSProperties } from "react";

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

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(90,188,245,0.16), transparent 26%), linear-gradient(180deg,#f8fbff 0%,#eef4ff 50%,#f8f8ff 100%)",
  padding: "40px 16px",
};

const shellStyle: CSSProperties = {
  maxWidth: "760px",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "24px",
};

const sectionStyle: CSSProperties = {
  width: "100%",
};

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

function PublicFooter({ locale }: { locale: Locale }) {
  return (
    <footer style={{ display: "flex", width: "100%", justifyContent: "center", paddingTop: "8px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "#94a3b8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>
        <VCardPublicLanguageSwitcher locale={locale} tone="minimal" />
        <div>Powered by Naviora</div>
      </div>
    </footer>
  );
}

function VCardMissingState({ locale, id }: { locale: Locale; id: string }) {
  void id;
  const copy = getMissingCopy(locale);

  return (
    <main style={pageStyle}>
      <div style={{ ...shellStyle, minHeight: "calc(100vh - 80px)", gap: 0 }}>
        <div style={{ ...sectionStyle, flex: 1, display: "flex", alignItems: "center" }}>
          <div
            style={{
              ...sectionStyle,
              position: "relative",
              overflow: "hidden",
              borderRadius: "34px",
              border: "1px solid rgba(190,206,226,0.55)",
              background: "rgba(255,255,255,0.94)",
              padding: "32px",
              boxShadow: "0 24px 50px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ position: "absolute", right: "-40px", top: "-32px", width: "128px", height: "128px", borderRadius: "999px", background: "radial-gradient(circle, rgba(141,121,255,0.22), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: "-40px", bottom: 0, width: "144px", height: "144px", borderRadius: "999px", background: "radial-gradient(circle, rgba(26,190,243,0.16), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "999px", border: "1px solid rgba(175,205,232,0.7)", background: "#f6fbff", padding: "8px 16px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0369a1" }}>
                <span style={{ display: "inline-flex", width: "10px", height: "10px", borderRadius: "999px", background: "linear-gradient(135deg,#1ea7ff,#ff9c43)" }} />
                {copy.badge}
              </div>
              <h1 style={{ margin: "24px 0 0", textWrap: "balance", fontSize: "clamp(34px, 8vw, 52px)", lineHeight: 1.02, letterSpacing: "-0.05em", color: "#020617" }}>{copy.title}</h1>
              <p style={{ marginTop: "16px", fontSize: "18px", lineHeight: 1.8, color: "#475569" }}>{copy.description}</p>
              <p style={{ marginTop: "12px", fontSize: "16px", lineHeight: 1.75, color: "#64748b" }}>{copy.supporting}</p>
              <div style={{ marginTop: "32px", display: "flex", flexWrap: "wrap", gap: "16px" }}>
                <a
                  href={getAppHomeHref(locale)}
                  style={{
                    display: "inline-flex",
                    minHeight: "52px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg,#0f7adf,#27a7f7)",
                    padding: "0 24px",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 700,
                    boxShadow: "0 18px 36px rgba(15,122,223,0.24)",
                  }}
                >
                  {copy.primaryLabel}
                </a>
              </div>
              <div style={{ marginTop: "32px", borderRadius: "24px", border: "1px solid rgba(190,206,226,0.55)", background: "#f8fbff", padding: "16px 20px", fontSize: "14px", lineHeight: 1.7, color: "#64748b" }}>
                {copy.secondary}
              </div>
            </div>
          </div>
        </div>
        <PublicFooter locale={locale} />
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
    <main style={pageStyle}>
      <div style={{ ...shellStyle, maxWidth: "980px" }}>
        <section style={{ ...sectionStyle, maxWidth: "760px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "16px" }}>
            <div
              style={{
                position: "relative",
                width: "112px",
                height: "112px",
                overflow: "hidden",
                borderRadius: "999px",
                background: "#fff",
                boxShadow: "0 18px 40px rgba(15,23,42,0.14)",
                outline: "4px solid #fff",
              }}
            >
              <img src={avatarSrc} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <h1 style={{ margin: 0, fontSize: "clamp(31px, 7vw, 38px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#020617" }}>
                {displayName}
              </h1>
              <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94a3b8" }}>{companyLine}</div>
            </div>

            <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px" }}>
              <VCardPublicDownloadButton locale={locale} displayName={displayName} profile={profile} />

              {profile.phone?.trim() ? (
                <a
                  href={`tel:${profile.phone.trim()}`}
                  aria-label={locale === "zh-Hant" ? "撥打電話" : locale === "zh-Hans" ? "拨打电话" : "Call"}
                  style={{
                    display: "inline-flex",
                    height: "48px",
                    width: "48px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "#f6eefe",
                    color: "#954da9",
                    boxShadow: "inset 0 0 0 1px rgba(148,77,169,0.12)",
                    textDecoration: "none",
                  }}
                >
                  <Phone size={18} />
                </a>
              ) : null}

              {profile.email?.trim() ? (
                <a
                  href={`mailto:${profile.email.trim()}`}
                  aria-label="Email"
                  style={{
                    display: "inline-flex",
                    height: "48px",
                    width: "48px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "#f6eefe",
                    color: "#954da9",
                    boxShadow: "inset 0 0 0 1px rgba(148,77,169,0.12)",
                    textDecoration: "none",
                  }}
                >
                  <Mail size={18} />
                </a>
              ) : null}

              {profile.website?.trim() ? (
                <a
                  href={profile.website.trim()}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={locale === "zh-Hant" ? "開啟網站" : locale === "zh-Hans" ? "打开网站" : "Open website"}
                  style={{
                    display: "inline-flex",
                    height: "48px",
                    width: "48px",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "#f6eefe",
                    color: "#954da9",
                    boxShadow: "inset 0 0 0 1px rgba(148,77,169,0.12)",
                    textDecoration: "none",
                  }}
                >
                  <Globe size={18} />
                </a>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: "48px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {socialLinks.length ? (
              <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ padding: "0 4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#94a3b8" }}>
                  {locale === "zh-Hant" ? "社交媒體與通訊" : locale === "zh-Hans" ? "社交媒体与通讯" : "Social & messaging"}
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  {socialLinks.map((item) => (
                    <VCardSocialCard
                      key={`${item.platform}-${item.url}`}
                      displayValue={item.displayValue}
                      href={item.href}
                      label={item.label}
                      locale={locale}
                      platform={item.platform}
                      value={item.url}
                    />
                  ))}
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
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    borderRadius: "28px",
                    border: "1px solid rgba(190,206,226,0.55)",
                    background: "rgba(255,255,255,0.94)",
                    padding: "24px",
                    boxShadow: "0 18px 44px rgba(15,23,42,0.06)",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ display: "inline-flex", height: "48px", width: "48px", flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "16px", background: "#f6eefe", color: "#954da9" }}>
                    <Icon size={19} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8" }}>{item.label}</div>
                    <div style={{ marginTop: "8px", overflowWrap: "anywhere", fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>{item.value}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <PublicFooter locale={locale} />
      </div>
    </main>
  );
}
