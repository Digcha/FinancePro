import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ error: "Bitte /api/app/invoices/[id]/fields verwenden." }, { status: 410 });
}
