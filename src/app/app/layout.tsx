import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function TenantAppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();

  return (
    <AppShell session={session} variant="app">
      {children}
    </AppShell>
  );
}
