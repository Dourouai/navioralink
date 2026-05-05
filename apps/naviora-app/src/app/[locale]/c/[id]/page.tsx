import { redirect } from "next/navigation";

export default async function LegacyVCardContentRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale, id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const nextSearchParams = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string" && value.trim()) {
      nextSearchParams.set(key, value);
    }
  });

  const query = nextSearchParams.toString();
  redirect(`/${locale}/card/${encodeURIComponent(id)}${query ? `?${query}` : ""}`);
}
