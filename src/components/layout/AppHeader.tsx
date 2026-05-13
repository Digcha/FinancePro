import Link from "next/link";
import { LogOut, UploadCloud } from "lucide-react";
import type { AppSession } from "@/lib/auth/session";
import { BrandLogo } from "./BrandLogo";

export function AppHeader({
  title,
  subtitle,
  session,
  showUpload = true
}: {
  title: string;
  subtitle?: string;
  session?: AppSession;
  showUpload?: boolean;
}) {
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
        <div className="flex items-center gap-3">
          {session ? (
            <div className="hidden text-right text-xs leading-5 text-ink-500 sm:block">
              <div className="font-medium text-ink-800">{session.tenantName ?? "FinancePro"}</div>
              <div>
                {session.username} · {session.role}
              </div>
            </div>
          ) : null}
          {showUpload ? (
            <Link
              href="/app/upload"
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800"
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Hochladen
            </Link>
          ) : null}
          {session ? (
            <Link
              href="/logout"
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
