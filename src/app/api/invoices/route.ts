import { NextResponse } from "next/server";
import { getInvoices } from "@/server/repositories/invoiceRepository";

export async function GET() {
  const invoices = await getInvoices();
  return NextResponse.json({ invoices });
}
