import { redirect } from "next/navigation";

interface LegacyInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyInvoicePage({ params }: LegacyInvoicePageProps) {
  const { id } = await params;
  redirect(`/app/invoices/${id}`);
}
