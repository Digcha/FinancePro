import { AppHeader } from "@/components/layout/AppHeader";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { requireUser } from "@/lib/auth/session";
import { canUploadInvoice } from "@/lib/auth/permissions";

export default async function AppUploadPage() {
  const session = await requireUser();
  const allowed = canUploadInvoice(session);

  return (
    <>
      <AppHeader title="Hochladen" subtitle="PDF, JPG oder PNG in den Firmen-Eingang übernehmen" session={session} showUpload={false} />
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_360px] lg:p-8">
        {allowed ? (
          <UploadDropzone />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Ihre Rolle ist lesend. Uploads sind für Buchhaltung oder Firmen-Admin reserviert.
          </div>
        )}
        <aside className="rounded-lg border border-ink-200 bg-white p-5 text-sm leading-6 text-ink-600 shadow-panel">
          <h2 className="font-semibold text-ink-900">Nach dem Upload</h2>
          <p className="mt-2">FinancePro speichert die Datei im Firmenordner, liest die Rechnung und legt offene Punkte in den Eingang.</p>
        </aside>
      </div>
    </>
  );
}
