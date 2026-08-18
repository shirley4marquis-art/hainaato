"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2, User, FileText, Car, Image as ImageIcon } from "lucide-react";
import styles from "./admin.module.css";
import type { AdminQuoteDetail, AdminQuoteItemInput, AdminQuoteItemPhotoInput } from "../../lib/crm";

const STATUSES = ["quoted", "negotiating", "deposit_paid", "paid_full", "shipped", "delivered", "lost"] as const;

type ItemDraft = AdminQuoteItemInput & { key: string };

let keySeq = 0;
function newKey() {
  keySeq += 1;
  return `item-${Date.now()}-${keySeq}`;
}

function blankItem(): ItemDraft {
  return {
    key: newKey(),
    make: "",
    model: "",
    condition: "used",
    qty: 1,
    fobOriginal: 0,
    fobFinal: 0,
    photos: [],
  };
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function QuoteForm({ initial }: { initial: AdminQuoteDetail | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState({
    id: initial?.customer.id ?? null,
    name: initial?.customer.name ?? "",
    phone: initial?.customer.phone ?? "",
    email: initial?.customer.email ?? "",
    address: initial?.customer.address ?? "",
    city: initial?.customer.city ?? "",
    country: initial?.customer.country ?? "",
    notes: initial?.customer.notes ?? "",
  });

  const [quote, setQuote] = useState({
    quoteDate: initial?.quoteDate ?? "",
    validUntil: initial?.validUntil ?? "",
    destinationPort: initial?.destinationPort ?? "",
    destinationCountry: initial?.destinationCountry ?? "",
    incoterm: initial?.incoterm ?? "",
    deliveryEstimate: initial?.deliveryEstimate ?? "",
    inlandTransportCost: initial?.inlandTransportCost ?? 0,
    exportDocumentationCost: initial?.exportDocumentationCost ?? 0,
    freightCost: initial?.freightCost ?? 0,
    insuranceCost: initial?.insuranceCost ?? 0,
    depositPct: initial?.depositPct ?? 40,
    dutyPct: initial?.dutyPct ?? ("" as number | ""),
    currency: initial?.currency ?? "USD",
    language: initial?.language ?? "en",
    status: initial?.status ?? "quoted",
    notes: initial?.notes ?? "",
    publicConsent: initial?.publicConsent ?? false,
  });

  const [items, setItems] = useState<ItemDraft[]>(
    initial?.items.length ? initial.items.map((it) => ({ ...it, key: newKey() })) : [blankItem()]
  );

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeItem(key: string) {
    setItems((current) => (current.length > 1 ? current.filter((it) => it.key !== key) : current));
  }
  function addPhoto(key: string) {
    updateItem(key, {
      photos: [...(items.find((it) => it.key === key)?.photos ?? []), { url: "", caption: "" }],
    });
  }
  function updatePhoto(key: string, index: number, patch: Partial<AdminQuoteItemPhotoInput>) {
    const item = items.find((it) => it.key === key);
    if (!item) return;
    const photos = (item.photos ?? []).map((p, i) => (i === index ? { ...p, ...patch } : p));
    updateItem(key, { photos });
  }
  function removePhoto(key: string, index: number) {
    const item = items.find((it) => it.key === key);
    if (!item) return;
    updateItem(key, { photos: (item.photos ?? []).filter((_, i) => i !== index) });
  }

  async function submit() {
    if (busy) return;
    if (!customer.name || !quote.destinationPort || !quote.destinationCountry) {
      setError("Customer name, destination port and destination country are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      ref: initial?.ref ?? undefined,
      customer: {
        id: customer.id ?? undefined,
        name: customer.name,
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        city: customer.city || null,
        country: customer.country || null,
        notes: customer.notes || null,
      },
      quoteDate: quote.quoteDate || null,
      validUntil: quote.validUntil || null,
      destinationPort: quote.destinationPort,
      destinationCountry: quote.destinationCountry,
      incoterm: quote.incoterm || null,
      deliveryEstimate: quote.deliveryEstimate || null,
      inlandTransportCost: quote.inlandTransportCost,
      exportDocumentationCost: quote.exportDocumentationCost,
      freightCost: quote.freightCost,
      insuranceCost: quote.insuranceCost,
      depositPct: quote.depositPct,
      dutyPct: quote.dutyPct === "" ? null : quote.dutyPct,
      currency: quote.currency,
      language: quote.language,
      status: quote.status,
      notes: quote.notes || null,
      publicConsent: quote.publicConsent,
      items: items.map(({ key: _key, ...rest }) => ({
        ...rest,
        photos: (rest.photos ?? []).filter((p) => p.url.trim()),
      })),
    };

    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not save the quote.");
        setBusy(false);
        return;
      }
      router.push(`/admin/quotes/${data.ref}`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.form}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><User size={14} /> Customer</h2>
        <div className={styles.grid}>
          <label>Full name *<input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></label>
          <label>Phone / WhatsApp<input value={customer.phone ?? ""} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></label>
          <label>Email<input type="email" value={customer.email ?? ""} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></label>
          <label className={styles.wide}>Address<input value={customer.address ?? ""} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></label>
          <label>City<input value={customer.city ?? ""} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></label>
          <label>Country<input value={customer.country ?? ""} onChange={(e) => setCustomer({ ...customer, country: e.target.value })} /></label>
          <label className={styles.wide}>Internal notes<textarea rows={2} value={customer.notes ?? ""} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} /></label>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><FileText size={14} /> Quote details</h2>
        <div className={styles.grid}>
          <label>Status
            <select value={quote.status} onChange={(e) => setQuote({ ...quote, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </label>
          <label>Quote date<input type="date" value={quote.quoteDate ?? ""} onChange={(e) => setQuote({ ...quote, quoteDate: e.target.value })} /></label>
          <label>Valid until<input type="date" value={quote.validUntil ?? ""} onChange={(e) => setQuote({ ...quote, validUntil: e.target.value })} /></label>
          <label>Destination port *<input value={quote.destinationPort} onChange={(e) => setQuote({ ...quote, destinationPort: e.target.value })} /></label>
          <label>Destination country *<input value={quote.destinationCountry} onChange={(e) => setQuote({ ...quote, destinationCountry: e.target.value })} /></label>
          <label>Incoterm<input placeholder="e.g. CIF" value={quote.incoterm ?? ""} onChange={(e) => setQuote({ ...quote, incoterm: e.target.value })} /></label>
          <label>Estimated delivery<input placeholder="e.g. 30–45 días" value={quote.deliveryEstimate ?? ""} onChange={(e) => setQuote({ ...quote, deliveryEstimate: e.target.value })} /></label>
          <label>Currency
            <select value={quote.currency} onChange={(e) => setQuote({ ...quote, currency: e.target.value })}>
              <option value="USD">USD</option><option value="CNY">CNY</option><option value="EUR">EUR</option>
            </select>
          </label>
          <label>Document language
            <select value={quote.language} onChange={(e) => setQuote({ ...quote, language: e.target.value as "en" | "es" })}>
              <option value="en">English</option><option value="es">Español</option>
            </select>
          </label>
          <label>Inland transport<input type="number" step="0.01" value={quote.inlandTransportCost} onChange={(e) => setQuote({ ...quote, inlandTransportCost: num(e.target.value) })} /></label>
          <label>Export documentation<input type="number" step="0.01" value={quote.exportDocumentationCost} onChange={(e) => setQuote({ ...quote, exportDocumentationCost: num(e.target.value) })} /></label>
          <label>Freight<input type="number" step="0.01" value={quote.freightCost} onChange={(e) => setQuote({ ...quote, freightCost: num(e.target.value) })} /></label>
          <label>Insurance<input type="number" step="0.01" value={quote.insuranceCost} onChange={(e) => setQuote({ ...quote, insuranceCost: num(e.target.value) })} /></label>
          <label>Deposit %<input type="number" step="1" value={quote.depositPct} onChange={(e) => setQuote({ ...quote, depositPct: num(e.target.value) })} /></label>
          <label>Duty % (optional)<input type="number" step="0.1" value={quote.dutyPct} onChange={(e) => setQuote({ ...quote, dutyPct: e.target.value === "" ? "" : num(e.target.value) })} /></label>
          <label className={styles.wide}>Internal notes<textarea rows={2} value={quote.notes ?? ""} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} /></label>
          <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={quote.publicConsent} onChange={(e) => setQuote({ ...quote, publicConsent: e.target.checked })} />
            Customer consented to a public anonymized status update
          </label>
        </div>
        {initial && (
          <p style={{ fontSize: 12, color: "#6b7684", marginTop: 10 }}>
            CIF total ≈ {initial.cifTotal.toLocaleString()} {initial.currency} · Grand total ≈ {(initial.grandTotalReference ?? initial.cifTotal).toLocaleString()} {initial.currency} (recalculated on save)
          </p>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><Car size={14} /> Vehicles</h2>
        {items.map((item, index) => (
          <div className={styles.itemCard} key={item.key}>
            <div className={styles.itemCardHead}>
              <b>Vehicle {index + 1}</b>
              <button type="button" className={`${styles.smallBtn} ${styles.smallBtnDanger}`} onClick={() => removeItem(item.key)} disabled={items.length === 1}>
                <Trash2 size={12} /> Remove
              </button>
            </div>
            <div className={styles.grid}>
              <label>Make *<input value={item.make} onChange={(e) => updateItem(item.key, { make: e.target.value })} /></label>
              <label>Model *<input value={item.model} onChange={(e) => updateItem(item.key, { model: e.target.value })} /></label>
              <label>Year<input type="number" value={item.year ?? ""} onChange={(e) => updateItem(item.key, { year: e.target.value ? num(e.target.value) : null })} /></label>
              <label>Condition
                <select value={item.condition} onChange={(e) => updateItem(item.key, { condition: e.target.value as "new" | "used" })}>
                  <option value="new">New</option><option value="used">Used</option>
                </select>
              </label>
              <label>Mileage (km)<input type="number" value={item.mileageKm ?? ""} onChange={(e) => updateItem(item.key, { mileageKm: e.target.value ? num(e.target.value) : null })} /></label>
              <label>Fuel type<input value={item.fuelType ?? ""} onChange={(e) => updateItem(item.key, { fuelType: e.target.value })} /></label>
              <label>Engine<input value={item.engine ?? ""} onChange={(e) => updateItem(item.key, { engine: e.target.value })} /></label>
              <label>Power (hp)<input type="number" value={item.powerHp ?? ""} onChange={(e) => updateItem(item.key, { powerHp: e.target.value ? num(e.target.value) : null })} /></label>
              <label>Transmission<input value={item.transmission ?? ""} onChange={(e) => updateItem(item.key, { transmission: e.target.value })} /></label>
              <label>Drivetrain<input value={item.drivetrain ?? ""} onChange={(e) => updateItem(item.key, { drivetrain: e.target.value })} /></label>
              <label>Exterior color<input value={item.exteriorColor ?? ""} onChange={(e) => updateItem(item.key, { exteriorColor: e.target.value })} /></label>
              <label>Interior color<input value={item.interiorColor ?? ""} onChange={(e) => updateItem(item.key, { interiorColor: e.target.value })} /></label>
              <label>Qty<input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.key, { qty: Math.max(1, num(e.target.value)) })} /></label>
              <label>FOB original *<input type="number" step="0.01" value={item.fobOriginal} onChange={(e) => updateItem(item.key, { fobOriginal: num(e.target.value) })} /></label>
              <label>Discount<input type="number" step="0.01" value={item.discount ?? 0} onChange={(e) => updateItem(item.key, { discount: num(e.target.value) })} /></label>
              <label>FOB final (price used) *<input type="number" step="0.01" value={item.fobFinal} onChange={(e) => updateItem(item.key, { fobFinal: num(e.target.value) })} /></label>
              <label className={styles.wide}>Spec summary (shown on the printed quote)
                <textarea rows={2} placeholder="e.g. SUV grande de chasis independiente · V6 híbrido biturbo 3.4L…" value={item.specSummary ?? ""} onChange={(e) => updateItem(item.key, { specSummary: e.target.value })} />
              </label>
            </div>

            <div style={{ marginTop: 10 }}>
              <b style={{ fontSize: 11, color: "#4b5563", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <ImageIcon size={12} /> Photos (used in the printed PDF)
              </b>
              {(item.photos ?? []).map((photo, pIndex) => (
                <div className={styles.photoRow} key={pIndex}>
                  <input placeholder="Image URL" value={photo.url} onChange={(e) => updatePhoto(item.key, pIndex, { url: e.target.value })} />
                  <input placeholder="Caption (optional)" value={photo.caption ?? ""} onChange={(e) => updatePhoto(item.key, pIndex, { caption: e.target.value })} />
                  <button type="button" className={styles.smallBtn} onClick={() => removePhoto(item.key, pIndex)}><Trash2 size={12} /></button>
                </div>
              ))}
              <button type="button" className={styles.smallBtn} onClick={() => addPhoto(item.key)}><Plus size={12} /> Add photo</button>
            </div>
          </div>
        ))}
        <button type="button" className={styles.btnGhost} onClick={() => setItems((current) => [...current, blankItem()])}>
          <Plus size={14} /> Add another vehicle
        </button>
      </div>

      {error && <p className={styles.formError}>{error}</p>}
      <div className={styles.formActions}>
        <button type="button" className={styles.btn} onClick={submit} disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Create quote"}
        </button>
        {initial && (
          <a className={styles.btnGhost} href={`/admin/quotes/${initial.ref}/print`} target="_blank" rel="noopener noreferrer">
            Preview document
          </a>
        )}
      </div>
    </div>
  );
}
