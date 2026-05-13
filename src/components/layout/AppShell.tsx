import { SidebarNav } from "./SidebarNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <SidebarNav />
      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
