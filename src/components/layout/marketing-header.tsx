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
      <AppLogo href={withLocale(locale, "/")} subtitle="AI Dynamic QR Workspace" />
      <nav className="hidden items-center gap-2 md:flex">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button variant="ghost">{item.label}</Button>
          </Link>
        ))}
        <Link href={withLocale(locale, "/login")}>
          <Button variant="ghost">{t.nav.login}</Button>
        </Link>
        <Link href={withLocale(locale, "/register")}>
          <Button>{t.nav.register}</Button>
        </Link>
      </nav>
    </header>
  );
}
