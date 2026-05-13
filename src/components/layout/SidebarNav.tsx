"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Landmark,
  Settings,
  UploadCloud
} from "lucide-react";
import { cn } from "@/lib/format";
import { BrandLogo } from "./BrandLogo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/upload", label: "Upload", icon: UploadCloud },
  { href: "/invoices", label: "Rechnungen", icon: FileText },
  { href: "/exports", label: "Exporte", icon: Landmark },
  { href: "/settings", label: "Einstellungen", icon: Settings }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center overflow-hidden border-b border-ink-200 px-5">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
        Menschliche Freigabe bleibt Pflicht. Keine Steuerberatung, keine Betrugsbehauptung.
      </div>
    </aside>
  );
}
