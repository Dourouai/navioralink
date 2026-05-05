import Link from "next/link";
import { cookies, headers } from "next/headers";

import { VCardPublicLanguageSwitcher } from "@/features/vcard/vcard-public-language-switcher";
import { localePreferenceCookieName, resolveLocalePreference, type Locale } from "@/i18n/config";

function getHomeHref(locale: Locale) {
  const base = "https://www.naviora.link";

  if (locale === "en") {
    return `${base}/`;
  }

  return `${base}/${locale}`;
}

function getCopy(locale: Locale) {
  if (locale === "zh-Hant") {
    return {
      badge: "404 · 找不到這個入口",
      title: "這個公開入口目前無法使用",
      description: "連結可能尚未發布、已被歸檔、已過期，或分享網址不正確。",
      supporting: "請重新確認分享連結，或聯絡建立這個入口的人重新取得可用網址。",
      primaryLabel: "返回首頁",
      primaryHref: getHomeHref(locale),
    };
  }

  if (locale === "zh-Hans") {
    return {
      badge: "404 · 找不到这个入口",
      title: "这个公开入口当前不可用",
      description: "链接可能尚未发布、已被归档、已过期，或分享网址不正确。",
      supporting: "请重新确认分享链接，或联系创建这个入口的人重新获取可用网址。",
      primaryLabel: "返回首页",
      primaryHref: getHomeHref(locale),
    };
  }

  return {
    badge: "404 · Entry not found",
    title: "This public entry is unavailable",
    description: "The link may not be published yet, may have been archived, may have expired, or the shared URL may be incorrect.",
    supporting: "Please check the shared URL again or ask the person who created it for a working link.",
    primaryLabel: "Back to homepage",
    primaryHref: getHomeHref(locale),
  };
}

export default async function NotFound() {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const locale = resolveLocalePreference({
    cookieLocale: cookieStore.get(localePreferenceCookieName)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
  const copy = getCopy(locale);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "28px",
        background:
          "radial-gradient(circle at top left, rgba(73, 180, 255, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(255, 171, 87, 0.18), transparent 24%), linear-gradient(180deg, #eef7ff 0%, #f8fbff 100%)",
        color: "#10233f",
        fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
      }}
    >
      <section style={{ width: "min(720px, 100%)", minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "32px",
              padding: "36px",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(175, 205, 232, 0.7)",
              boxShadow: "0 32px 60px rgba(28, 62, 105, 0.12)",
              width: "100%",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at top right, rgba(79, 154, 255, 0.12), transparent 28%), radial-gradient(circle at bottom left, rgba(255, 172, 92, 0.12), transparent 32%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#1f5f95",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #1ea7ff, #ff9c43)",
                    boxShadow: "0 0 0 6px rgba(30, 167, 255, 0.14)",
                  }}
                />
                <span>Naviora</span>
              </div>

              <div
                style={{
                  marginTop: "22px",
                  display: "inline-flex",
                  borderRadius: "999px",
                  padding: "10px 14px",
                  background: "rgba(245, 249, 255, 0.95)",
                  border: "1px solid rgba(186, 211, 236, 0.8)",
                  color: "#1b6aa8",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {copy.badge}
              </div>

              <h1
                style={{
                  margin: "22px 0 14px",
                  fontSize: "clamp(34px, 5vw, 52px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.04em",
                }}
              >
                {copy.title}
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#4e6480",
                  fontSize: "17px",
                  lineHeight: 1.7,
                }}
              >
                {copy.description}
              </p>

              <p
                style={{
                  marginTop: "14px",
                  marginBottom: 0,
                  color: "#4e6480",
                  fontSize: "17px",
                  lineHeight: 1.7,
                }}
              >
                {copy.supporting}
              </p>

              <div style={{ marginTop: "28px" }}>
                <Link
                  href={copy.primaryHref}
                  style={{
                    display: "inline-flex",
                    minHeight: "52px",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 22px",
                    borderRadius: "999px",
                    background: "linear-gradient(135deg, #0f7adf, #27a7f7)",
                    color: "#fff",
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 18px 36px rgba(15, 122, 223, 0.24)",
                  }}
                >
                  {copy.primaryLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <footer
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              color: "#8aa0bf",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <VCardPublicLanguageSwitcher locale={locale} tone="minimal" />
            <div>Powered by Naviora</div>
          </div>
        </footer>
      </section>
    </main>
  );
}
