import { AppHeader } from "@/components/layout/AppHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { UploadDropzone } from "@/components/upload/UploadDropzone";

export default function UploadPage() {
  return (
    <>
      <AppHeader title="Upload" subtitle="PDF, Scan oder Foto als einzelne Rechnung oder Mehrseiten-Gruppe" />
      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_360px] lg:p-8">
        <UploadDropzone />
        <Panel>
          <PanelHeader title="Qualitätsprüfung" />
          <div className="space-y-3 p-5 text-sm leading-6 text-ink-600">
            <div className="rounded-md border border-ink-200 bg-ink-50 p-3">
              Schärfe, Vollständigkeit und Perspektive werden je Seite bewertet.
            </div>
            <div className="rounded-md border border-ink-200 bg-ink-50 p-3">
              Bei Mehrseiten-Uploads wird die erkannte Seitengruppe als ein Beleg angelegt.
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              Ohne OPENAI_API_KEY laeuft die Analyse stabil im Mock-Modus und wird im UI sichtbar markiert.
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
