"use client";

import { useEffect, useState } from "react";

type Row = { name: string; email: string; message: string; timestamp?: string };

export default function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<Row>({
    name: "",
    email: "",
    message: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheet", { cache: "no-store" });
      const data = await res.json();
      if (data?.status) setRows(data.data || []);
      else setError(data?.message || "โหลดข้อมูลไม่สำเร็จ");
    } catch (e: any) {
      setError(e?.message ?? "เกิดข้อผิดพลาดขณะดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!form.name || !form.email) {
      setError("กรุณากรอกชื่อและอีเมล");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data?.status) throw new Error(data?.message || "บันทึกไม่สำเร็จ");
      setForm({ name: "", email: "", message: "" });
      await load();
    } catch (e: any) {
      setError(e?.message ?? "เกิดข้อผิดพลาดขณะบันทึก");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-6">ตัวอย่าง Next.js x Google Sheet (อ่าน + เขียน)</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ฟอร์ม */}
        <section className="border rounded-2xl p-4 shadow-sm">
          <h2 className="font-medium mb-3">บันทึกข้อมูล</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">ชื่อ</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                type="text"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">อีเมล</label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                type="email"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">ข้อความ</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={3}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                onClick={load}
                disabled={loading}
                className="px-4 py-2 rounded-lg border"
              >
                โหลดข้อมูลล่าสุด
              </button>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        </section>

        {/* ตาราง */}
        <section className="border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">ข้อมูลในชีต</h2>
            {loading && <span className="text-sm text-gray-500">กำลังโหลด...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-3 py-2 text-left">ชื่อ</th>
                  <th className="border px-3 py-2 text-left">อีเมล</th>
                  <th className="border px-3 py-2 text-left">ข้อความ</th>
                  <th className="border px-3 py-2 text-left">เวลา</th>
                </tr>
              </thead>
              <tbody>
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border px-3 py-4 text-center text-gray-500">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border px-3 py-2">{r.name}</td>
                    <td className="border px-3 py-2">{r.email}</td>
                    <td className="border px-3 py-2">{r.message}</td>
                    <td className="border px-3 py-2">
                      <time dateTime={r.timestamp}>{r.timestamp}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
