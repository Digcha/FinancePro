import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Bitte /api/app/invoices/upload verwenden." }, { status: 410 });
}
