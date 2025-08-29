import { NextRequest, NextResponse } from "next/server";
import { appendObject } from "@/lib/sheet";
export const runtime = "nodejs";
const SHEET_Q = "Quotes";
const SHEET_QI = "QuoteItems";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = body.id || `Q-${Math.floor(Math.random() * 90000 + 10000)}`;
  const now = new Date().toISOString();

  const qRow = {
    id,
    deal_id: body.deal_id || body.forDealId || "",
    discount_pct: String(body.discountPct ?? body.discount_pct ?? 0),
    vat_pct: String(body.vatPct ?? body.vat_pct ?? 7),
    notes: body.notes || "",
    subtotal: String(body.subtotal ?? 0),
    discount: String(body.discount ?? 0),
    before_vat: String(body.beforeVat ?? 0),
    vat: String(body.vat ?? 0),
    total: String(body.total ?? 0),
    created_at: now,
  };
  await appendObject(SHEET_Q, qRow);

  const items: any[] = body.items || [];
  let line = 1;
  for (const it of items) {
    await appendObject(SHEET_QI, {
      quote_id: id,
      line_no: String(line++),
      sku: it.sku || "",
      name: it.name || "",
      price: String(it.price ?? 0),
      qty: String(it.qty ?? 1),
      subtotal: String((Number(it.price ?? 0)) * (Number(it.qty ?? 1))),
    });
  }

  return NextResponse.json({ status: true, data: { id } });
}