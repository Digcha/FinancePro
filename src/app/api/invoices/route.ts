import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Bitte /api/app/invoices verwenden." }, { status: 410 });
}
