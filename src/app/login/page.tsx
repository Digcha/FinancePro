import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session && !session.mustChangePassword) {
    redirect(session.isSuperAdmin ? "/admin" : "/app/inbox");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-ink-200 bg-white p-6 shadow-panel">
        <BrandLogo />
        <h1 className="mt-8 text-xl font-semibold text-ink-900">FinancePro Login</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          Melden Sie sich mit den vom FinancePro-Betreiber vergebenen Zugangsdaten an.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
