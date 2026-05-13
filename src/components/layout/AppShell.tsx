import { SidebarNav } from "./SidebarNav";
import type { AppSession } from "@/lib/auth/session";

export function AppShell({
  children,
  session,
  variant = "app"
}: {
  children: React.ReactNode;
  session: AppSession;
  variant?: "app" | "admin";
}) {
  return (
    <div className="min-h-screen bg-ink-50">
      <SidebarNav variant={variant} />
      <div className="lg:hidden border-b border-ink-200 bg-white px-4 py-3 text-sm text-ink-600">
        {session.tenantName ?? "FinancePro"} · {session.displayName}
      </div>
      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
