"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardPaste, Plus, Trash2, User, FileText, Car, Image as ImageIcon, WandSparkles, Truck } from "lucide-react";
import styles from "./admin.module.css";
import type { AdminQuoteDetail, AdminQuoteItemInput, AdminQuoteItemPhotoInput } from "../../lib/crm";
import { FUEL_OPTIONS } from "../../lib/fuel-options";
import { CUSTOM_COLOR_SURCHARGE_USD } from "../../lib/vehicle-customization";
import { QUOTE_LANGUAGE_OPTIONS, type QuoteLanguage } from "../../lib/quote-language";
import { STATUS_ORDER, quoteStatusMeta, quoteStatusProgress } from "./status";

type ItemDraft = AdminQuoteItemInput & { key: string };
type VehicleLookupResponse = { ok?: boolean; vehicles?: { item?: AdminQuoteItemInput; error?: string }[]; error?: string };

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
    fuelType: "Gasoline",
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

function vehicleUrlsFromText(text: string): string[] {
  const urlMatches = text.match(/(?:https?:\/\/[^\s<>"']+)?\/vehicles\/[a-z0-9-]+/gi) ?? [];
  return [...new Set(urlMatches.map((url) => url.replace(/[),.;]+$/, "")))];
}

export function QuoteForm({ initial }: { initial: AdminQuoteDetail | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [vehiclePasteText, setVehiclePasteText] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);

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
    incoterm: initial?.incoterm ?? "CIF",
    deliveryEstimate: initial?.deliveryEstimate ?? "",
    inlandTransportCost: initial?.inlandTransportCost ?? 0,
    exportDocumentationCost: initial?.exportDocumentationCost ?? 0,
    freightCost: initial?.freightCost ?? 0,
    insuranceCost: initial?.insuranceCost ?? 0,
    depositPct: initial?.depositPct ?? 40,
    dutyPct: initial?.dutyPct ?? ("" as number | ""),
    currency: initial?.currency ?? "USD",
    language: initial?.language ?? "en" as QuoteLanguage,
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
  function updateIncoterm(incoterm: "CIF" | "FOB") {
    setQuote((current) => ({
      ...current,
      incoterm,
      ...(incoterm === "CIF"
        ? { inlandTransportCost: 0, exportDocumentationCost: 0, freightCost: 0, insuranceCost: 0 }
        : {}),
    }));
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
  function applyCustomColor(key: string) {
    const item = items.find((it) => it.key === key);
    if (!item) return;
    const note = `Custom color requested (+$${CUSTOM_COLOR_SURCHARGE_USD} USD)`;
    const summary = item.specSummary?.includes("Custom color requested")
      ? item.specSummary
      : [item.specSummary, note].filter(Boolean).join(" · ");
    updateItem(key, {
      exteriorColor: item.exteriorColor?.startsWith("Custom color") ? item.exteriorColor : `Custom color${item.exteriorColor ? ` (${item.exteriorColor})` : ""}`,
      specSummary: summary,
      fobOriginal: Number((item.fobOriginal + CUSTOM_COLOR_SURCHARGE_USD).toFixed(2)),
      fobFinal: Number((item.fobFinal + CUSTOM_COLOR_SURCHARGE_USD).toFixed(2)),
    });
  }

  async function lookupVehicleItems(urls: string[]): Promise<{ items: ItemDraft[]; resolved: number; failed: number }> {
    const response = await fetch("/api/admin/quote-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }) });
    const data = await response.json().catch(() => null) as VehicleLookupResponse | null;
    if (!response.ok || !data?.ok) throw new Error(data?.error || "Vehicle lookup failed.");
    const detectedItems = (data.vehicles ?? []).flatMap((entry) => entry.item ? [{ ...entry.item, key: newKey() } as ItemDraft] : []);
    return { items: detectedItems, resolved: detectedItems.length, failed: urls.length - detectedItems.length };
  }

  async function detectPastedInquiry() {
    const text = pasteText.trim();
    if (!text || detecting) return;
    setDetecting(true); setError(null); setDetectionNotice(null);
    const labelled = (labels: string[]) => {
      const pattern = new RegExp(`(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:=-]\\s*([^\\n]+)`, "i");
      return text.match(pattern)?.[1]?.trim() ?? "";
    };
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
    const name = labelled(["client(?: name)?", "customer(?: name)?", "full name", "name", "cliente", "nombre"]);
    const port = labelled(["destination port", "delivery port", "port", "puerto(?: de destino)?"]);
    const country = labelled(["destination country", "country", "pa[ií]s(?: de destino)?"]);
    const phone = labelled(["phone", "whatsapp", "tel(?:ephone)?", "tel[eé]fono"]);
    const urls = vehicleUrlsFromText(text);
    setCustomer((current) => ({ ...current, name: name || current.name, email: email || current.email, phone: phone || current.phone }));
    setQuote((current) => ({ ...current, destinationPort: port || current.destinationPort, destinationCountry: country || current.destinationCountry }));
    let resolved = 0; let failed = 0;
    if (urls.length) {
      try {
        const detected = await lookupVehicleItems(urls);
        resolved = detected.resolved; failed = detected.failed;
        if (detected.items.length) { setItems(detected.items); setQuote((current) => ({ ...current, currency: "USD" })); }
      } catch (lookupError) { setError(lookupError instanceof Error ? lookupError.message : "Vehicle lookup failed."); }
    }
    const fields = [name && "name", email && "email", phone && "phone", port && "port", country && "country"].filter(Boolean);
    setDetectionNotice(`Detected ${fields.length ? fields.join(", ") : "no labelled client fields"}${resolved ? ` and ${resolved} catalogue vehicle${resolved === 1 ? "" : "s"}` : ""}${failed ? `. ${failed} vehicle link${failed === 1 ? " was" : "s were"} not found` : ""}. Review before creating the quote.`);
    setDetecting(false);
  }

  async function appendPastedVehicles() {
    const text = vehiclePasteText.trim();
    if (!text || detecting) return;
    const urls = vehicleUrlsFromText(text);
    if (!urls.length) {
      setDetectionNotice(null);
      setError("Paste one or more HainaAuto vehicle links from the catalogue.");
      return;
    }
    setDetecting(true); setError(null); setDetectionNotice(null);
    try {
      const detected = await lookupVehicleItems(urls);
      if (!detected.items.length) {
        setError("No matching catalogue vehicles were found for those links.");
        return;
      }
      setItems((current) => [...current, ...detected.items]);
      setQuote((current) => ({ ...current, currency: "USD" }));
      setVehiclePasteText("");
      setDetectionNotice(`Added ${detected.resolved} catalogue vehicle${detected.resolved === 1 ? "" : "s"} in USD${detected.failed ? `. ${detected.failed} link${detected.failed === 1 ? " was" : "s were"} not found` : ""}. Review and save the quote.`);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Vehicle lookup failed.");
    } finally {
      setDetecting(false);
    }
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
      incoterm: quote.incoterm || "CIF",
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
      items: items.map((item) => {
        const rest = { ...item };
        delete (rest as Partial<ItemDraft>).key;
        return { ...rest, photos: (rest.photos ?? []).filter((p) => p.url.trim()) };
      }),
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

  const isCif = quote.incoterm !== "FOB";

  return (
    <div className={styles.form}>
      {!initial && <div className={styles.intakePanel}>
        <div className={styles.intakeHeading}><span><ClipboardPaste size={17}/></span><div><h2>Paste client inquiry</h2><p>Paste an email, WhatsApp message, or enquiry containing client details and HainaAuto vehicle links.</p></div></div>
        <textarea rows={6} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={"Client name: Maria Perez\nEmail: maria@example.com\nDestination port: La Guaira\nCountry: Venezuela\nVehicle: https://www.nindgeauto.com/vehicles/vehicle-slug"}/>
        <div className={styles.intakeActions}><button type="button" className={styles.btn} onClick={detectPastedInquiry} disabled={detecting || !pasteText.trim()}><WandSparkles size={14}/>{detecting ? "Detecting details…" : "Detect and fill quotation"}</button><small>Nothing is saved until you review and click Create quote.</small></div>
        {detectionNotice && <p className={styles.formSuccess}>{detectionNotice}</p>}
      </div>}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><User size={14} /> Customer</h2>
        <div className={styles.grid}>
          <label>Full name *<input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></label>
          <label>Phone / WhatsApp<input value={customer.phone ?? ""} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></label>
          <label>Email<input type="email" value={customer.email ?? ""} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></label>
          <label>Client language *
            <select value={quote.language} onChange={(e) => setQuote({ ...quote, language: e.target.value as QuoteLanguage })}>
              {QUOTE_LANGUAGE_OPTIONS.map(({value,label}) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className={styles.wide}>Address<input value={customer.address ?? ""} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></label>
          <label>City<input value={customer.city ?? ""} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></label>
          <label>Country<input value={customer.country ?? ""} onChange={(e) => setCustomer({ ...customer, country: e.target.value })} /></label>
          <label className={styles.wide}>Internal notes<textarea rows={2} value={customer.notes ?? ""} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} /></label>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><Truck size={14} /> Order stage</h2>
        <p style={{ fontSize: 12, color: "#6b7684", margin: "-4px 0 12px" }}>
          {initial ? "This order started as a quote and moves through these stages up to delivery." : "A new order starts here as a quote."}
        </p>
        <div className={styles.grid}>
          <label>Current stage
            <select value={quote.status} onChange={(e) => setQuote({ ...quote, status: e.target.value })}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{quoteStatusMeta(s).label}</option>)}
            </select>
          </label>
        </div>
        {(() => {
          const meta = quoteStatusMeta(quote.status);
          const progress = quoteStatusProgress(quote.status);
          const Icon = meta.icon;
          return (
            <div style={{ marginTop: 10 }}>
              <span className={styles.statusPill} data-tone={meta.tone}><Icon size={11} /> {meta.label}</span>
              <div className={styles.orderProgress} style={{ marginTop: 8, maxWidth: 360 }}>
                <div><i style={{ width: `${progress}%` }} /></div>
                <small>{quote.status === "lost" ? "Closed" : `${progress}% to delivery`}</small>
              </div>
            </div>
          );
        })()}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><FileText size={14} /> Quote details</h2>
        <div className={styles.grid}>
          <label>Quote date<input type="date" value={quote.quoteDate ?? ""} onChange={(e) => setQuote({ ...quote, quoteDate: e.target.value })} /></label>
          <label>Valid until<input type="date" value={quote.validUntil ?? ""} onChange={(e) => setQuote({ ...quote, validUntil: e.target.value })} /></label>
          <label>Destination port *<input value={quote.destinationPort} onChange={(e) => setQuote({ ...quote, destinationPort: e.target.value })} /></label>
          <label>Destination country *<input value={quote.destinationCountry} onChange={(e) => setQuote({ ...quote, destinationCountry: e.target.value })} /></label>
          <label>Price type / Incoterm
            <select value={quote.incoterm ?? "CIF"} onChange={(e) => updateIncoterm(e.target.value as "CIF" | "FOB")}>
              <option value="CIF">CIF — vehicle + ocean freight + marine insurance</option>
              <option value="FOB">FOB — vehicle/export price only</option>
            </select>
          </label>
          <label>Estimated delivery<input placeholder="e.g. 30–45 días" value={quote.deliveryEstimate ?? ""} onChange={(e) => setQuote({ ...quote, deliveryEstimate: e.target.value })} /></label>
          <label>Currency
            <select value={quote.currency} onChange={(e) => setQuote({ ...quote, currency: e.target.value })}>
              <option value="USD">USD</option><option value="CNY">CNY</option><option value="EUR">EUR</option>
            </select>
          </label>
          <label>Inland transport<input type="number" step="0.01" value={quote.inlandTransportCost} disabled={isCif} onChange={(e) => setQuote({ ...quote, inlandTransportCost: num(e.target.value) })} /></label>
          <label>Export documentation<input type="number" step="0.01" value={quote.exportDocumentationCost} disabled={isCif} onChange={(e) => setQuote({ ...quote, exportDocumentationCost: num(e.target.value) })} /></label>
          <label>Freight<input type="number" step="0.01" value={quote.freightCost} disabled={isCif} onChange={(e) => setQuote({ ...quote, freightCost: num(e.target.value) })} /></label>
          <label>Insurance<input type="number" step="0.01" value={quote.insuranceCost} disabled={isCif} onChange={(e) => setQuote({ ...quote, insuranceCost: num(e.target.value) })} /></label>
          <label>Deposit %<input type="number" step="1" value={quote.depositPct} onChange={(e) => setQuote({ ...quote, depositPct: num(e.target.value) })} /></label>
          <label>Duty % (optional)<input type="number" step="0.1" value={quote.dutyPct} onChange={(e) => setQuote({ ...quote, dutyPct: e.target.value === "" ? "" : num(e.target.value) })} /></label>
          <label className={styles.wide}>Internal notes<textarea rows={2} value={quote.notes ?? ""} onChange={(e) => setQuote({ ...quote, notes: e.target.value })} /></label>
          <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={quote.publicConsent} onChange={(e) => setQuote({ ...quote, publicConsent: e.target.checked })} />
            Customer consented to a public anonymized status update
          </label>
        </div>
        {isCif && (
          <p style={{ fontSize: 12, color: "#6b7684", marginTop: 10 }}>
            CIF quotes treat the entered vehicle unit price as already including vehicle cost, international ocean freight and marine insurance. Local destination charges remain separate.
          </p>
        )}
        {initial && (
          <p style={{ fontSize: 12, color: "#6b7684", marginTop: 10 }}>
            CIF total ≈ {initial.cifTotal.toLocaleString()} {initial.currency} · Grand total ≈ {(initial.grandTotalReference ?? initial.cifTotal).toLocaleString()} {initial.currency} (recalculated on save)
          </p>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><Car size={14} /> Vehicles</h2>
        {initial && <div className={styles.intakePanel}>
          <div className={styles.intakeHeading}><span><ClipboardPaste size={17}/></span><div><h2>Paste vehicle link</h2><p>Add another catalogue vehicle to this existing quote. Details, photos, fuel and USD price fill automatically.</p></div></div>
          <textarea rows={3} value={vehiclePasteText} onChange={(event) => setVehiclePasteText(event.target.value)} placeholder="https://www.nindgeauto.com/vehicles/vehicle-slug"/>
          <div className={styles.intakeActions}><button type="button" className={styles.btn} onClick={appendPastedVehicles} disabled={detecting || !vehiclePasteText.trim()}><ClipboardPaste size={14}/>{detecting ? "Adding vehicle…" : "Add pasted vehicle"}</button><small>Nothing is saved until you click Save changes.</small></div>
          {detectionNotice && <p className={styles.formSuccess}>{detectionNotice}</p>}
        </div>}
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
              <label>Fuel type
                <select value={item.fuelType ?? "Gasoline"} onChange={(e) => updateItem(item.key, { fuelType: e.target.value })}>
                  {FUEL_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>Engine<input value={item.engine ?? ""} onChange={(e) => updateItem(item.key, { engine: e.target.value })} /></label>
              <label>Power (hp)<input type="number" value={item.powerHp ?? ""} onChange={(e) => updateItem(item.key, { powerHp: e.target.value ? num(e.target.value) : null })} /></label>
              <label>Transmission<input value={item.transmission ?? ""} onChange={(e) => updateItem(item.key, { transmission: e.target.value })} /></label>
              <label>Drivetrain<input value={item.drivetrain ?? ""} onChange={(e) => updateItem(item.key, { drivetrain: e.target.value })} /></label>
              <label>Exterior color<input value={item.exteriorColor ?? ""} onChange={(e) => updateItem(item.key, { exteriorColor: e.target.value })} /></label>
              <div className={styles.fieldAction}>
                <button type="button" className={styles.smallBtn} onClick={() => applyCustomColor(item.key)}>{`Custom color +$${CUSTOM_COLOR_SURCHARGE_USD}`}</button>
              </div>
              <label>Interior color<input value={item.interiorColor ?? ""} onChange={(e) => updateItem(item.key, { interiorColor: e.target.value })} /></label>
              <label>Qty<input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.key, { qty: Math.max(1, num(e.target.value)) })} /></label>
              <label>Original unit price *<input type="number" step="0.01" value={item.fobOriginal} onChange={(e) => updateItem(item.key, { fobOriginal: num(e.target.value) })} /></label>
              <label>Discount<input type="number" step="0.01" value={item.discount ?? 0} onChange={(e) => updateItem(item.key, { discount: num(e.target.value) })} /></label>
              <label>Final unit price ({isCif ? "CIF" : "FOB"} used) *<input type="number" step="0.01" value={item.fobFinal} onChange={(e) => updateItem(item.key, { fobFinal: num(e.target.value) })} /></label>
              <label className={styles.wide}>Actual vehicle link<input type="url" placeholder="https://www.nindgeauto.com/vehicles/..." value={(item.historyNotes ?? "").replace(/^Vehicle link:\s*/i, "")} onChange={(e) => updateItem(item.key, { historyNotes: e.target.value ? `Vehicle link: ${e.target.value}` : null })} /></label>
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
