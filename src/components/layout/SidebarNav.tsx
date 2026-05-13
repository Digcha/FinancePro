"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  Landmark,
  Settings,
  ShieldCheck,
  UploadCloud,
  Users
} from "lucide-react";
import { cn } from "@/lib/format";
import { BrandLogo } from "./BrandLogo";

const appNavItems = [
  { href: "/app/inbox", label: "Eingang", icon: FileText },
  { href: "/app/upload", label: "Hochladen", icon: UploadCloud },
  { href: "/app/approvals", label: "Freigaben", icon: ShieldCheck },
  { href: "/app/exports", label: "Exporte", icon: Landmark },
  { href: "/app/vendors", label: "Lieferanten", icon: Building2 },
  { href: "/app/settings", label: "Einstellungen", icon: Settings }
];

const adminNavItems = [
  { href: "/admin", label: "Übersicht", icon: ShieldCheck },
  { href: "/admin/tenants", label: "Firmen", icon: Building2 },
  { href: "/admin/users", label: "Nutzer", icon: Users },
  { href: "/admin/licenses", label: "Lizenzen", icon: Landmark },
  { href: "/admin/usage", label: "Nutzung", icon: FileText },
  { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
  { href: "/admin/system", label: "System", icon: Settings }
];

export function SidebarNav({ variant = "app" }: { variant?: "app" | "admin" }) {
  const pathname = usePathname();
  const navItems = variant === "admin" ? adminNavItems : appNavItems;

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center overflow-hidden border-b border-ink-200 px-5">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-trust-50 text-trust-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-200 px-5 py-4 text-xs leading-5 text-ink-500">
        {variant === "admin" ? "Plattformverwaltung mit Auditpflicht für Kundendaten." : "Menschliche Freigabe bleibt Pflicht."}
      </div>
    </aside>
  );
}
