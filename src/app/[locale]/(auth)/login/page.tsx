import { AuthForm } from "@/features/auth/auth-form";
import type { Locale } from "@/i18n/config";

export default async function LoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <AuthForm locale={locale} mode="login" />
    </div>
  );
}
