// src/app/api/deals/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { upsertObjectById } from "@/lib/sheet";

const SHEET = "Deals";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const now = new Date().toISOString();

    await upsertObjectById(SHEET, "id", id, { ...body, id, updated_at: now });

    return NextResponse.json({ status: true });
  } catch (e: any) {
    return NextResponse.json(
      { status: false, message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
