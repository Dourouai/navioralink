import type { Metadata } from "next";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { HomePageContent } from "@/features/marketing/home-page-content";
import { buildPageMetadata } from "@/lib/metadata";

// Always serve English on the root path
export const metadata: Metadata = buildPageMetadata("en", "home");

export default function RootPage() {
  const locale = "en" as const;

  return (
    <div className="min-h-screen">
      <MarketingHeader locale={locale} />
      <main>
        <HomePageContent locale={locale} />
      </main>
      <MarketingFooter locale={locale} />
    </div>
  );
}
