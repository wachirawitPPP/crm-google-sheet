export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { upsertObjectById } from "@/lib/sheet";

const SHEET2 = "Deals";

// helper รองรับทั้ง params แบบปกติ และแบบ Promise
async function getIdFromContext(ctx: any): Promise<string> {
  const maybePromise = ctx?.params;
  const params = typeof maybePromise?.then === "function" ? await maybePromise : maybePromise;
  const id = params?.id;
  if (!id || typeof id !== "string") {
    throw new Error("Invalid or missing route param: id");
  }
  return id;
}

export async function PATCH(req: NextRequest, ctx: any) {
  try {
    const id = await getIdFromContext(ctx);
    const body = await req.json();
    const now = new Date().toISOString();

    await upsertObjectById(SHEET2, "id", id, { ...body, id, updated_at: now });
    return NextResponse.json({ status: true });
  } catch (err: any) {
    return NextResponse.json(
      { status: false, message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
