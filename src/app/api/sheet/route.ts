// app/api/sheet/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
const GAS_URL = process.env.GAS_URL!;

export async function GET() {
  if (!GAS_URL) {
    return NextResponse.json({ status: false, message: "GAS_URL not set" }, { status: 500 });
  }
  const res = await fetch(GAS_URL, { method: "GET", cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ status: false, message: `GAS GET failed: ${text}` }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!GAS_URL) {
    return NextResponse.json({ status: false, message: "GAS_URL not set" }, { status: 500 });
  }
  const body = await req.json();
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ status: false, message: `GAS POST failed: ${text}` }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
