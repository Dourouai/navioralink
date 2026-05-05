import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { QRDraftFromAI } from "@/types/ai";
import type { QRDesign, QRStatus } from "@/types/qr";
import { mapPlanConstraintMessage } from "@/lib/billing/plan-entitlements";
import { getDashboardStatsTag, getEntriesListTag, getEntryAnalyticsCollectionTag, getEntryAnalyticsTag, getEntryDetailTag } from "@/lib/cache-tags";
import { hashEntryPassword } from "@/lib/entry-password";
import { invalidateEntryPreviewLinks } from "@/lib/supabase/entry-preview-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildRuleSavePayload } from "@/lib/supabase/entries-save-shared";
import { buildEntryInsertPayload } from "@/lib/supabase/entries-shared";

export const runtime = "nodejs";

const bodySchema = z.object({
  draft: z.custom<QRDraftFromAI>(),
  design: z.custom<QRDesign>(),
  status: z.custom<QRStatus>(),
  existingId: z.string().uuid().optional(),
});

function mapSaveErrorMessage(message: string) {
  if (/sign in first/i.test(message)) {
    return "Your sign-in session has expired. Please sign in again and then save.";
  }

  return mapPlanConstraintMessage(message);
}

function localizedPath(locale: "en" | "zh-Hans" | "zh-Hant", path: string) {
  if (locale === "en") {
    return path;
  }

  return `/${locale}${path}`;
}

function revalidateEntryPages(entryId: string) {
  const locales = ["en", "zh-Hans", "zh-Hant"] as const;

  for (const locale of locales) {
    revalidatePath(localizedPath(locale, "/dashboard"));
    revalidatePath(localizedPath(locale, "/qrs"));
    revalidatePath(localizedPath(locale, "/qrs/archived"));
    revalidatePath(localizedPath(locale, `/qrs/${entryId}`));
    revalidatePath(localizedPath(locale, `/qrs/${entryId}/analytics`));
    revalidatePath(localizedPath(locale, `/qrs/${entryId}/visits`));
  }
}

function revalidateEntryCaches(userId: string, entryId: string) {
  revalidateTag(getEntriesListTag(userId), "max");
  revalidateTag(getDashboardStatsTag(userId), "max");
  revalidateTag(getEntryAnalyticsCollectionTag(userId), "max");
  revalidateTag(getEntryDetailTag(entryId), "max");
  revalidateTag(getEntryAnalyticsTag(entryId), "max");
}

export async function POST(request: NextRequest) {
  try {
    const payload = bodySchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        {
          message: mapSaveErrorMessage(userError.message),
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          message: "Your sign-in session has expired. Please sign in again and then save.",
        },
        { status: 401 },
      );
    }

    let passwordHash: string | null = null;
    let lockedTargetType: string | null = null;
    let lockedPathPrefix: string | null = null;

    if (payload.existingId) {
      const { data: existingEntry, error: existingEntryError } = await supabase
        .from("entries")
        .select("password_hash, target_type, path_prefix")
        .eq("id", payload.existingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingEntryError) {
        return NextResponse.json(
          {
            message: mapSaveErrorMessage(existingEntryError.message),
          },
          { status: 400 },
        );
      }

      lockedTargetType = existingEntry?.target_type ?? null;
      lockedPathPrefix = existingEntry?.path_prefix ?? null;

      if (lockedTargetType && payload.draft.targetType && payload.draft.targetType !== lockedTargetType) {
        return NextResponse.json(
          {
            message: "Saved entries cannot change target type. Create a new entry if you need another type.",
          },
          { status: 400 },
        );
      }

      if (payload.draft.passwordConfigured && !payload.draft.password?.trim()) {
        passwordHash = existingEntry?.password_hash ?? null;
      }
    }

    if (payload.draft.password?.trim()) {
      passwordHash = hashEntryPassword(payload.draft.password) ?? null;
    }

    const effectiveDraft: QRDraftFromAI =
      lockedTargetType && payload.existingId
        ? {
            ...payload.draft,
            targetType: lockedTargetType as QRDraftFromAI["targetType"],
          }
        : payload.draft;

    const entryPayload = buildEntryInsertPayload({
      userId: user.id,
      draft: effectiveDraft,
      design: payload.design,
      status: payload.status,
      pathPrefix: lockedPathPrefix,
      passwordHash,
    });
    const { ruleTargets, rules } = buildRuleSavePayload(effectiveDraft, entryPayload.target_type);
    const { data, error } = await supabase.rpc("save_entry_bundle", {
      p_existing_id: payload.existingId ?? null,
      p_path_prefix: entryPayload.path_prefix,
      p_slug: payload.existingId ? null : entryPayload.slug,
      p_name: entryPayload.name,
      p_status: entryPayload.status,
      p_target_type: entryPayload.target_type,
      p_rule_mode: entryPayload.rule_mode,
      p_tracking_enabled: entryPayload.tracking_enabled,
      p_ga4_measurement_id: entryPayload.ga4_measurement_id,
      p_meta_pixel_id: entryPayload.meta_pixel_id,
      p_password_hash: entryPayload.password_hash,
      p_expires_at: entryPayload.expires_at,
      p_folder_id: entryPayload.folder_id,
      p_design: entryPayload.design ?? {},
      p_default_target: entryPayload.defaultTarget,
      p_rule_targets: ruleTargets,
      p_rules: rules,
    });

    if (error) {
      return NextResponse.json(
        {
          message: mapSaveErrorMessage(error.message),
        },
        { status: /sign in first/i.test(error.message) ? 401 : 400 },
      );
    }

    const savedEntryId = (data as { entry?: { id?: string } } | null)?.entry?.id;
    const savedEntryStatus = (data as { entry?: { status?: QRStatus } } | null)?.entry?.status;

    if (savedEntryId) {
      revalidateEntryPages(savedEntryId);
      revalidateEntryCaches(user.id, savedEntryId);
    }

    if (savedEntryId && savedEntryStatus && savedEntryStatus !== "draft") {
      await invalidateEntryPreviewLinks(savedEntryId).catch(() => undefined);
    }

    return NextResponse.json({
      savedBundle: data ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Please provide a valid entry payload before saving.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to save this entry.",
      },
      { status: 500 },
    );
  }
}
