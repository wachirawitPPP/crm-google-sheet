"use client";

// app/page.tsx — Next.js + Tailwind (Client Component)
// Now wired to call our Google Sheets API routes.

import React, { useEffect, useMemo, useState } from "react";

// --- Types / Constants
const STAGES = [
  { id: "lead", name: "Lead" },
  { id: "qualified", name: "Qualified" },
  { id: "proposal", name: "Proposal" },
  { id: "negotiation", name: "Negotiation" },
  { id: "won", name: "Closed Won" },
  { id: "lost", name: "Closed Lost" },
];

const CATALOG = [
  { sku: "CRM-START", name: "CRM Starter (Monthly)", price: 990 },
  { sku: "CRM-PRO", name: "CRM Pro (Monthly)", price: 2490 },
  { sku: "IMP-ONB", name: "Implementation & Onboarding", price: 15000 },
  { sku: "TRN-TEAM", name: "Team Training (per session)", price: 5000 },
];

function currency(n?: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "THB" }).format(n || 0);
  } catch {
    return `${n?.toLocaleString?.() || 0} THB`;
  }
}

// --- Sample seed deals (fallback if sheet empty)
const seedDeals = [
  {
    id: "D-1001",
    title: "POS upgrade for Cafe A",
    account_id: "A-001",
    account: "Cafe A Co., Ltd.",
    account_name: "Cafe A Co., Ltd.",
    owner: "Mint",
    value: 35000,
    source: "Webform",
    close_date: "2025-09-10",
    closeDate: "2025-09-10",
    stage: "lead",
  },
  {
    id: "D-1002",
    title: "CRM rollout for Clinic B",
    account_id: "A-002",
    account: "Healthy Clinic B",
    account_name: "Healthy Clinic B",
    owner: "Boss",
    value: 120000,
    source: "Event",
    close_date: "2025-10-05",
    closeDate: "2025-10-05",
    stage: "qualified",
  },
  {
    id: "D-1003",
    title: "Renewal + Upsell (Retail C)",
    account_id: "",
    account: "Retail C Group",
    account_name: "Retail C Group",
    owner: "Fa",
    value: 68000,
    source: "Referral",
    close_date: "2025-09-22",
    closeDate: "2025-09-22",
    stage: "proposal",
  },
];

export default function Page() {
  return <CRMApp />;
}

export function CRMApp() {
  const [deals, setDeals] = useState<any[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedSku, setSelectedSku] = useState(CATALOG[0]?.sku || "");

  const [accounts, setAccounts] = useState<any[]>([
    {
      id: "A-001",
      name: "Cafe A Co., Ltd.",
      taxId: "0105559999999",
      billingAddress: "123 Sukhumvit, Bangkok",
      primaryContact: { name: "Ann", email: "ann@cafea.co.th", phone: "080-000-0000" },
    },
    {
      id: "A-002",
      name: "Healthy Clinic B",
      taxId: "0105558888888",
      billingAddress: "22 Rama 9, Bangkok",
      primaryContact: { name: "Beam", email: "beam@clinicb.co.th", phone: "081-234-5678" },
    },
  ]);

  // --- Quote state
  const [quote, setQuote] = useState({
    forDealId: "",
    discountPct: 0,
    vatPct: 7,
    items: [] as { sku: string; name: string; price: number; qty: number }[],
    notes: "ราคานี้ยังไม่รวมค่าขนส่ง",
  });

  // ===== API wiring helpers =====
  useEffect(() => {
    // Load from Sheets on mount
    (async () => {
      try {
        const [acRes, dlRes] = await Promise.all([
          fetch("/api/accounts").then((r) => r.json()).catch(() => null),
          fetch("/api/deals").then((r) => r.json()).catch(() => null),
        ]);
        if (acRes?.status) setAccounts(acRes.data || []);
        if (dlRes?.status) setDeals((dlRes.data && dlRes.data.length > 0 ? dlRes.data : seedDeals) || seedDeals);
      } catch (e) {
        console.warn("Load from Sheets failed, using seeds", e);
      }
    })();
  }, []);

  async function apiCreateAccount(payload: any) {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (j.status) {
      setAccounts((prev) => [j.data, ...prev]);
      return j.data;
    }
    throw new Error(j?.message || "Create account failed");
  }

  async function apiCreateDeal(payload: any) {
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (j.status) {
      setDeals((prev) => [j.data, ...prev]);
      return j.data;
    }
    throw new Error(j?.message || "Create deal failed");
  }

  async function apiUpdateDeal(id: string, patch: any) {
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (!j.status) throw new Error(j?.message || "Update deal failed");
  }

  async function apiCreateQuote(payload: any) {
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!j.status) throw new Error(j?.message || "Create quote failed");
    return j.data; // { id }
  }

  const filteredDeals = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return deals;
    return deals.filter((d) =>
      [d.id, d.title, d.account, d.account_name, d.owner, d.source].some((x) => (x || "").toLowerCase().includes(f))
    );
  }, [deals, filter]);

  const pipelineByStage = useMemo(() => {
    return STAGES.reduce<Record<string, typeof deals>>((acc, st) => {
      acc[st.id] = filteredDeals.filter((d) => d.stage === st.id);
      return acc;
    }, {} as Record<string, typeof deals>);
  }, [filteredDeals]);

  // --- Drag handlers (HTML5 drag & drop)
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }
  async function onDropStage(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    if (!dragId) return;
    // optimistic UI
    setDeals((prev) => prev.map((d) => (d.id === dragId ? { ...d, stage: stageId } : d)));
    try {
      await apiUpdateDeal(dragId, { stage: stageId });
    } catch (err) {
      console.error(err);
    }
    setDragId(null);
  }

  // --- Deal CRUD helpers wired to API
  async function addDeal(payload: any) {
    const p = {
      title: payload.title,
      account_id: accounts.find((a) => a.name === payload.account)?.id || "",
      account: payload.account,
      account_name: payload.account,
      owner: payload.owner,
      value: Number(payload.value || 0),
      source: payload.source,
      closeDate: payload.closeDate,
      stage: "lead",
    };
    await apiCreateDeal(p);
  }

  // --- Account CRUD helpers wired to API
  async function addAccount(payload: any) {
    await apiCreateAccount(payload);
  }

  // --- Quote helpers
  const currentDeal = useMemo(() => deals.find((d) => d.id === quote.forDealId), [quote.forDealId, deals]);
  const quoteSubtotal = useMemo(() => quote.items.reduce((s, it) => s + it.qty * it.price, 0), [quote.items]);
  const quoteDiscount = useMemo(
    () => (quoteSubtotal * (Number(quote.discountPct) || 0)) / 100,
    [quoteSubtotal, quote.discountPct]
  );
  const quoteBeforeVat = useMemo(() => Math.max(quoteSubtotal - quoteDiscount, 0), [quoteSubtotal, quoteDiscount]);
  const quoteVat = useMemo(() => (quoteBeforeVat * (Number(quote.vatPct) || 0)) / 100, [quoteBeforeVat, quote.vatPct]);
  const quoteTotal = useMemo(() => quoteBeforeVat + quoteVat, [quoteBeforeVat, quoteVat]);

  function addItemToQuote(sku: string) {
    const p = CATALOG.find((x) => x.sku === sku);
    if (!p) return;
    setQuote((q) => ({ ...q, items: [...q.items, { sku: p.sku, name: p.name, price: p.price, qty: 1 }] }));
  }

  function removeItemFromQuote(idx: number) {
    setQuote((q) => ({ ...q, items: q.items.filter((_, i) => i !== idx) }));
  }

  function flowAccountPayload() {
    // Minimal payload shape for FlowAccount quotation create API (conceptual)
    return {
      document_type: "quotation",
      customer: {
        name: currentDeal?.account || currentDeal?.account_name || "",
      },
      items: quote.items.map((it) => ({ name: it.name, quantity: it.qty, price: it.price })),
      discount: { type: "percent", value: Number(quote.discountPct) || 0 },
      vat_rate: Number(quote.vatPct) || 0,
      notes: quote.notes,
      reference: currentDeal?.id,
      title: `Quotation for ${currentDeal?.title || ""}`,
    };
  }

  async function submitQuoteToSheets() {
    if (!quote.forDealId) return alert("โปรดเลือกดีลก่อน");
    try {
      const payload = {
        forDealId: quote.forDealId,
        deal_id: quote.forDealId,
        items: quote.items,
        discountPct: quote.discountPct,
        vatPct: quote.vatPct,
        subtotal: quoteSubtotal,
        discount: quoteDiscount,
        beforeVat: quoteBeforeVat,
        vat: quoteVat,
        total: quoteTotal,
        notes: quote.notes,
      };
      const res = await apiCreateQuote(payload);
      alert(`บันทึกใบเสนอราคาแล้ว (ID: ${res.id})`);
    } catch (e: any) {
      alert("บันทึกใบเสนอราคาไม่สำเร็จ: " + e?.message);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* Topbar */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="text-xl font-bold tracking-tight">Sales CRM</div>
          <div className="ml-auto flex items-center gap-2">
            <input
              className="rounded-xl border px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring"
              placeholder="ค้นหาดีล / ลูกค้า / เซลล์"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <button className="rounded-2xl border px-3 py-1.5 text-sm hover:bg-slate-100" onClick={() => setShowAccountModal(true)}>
              + ลูกค้า
            </button>
            <button className="rounded-2xl border px-3 py-1.5 text-sm hover:bg-slate-100" onClick={() => setShowDealModal(true)}>
              + ดีล
            </button>
            <button className="rounded-2xl border px-3 py-1.5 text-sm hover:bg-slate-100" onClick={() => setShowQuoteModal(true)}>
              + ใบเสนอราคา
            </button>
          </div>
        </div>
      </header>

      {/* Summary */}
      <section className="mx-auto max-w-7xl px-4 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard title="ดีลทั้งหมด" value={deals.length} />
        <SummaryCard title="Pipeline (รวม)" value={currency(deals.reduce((s, d) => s + Number(d.value || 0), 0))} />
        <SummaryCard
          title="สัดส่วน Won"
          value={`${Math.round((deals.filter((d) => d.stage === "won").length / Math.max(deals.length, 1)) * 100)}%`}
        />
      </section>

      {/* Kanban */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAGES.map((st) => (
            <div
              key={st.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropStage(e, st.id)}
              className="flex flex-col rounded-2xl bg-white border shadow-sm min-h-[60vh]"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="font-semibold text-slate-700">{st.name}</div>
                <div className="text-xs rounded-full bg-slate-100 px-2 py-0.5">{pipelineByStage[st.id]?.length || 0}</div>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-auto">
                {(pipelineByStage[st.id] || []).map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, d.id)}
                    className="group rounded-2xl border hover:shadow-md transition-shadow bg-white p-3 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-slate-400" />
                      <div className="flex-1">
                        <div className="font-medium leading-tight">{d.title}</div>
                        <div className="text-xs text-slate-500">{d.account || d.account_name}</div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                          <span>{currency(Number(d.value))}</span>
                          <span>Owner: {d.owner}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">Close: {d.close_date || d.closeDate}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modals */}
      {showDealModal && (
        <Modal title="สร้างดีลใหม่" onClose={() => setShowDealModal(false)}>
          <DealForm
            accounts={accounts}
            onSubmit={async (payload) => {
              await addDeal(payload);
              setShowDealModal(false);
            }}
          />
        </Modal>
      )}

      {showAccountModal && (
        <Modal title="เพิ่มลูกค้า (Account)" onClose={() => setShowAccountModal(false)}>
          <AccountForm
            onSubmit={async (payload) => {
              await addAccount(payload);
              setShowAccountModal(false);
            }}
          />
        </Modal>
      )}

      {showQuoteModal && (
        <Modal title="สร้างใบเสนอราคา (Draft)" onClose={() => setShowQuoteModal(false)}>
          <QuoteForm
            deals={deals}
            quote={quote}
            setQuote={setQuote}
            addItem={() => addItemToQuote(selectedSku)}
            removeItem={removeItemFromQuote}
            catalog={CATALOG}
            selectedSku={selectedSku}
            setSelectedSku={setSelectedSku}
            subtotal={quoteSubtotal}
            discount={quoteDiscount}
            beforeVat={quoteBeforeVat}
            vat={quoteVat}
            total={quoteTotal}
            makePayload={flowAccountPayload}
            onSubmitQuote={submitQuoteToSheets}
          />
        </Modal>
      )}

      <footer className="py-8 text-center text-xs text-slate-400">CRM Prototype • Drag & Drop cards ระหว่างคอลัมน์เพื่ออัปเดตสเตจ (บันทึกลง Google Sheets)</footer>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">{title}</div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function LabeledInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function DealForm({ accounts, onSubmit }: { accounts: any[]; onSubmit: (payload: any) => void }) {
  const [form, setForm] = useState({
    title: "",
    account: accounts[0]?.name || "",
    owner: "",
    value: 0,
    source: "",
    closeDate: new Date().toISOString().slice(0, 10),
  });

  const inputCls = "rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300 bg-white";
  const btnPrimary = "rounded-2xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800";
  const btnSecondary = "rounded-2xl px-4 py-2 border hover:bg-slate-100";

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(form);
      }}
    >
      <LabeledInput label="ชื่อดีล">
        <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </LabeledInput>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LabeledInput label="ลูกค้า (Account)">
          <select className={inputCls} value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            {accounts.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </LabeledInput>
        <LabeledInput label="เจ้าของดีล (Owner)">
          <input className={inputCls} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} required />
        </LabeledInput>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LabeledInput label="มูลค่า (THB)">
          <input
            type="number"
            className={inputCls}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
          />
        </LabeledInput>
        <LabeledInput label="แหล่งที่มา (Source)">
          <input className={inputCls} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </LabeledInput>
        <LabeledInput label="คาดว่าจะปิด (Close date)">
          <input type="date" className={inputCls} value={form.closeDate} onChange={(e) => setForm({ ...form, closeDate: e.target.value })} />
        </LabeledInput>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className={btnSecondary} onClick={async () => await onSubmit(form)}>
          บันทึก
        </button>
        <button type="submit" className={btnPrimary}>
          บันทึก & ปิด
        </button>
      </div>
    </form>
  );
}

function AccountForm({ onSubmit }: { onSubmit: (payload: any) => void }) {
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    billingAddress: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  const inputCls = "rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300 bg-white";
  const btnPrimary = "rounded-2xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800";

  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          name: form.name,
          taxId: form.taxId,
          billingAddress: form.billingAddress,
          primaryContact: { name: form.contactName, email: form.contactEmail, phone: form.contactPhone },
        });
      }}
    >
      <LabeledInput label="ชื่อลูกค้า (นิติบุคคล/บุคคลธรรมดา)">
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </LabeledInput>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LabeledInput label="เลขผู้เสียภาษี (ถ้ามี)">
          <input className={inputCls} value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
        </LabeledInput>
        <LabeledInput label="เบอร์ติดต่อ">
          <input className={inputCls} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        </LabeledInput>
      </div>
      <LabeledInput label="อีเมล">
        <input type="email" className={inputCls} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
      </LabeledInput>
      <LabeledInput label="ผู้ติดต่อหลัก">
        <input className={inputCls} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
      </LabeledInput>
      <LabeledInput label="ที่อยู่ออกใบกำกับ">
        <textarea className={`${inputCls} min-h-[80px]`} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
      </LabeledInput>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" className={btnPrimary}>
          บันทึก
        </button>
      </div>
    </form>
  );
}

function QuoteForm({
  deals,
  quote,
  setQuote,
  addItem,
  removeItem,
  catalog,
  selectedSku,
  setSelectedSku,
  subtotal,
  discount,
  beforeVat,
  vat,
  total,
  makePayload,
  onSubmitQuote,
}: {
  deals: any[];
  quote: any;
  setQuote: (q: any) => void;
  addItem: () => void;
  removeItem: (idx: number) => void;
  catalog: typeof CATALOG;
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  subtotal: number;
  discount: number;
  beforeVat: number;
  vat: number;
  total: number;
  makePayload: () => any;
  onSubmitQuote: () => void;
}) {
  const inputCls = "rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300 bg-white";
  const btnPrimary = "rounded-2xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800";
  const btnSecondary = "rounded-2xl px-4 py-2 border hover:bg-slate-100";

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LabeledInput label="อ้างอิงดีล">
          <select className={inputCls} value={quote.forDealId} onChange={(e) => setQuote({ ...quote, forDealId: e.target.value })}>
            <option value="">— เลือกดีล —</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} • {d.title}
              </option>
            ))}
          </select>
        </LabeledInput>
        <LabeledInput label="หมายเหตุในใบเสนอราคา">
          <input className={inputCls} value={quote.notes} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} />
        </LabeledInput>
      </div>

      <div className="rounded-2xl border bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">รายการสินค้า/บริการ</div>
          <div className="flex items-center gap-2">
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)} className={inputCls}>
              {catalog.map((p) => (
                <option value={p.sku} key={p.sku}>
                  {p.sku} • {p.name} ({currency(p.price)})
                </option>
              ))}
            </select>
            <button className={btnSecondary} onClick={addItem}>
              + เพิ่มรายการ
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">SKU</th>
                <th>ชื่อ</th>
                <th className="w-24">ราคา</th>
                <th className="w-20">จำนวน</th>
                <th className="w-28 text-right">รวมย่อย</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((it: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="py-2">{it.sku}</td>
                  <td>{it.name}</td>
                  <td>
                    <input
                      type="number"
                      className={`${inputCls} !py-1`}
                      value={it.price}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const items = [...quote.items];
                        items[idx] = { ...it, price: v };
                        setQuote({ ...quote, items });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className={`${inputCls} !py-1`}
                      value={it.qty}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const items = [...quote.items];
                        items[idx] = { ...it, qty: v };
                        setQuote({ ...quote, items });
                      }}
                    />
                  </td>
                  <td className="text-right">{currency(it.qty * it.price)}</td>
                  <td>
                    <button className="text-red-500" onClick={() => removeItem(idx)}>
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {quote.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    ยังไม่มีรายการ โปรดเพิ่มจากแคตตาล็อกด้านบน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LabeledInput label="ส่วนลด (%)">
          <input
            type="number"
            className={inputCls}
            value={quote.discountPct}
            onChange={(e) => setQuote({ ...quote, discountPct: Number(e.target.value) })}
          />
        </LabeledInput>
        <LabeledInput label="VAT (%)">
          <input
            type="number"
            className={inputCls}
            value={quote.vatPct}
            onChange={(e) => setQuote({ ...quote, vatPct: Number(e.target.value) })}
          />
        </LabeledInput>
        <div className="rounded-2xl border p-3 bg-white">
          <div className="text-sm text-slate-500">สรุปยอด</div>
          <div className="mt-1 text-sm">Subtotal: {currency(subtotal)}</div>
          <div className="text-sm">Discount: {currency(discount)}</div>
          <div className="text-sm">ก่อน VAT: {currency(beforeVat)}</div>
          <div className="text-sm">VAT: {currency(vat)}</div>
          <div className="mt-1 text-lg font-semibold">ยอดสุทธิ: {currency(total)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Tip: เมื่อยืนยันใบเสนอราคา ปุ่ม “ส่งไป Google Sheet” จะบันทึกลงแท็บ Quotes + QuoteItems
        </div>
        <div className="flex items-center gap-2">
          <button
            className={btnSecondary}
            onClick={() => {
              const payload = makePayload();
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `quotation_${quote.forDealId || "draft"}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export Payload (JSON)
          </button>
          <button className={btnPrimary} onClick={onSubmitQuote}>
            ส่งไป Google Sheet
          </button>
        </div>
      </div>
    </div>
  );
}
