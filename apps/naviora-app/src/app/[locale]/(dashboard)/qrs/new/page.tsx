import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { buildPageMetadata } from "@/lib/metadata";
import { QrCreateFlow } from "@/features/qr-create/qr-create-flow";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale, "qrsNew");
}

function getEditPageCopy(locale: Locale) {
  if (locale === "zh-Hant") {
    return {
      badge: "編輯智能入口",
      title: "編輯智能入口",
      description: "更新現有入口、規則與二維碼設計。",
    };
  }

  if (locale === "zh-Hans") {
    return {
      badge: "编辑智能入口",
      title: "编辑智能入口",
      description: "更新现有入口、规则与二维码设计。",
    };
  }

  return {
    badge: "Edit Entry",
    title: "Edit Entry",
    description: "Update the current entry, routing, and QR design.",
  };
}

function getCreateBadge(locale: Locale) {
  if (locale === "zh-Hant") return "创建智能入口";
  if (locale === "zh-Hans") return "创建智能入口";
  return "Create Entry";
}

export default async function NewQrPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { locale } = await params;
  const { edit } = await searchParams;
  const t = getMessages(locale);
  const isEditing = Boolean(edit?.trim());
  const editCopy = getEditPageCopy(locale);

  return (
    <div className="space-y-6">
      <PageHeader
        badge={isEditing ? editCopy.badge : getCreateBadge(locale)}
        title={isEditing ? editCopy.title : t.create.title}
        description={isEditing ? editCopy.description : t.create.subtitle}
      />
      <QrCreateFlow locale={locale} editEntryId={edit?.trim() || undefined} />
    </div>
  );
}
