import Link from "next/link";

import { AppLogo } from "@/components/shared/app-logo";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { withLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

interface MarketingHeaderProps {
  locale: Locale;
}

export function MarketingHeader({ locale }: MarketingHeaderProps) {
  const t = getMessages(locale);
  const links = [
    { href: "#why-zaps", label: t.home.navLinks[0] },
    { href: "#capabilities", label: t.home.navLinks[1] },
  ];

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-6 md:px-8">
      {/* 左侧 Logo */}
      <div className="flex-1 min-w-0">
        <AppLogo href={withLocale(locale, "/")} subtitle="AI Dynamic QR Workspace" />
      </div>
      {/* 中间菜单：产品价值、核心能力 */}
      <nav className="hidden flex-1 justify-center items-center gap-2 md:flex">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button variant="ghost">{item.label}</Button>
          </Link>
        ))}
      </nav>
      {/* 右侧 登录/注册 */}
      <div className="flex-1 flex justify-end items-center gap-2">
        <Link href={withLocale(locale, "/login")}> 
          <Button variant="ghost">{t.nav.login}</Button>
        </Link>
        <Link href={withLocale(locale, "/register")}> 
          <Button>{t.nav.register}</Button>
        </Link>
      </div>
    </header>
  );
}
