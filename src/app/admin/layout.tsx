import { AppShell } from "@/components/layout/AppShell";
import { requireSuperAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();
  return (
    <AppShell session={session} variant="admin">
      {children}
    </AppShell>
  );
}
