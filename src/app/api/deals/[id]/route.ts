import { NextRequest, NextResponse } from "next/server";
import { upsertObjectById } from "@/lib/sheet";
export const runtime = "nodejs";
const SHEET2 = "Deals";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await req.json();
  const now = new Date().toISOString();
  await upsertObjectById(SHEET2, "id", id, { ...body, id, updated_at: now });
  return NextResponse.json({ status: true });
}