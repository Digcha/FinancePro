import { AppHeader } from "@/components/layout/AppHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth/session";
import { vendorService } from "@/lib/vendors/vendor-service";

export default async function VendorsPage() {
  const session = await requireUser();
  const vendors = session.tenantId ? await vendorService.getTenantVendors(session.tenantId) : [];

  return (
    <>
      <AppHeader title="Lieferanten" subtitle="Lieferantenstamm der eigenen Firma" session={session} />
      <div className="p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="bg-ink-50 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">UID</th>
                <th className="px-5 py-3 text-left">IBAN</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Letzte Rechnung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td className="px-5 py-4 font-medium text-ink-900">{vendor.name}</td>
                  <td className="px-5 py-4 text-ink-600">{vendor.uidNumber ?? "—"}</td>
                  <td className="px-5 py-4 text-ink-600">{vendor.iban ?? "—"}</td>
                  <td className="px-5 py-4">
                    <StatusPill tone={vendor.trustStatus === "trusted" ? "success" : "warning"}>{vendor.trustStatus}</StatusPill>
                  </td>
                  <td className="px-5 py-4 text-ink-500">{formatDate(vendor.lastInvoiceAt)}</td>
                </tr>
              ))}
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-500">Noch keine Lieferanten erkannt.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
