import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Bitte /api/app/invoices/[id]/reanalyze verwenden." }, { status: 410 });
}
