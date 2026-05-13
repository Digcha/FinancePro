import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-ink-200 bg-white p-6 shadow-panel">
        <BrandLogo />
        <h1 className="mt-8 text-xl font-semibold text-ink-900">Passwort ändern</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">
          {session.mustChangePassword
            ? "Bitte setzen Sie vor der ersten Nutzung ein eigenes Passwort."
            : "Aktualisieren Sie Ihr Passwort."}
        </p>
        <div className="mt-6">
          <ChangePasswordForm mustChangePassword={session.mustChangePassword} />
        </div>
      </section>
    </main>
  );
}
