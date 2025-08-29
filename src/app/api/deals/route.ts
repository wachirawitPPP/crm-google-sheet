import { NextRequest, NextResponse } from "next/server";
import { appendObject, readObjects, upsertObjectById } from "@/lib/sheet";
export const runtime = "nodejs";
const SHEET = "Deals"; // tab name

export async function GET() {
  const rows = await readObjects(SHEET);
  return NextResponse.json({ status: true, data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date().toISOString();
  const row = {
    id: body.id || `D-${Math.floor(Math.random() * 9000 + 1000)}`,
    title: body.title || "",
    account_id: body.account_id || "",
    account_name: body.account || "",
    owner: body.owner || "",
    value: String(body.value ?? ""),
    source: body.source || "",
    close_date: body.closeDate || "",
    stage: body.stage || "lead",
    created_at: now,
    updated_at: now,
  };
  await appendObject(SHEET, row);
  return NextResponse.json({ status: true, data: row });
}