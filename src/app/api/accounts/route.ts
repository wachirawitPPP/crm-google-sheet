import { NextRequest, NextResponse } from "next/server";
import { appendObject, readObjects } from "@/lib/sheet";
export const runtime = "nodejs";
const SHEET_AC = "Accounts";

export async function GET() {
  const rows = await readObjects(SHEET_AC);
  return NextResponse.json({ status: true, data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date().toISOString();
  const row = {
    id: body.id || `A-${Math.floor(Math.random() * 900 + 100)}`,
    name: body.name || "",
    tax_id: body.taxId || "",
    billing_address: body.billingAddress || "",
    contact_name: body.primaryContact?.name || body.contactName || "",
    contact_email: body.primaryContact?.email || body.contactEmail || "",
    contact_phone: body.primaryContact?.phone || body.contactPhone || "",
    created_at: now,
    updated_at: now,
  };
  await appendObject(SHEET_AC, row);
  return NextResponse.json({ status: true, data: row });
}
