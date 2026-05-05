import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VCardPublicPage } from "@/features/vcard/vcard-public-page";
import type { Locale } from "@/i18n/config";
import { resolvePublicVCardProfileByContentId } from "@/lib/supabase/public-vcard-server";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ preview_token?: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const { preview_token } = await searchParams;
  const profile = await resolvePublicVCardProfileByContentId(id, { previewToken: preview_token });

  if (!profile) {
    return {
      title:
        locale === "zh-Hant"
          ? "內容已遺失 | Naviora"
          : locale === "zh-Hans"
            ? "内容已丢失 | Naviora"
            : "Content missing | Naviora",
      description:
        locale === "zh-Hant"
          ? "這個內容頁目前找不到對應資料，可能尚未發布、已刪除或同步失敗。"
          : locale === "zh-Hans"
            ? "这个内容页当前找不到对应数据，可能尚未发布、已删除或同步失败。"
            : "This content page could not be found. It may not be published yet, may have been deleted, or may have failed to sync.",
    };
  }

  return {
    title: locale === "zh-Hant" ? "聯絡名片 | Naviora" : locale === "zh-Hans" ? "联系人名片 | Naviora" : "Contact card | Naviora",
    description:
      locale === "zh-Hant"
        ? "透過 Naviora 智能入口承接的聯絡名片頁。"
        : locale === "zh-Hans"
          ? "通过 Naviora 智能入口承接的联系人名片页。"
          : "A contact card page delivered through a Naviora smart entry.",
  };
}

export default async function VCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ preview_token?: string }>;
}) {
  const { locale, id } = await params;
  const { preview_token } = await searchParams;
  const initialProfile = await resolvePublicVCardProfileByContentId(id, { previewToken: preview_token });

  if (!initialProfile) {
    notFound();
  }

  return <VCardPublicPage locale={locale} id={id} initialProfile={initialProfile} />;
}
