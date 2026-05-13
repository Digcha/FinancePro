import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 lg:hidden">
            <BrandLogo compact />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
            {subtitle ? <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p> : null}
          </div>
        </div>
        <Link
          href="/upload"
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800"
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          Upload
        </Link>
      </div>
    </header>
  );
}
