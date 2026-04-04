import { redirect } from "next/navigation";

/**
 * Catch-all route for paths without locale prefix
 * This serves as a fallback when middleware rewrite doesn't work
 * 
 * Redirects to /en/... version of the requested path
 * Examples:
 * /pricing → /en/pricing
 * /about/team → /en/about/team
 */
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  
  // Redirect to English version
  redirect(`/en${path}`);
}
