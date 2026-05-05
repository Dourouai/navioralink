import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { MediaLibraryPanel } from "@/features/assets/media-library-panel";
import type { Locale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/metadata";
import { getManagedAssetsServer } from "@/lib/supabase/assets-server";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "files");
}

export default async function FilesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const assets = await getManagedAssetsServer();

  const badge = locale === "zh-Hant" ? "文件中心" : locale === "zh-Hans" ? "文件中心" : "Files";
  const title = locale === "zh-Hant" ? "媒體檔案" : locale === "zh-Hans" ? "媒体文件" : "Media files";
  const description =
    locale === "zh-Hant"
      ? "集中管理工作台裡的圖片與 PDF。頭像、Logo 和後續更多公開內容，都會優先從這裡選取。"
      : locale === "zh-Hans"
        ? "集中管理工作台里的图片与 PDF。头像、Logo 和后续更多公开内容，都会优先从这里选取。"
        : "Manage images and PDFs in one place. Avatar, logo, and future public content will all pick from this library first.";

  return (
    <div className="space-y-6">
      <PageHeader badge={badge} title={title} description={description} />
      <MediaLibraryPanel locale={locale} initialAssets={assets} acceptKind="all" selectionMode="manage" />
    </div>
  );
}
