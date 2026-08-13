// Writes HainaAuto website leads into the same quotes/customers CRM database
// the business owner already uses for issued quotes (sibling project at
// C:\Users\shady\carexportch\crm — schema.sql / db.mjs). Ported rather than
// imported because that project lives outside this repo and isn't a package.
//
// IMPORTANT: this opens a local SQLite file by filesystem path. That only
// works on a host with access to CRM_DB_PATH (e.g. this machine). It will NOT
// work on Vercel's serverless functions, which have no access to another
// project's local file and no durable filesystem between invocations. See the
// deploy note this was flagged with — this needs a hosted database (Turso/
// libSQL, Postgres, etc.) or an API in front of the CRM before going live.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.CRM_DB_PATH || "C:\\Users\\shady\\carexportch\\crm\\quotes.db";
const SCHEMA_PATH = process.env.CRM_SCHEMA_PATH || path.join(path.dirname(DB_PATH), "schema.sql");

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      `CRM database not found at ${DB_PATH}. Set CRM_DB_PATH to point at the carexportch crm/quotes.db file.`
    );
  }
  const instance = new DatabaseSync(DB_PATH);
  if (fs.existsSync(SCHEMA_PATH)) instance.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  migrate(instance);
  db = instance;
  return instance;
}

// Additive, guarded migration kept here rather than in the shared
// carexportch/crm/schema.sql — that file belongs to a separate project's own
// CLI tooling, which doesn't need to know about this column. Explicit column
// lists in both codebases' INSERTs mean a new nullable-default column can't
// break either side. Defaults to 0 (no consent) for every existing row,
// including real historical customers already in this database — nothing
// becomes publicly visible just because this column now exists.
function migrate(instance: DatabaseSync): void {
  const columns = instance.prepare("PRAGMA table_info(quotes)").all() as Row[];
  const hasConsent = columns.some((c) => c.name === "public_consent");
  if (!hasConsent) {
    instance.exec("ALTER TABLE quotes ADD COLUMN public_consent INTEGER NOT NULL DEFAULT 0");
  }
}

type Row = Record<string, unknown>;

function nextRef(instance: DatabaseSync): string {
  const rows = instance.prepare("SELECT ref FROM quotes WHERE ref LIKE 'EST%'").all() as Row[];
  let max = 0;
  for (const { ref } of rows) {
    const n = parseInt(String(ref).slice(3), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return "EST" + String(max + 1).padStart(4, "0");
}

function findOrCreateCustomer(
  instance: DatabaseSync,
  { name, phone, email, city, country, notes }: { name: string; phone?: string | null; email?: string | null; city?: string | null; country?: string | null; notes?: string | null }
): Row {
  if (!name) throw new Error("customer name is required");
  let row: Row | undefined;
  if (phone) row = instance.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) as Row | undefined;
  if (!row && email) row = instance.prepare("SELECT * FROM customers WHERE email = ?").get(email) as Row | undefined;
  if (row) return row;
  const info = instance
    .prepare("INSERT INTO customers (name, phone, email, city, country, notes) VALUES (?, ?, ?, ?, ?, ?)")
    .run(name, phone ?? null, email ?? null, city ?? null, country ?? null, notes ?? null);
  return instance.prepare("SELECT * FROM customers WHERE id = ?").get(info.lastInsertRowid) as Row;
}

function recalc(instance: DatabaseSync, ref: string): void {
  const quote = instance.prepare("SELECT * FROM quotes WHERE ref = ?").get(ref) as Row | undefined;
  if (!quote) throw new Error(`no quote with ref ${ref}`);
  const items = instance.prepare("SELECT * FROM quote_items WHERE quote_id = ?").all(quote.id) as Row[];
  const itemsSubtotal = items.reduce((sum, it) => sum + (it.fob_final as number) * (it.qty as number), 0);
  const cifTotal = itemsSubtotal + (quote.freight_cost as number) + (quote.insurance_cost as number);
  const depositAmount = cifTotal * ((quote.deposit_pct as number) / 100);
  const balanceAmount = cifTotal - depositAmount;
  const dutyPct = quote.duty_pct as number | null;
  const dutyEstimate = (quote.duty_estimate_override as number | null) ?? (dutyPct != null ? itemsSubtotal * (dutyPct / 100) : null);
  const grandTotal = cifTotal + (dutyEstimate ?? 0);
  instance
    .prepare(
      `UPDATE quotes SET cif_total = ?, deposit_amount = ?, balance_amount = ?, duty_estimate = ?,
       grand_total_reference = ?, updated_at = datetime('now') WHERE ref = ?`
    )
    .run(cifTotal, depositAmount, balanceAmount, dutyEstimate, grandTotal, ref);
}

function createQuote(
  instance: DatabaseSync,
  q: { customerId: number | bigint; destinationPort: string; destinationCountry: string; notes?: string | null; status?: string; publicConsent?: boolean }
): string {
  const ref = nextRef(instance);
  instance
    .prepare(
      `INSERT INTO quotes
        (ref, customer_id, quote_date, destination_port, destination_country, shipping_mode,
         container_note, freight_cost, insurance_cost, deposit_pct, duty_pct, duty_estimate_override,
         currency, status, notes, public_consent)
       VALUES (?,?,date('now'),?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      ref,
      q.customerId,
      q.destinationPort,
      q.destinationCountry,
      null,
      null,
      0,
      0,
      40,
      null,
      null,
      "USD",
      q.status ?? "quoted",
      q.notes ?? null,
      q.publicConsent ? 1 : 0
    );
  recalc(instance, ref);
  return ref;
}

function addFollowUp(instance: DatabaseSync, ref: string, note: string): void {
  const quote = instance.prepare("SELECT id FROM quotes WHERE ref = ?").get(ref) as Row | undefined;
  if (!quote) throw new Error(`no quote with ref ${ref}`);
  instance.prepare("INSERT INTO follow_ups (quote_id, note) VALUES (?, ?)").run(quote.id, note);
}

export type WebLead = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  vehicle?: string | null;
  budget?: string | null;
  destination?: string | null;
  quantity?: number | null;
  message?: string | null;
  source: string;
  // Explicit opt-in only — never inferred, never defaulted to true. Controls
  // whether this specific quote's anonymized status can appear in
  // getShipmentUpdates(); the customer's name/phone/email are never exposed
  // regardless of this flag.
  publicConsent?: boolean;
};

// Mirrors the add-customer / add-quote pattern the CRM CLI already uses so web
// leads land in the same `quotes` table (and EST#### numbering) as
// staff-issued quotes, tagged by `source` so they're identifiable later.
export function saveLead(lead: WebLead): string {
  const instance = getDb();
  const customer = findOrCreateCustomer(instance, {
    name: lead.name,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    city: null,
    country: lead.destination ?? null,
    notes: lead.company ? `Company: ${lead.company}` : null,
  });
  const summaryLines = [
    `Web lead via ${lead.source} (hainaauto.com)`,
    lead.vehicle ? `Vehicle: ${lead.vehicle}` : null,
    lead.budget ? `Budget: ${lead.budget}` : null,
    lead.quantity ? `Quantity: ${lead.quantity}` : null,
  ].filter(Boolean);
  const ref = createQuote(instance, {
    customerId: customer.id as number,
    destinationPort: lead.destination || "Not specified",
    destinationCountry: lead.destination || "Not specified",
    notes: summaryLines.join(" · "),
    status: "quoted",
    publicConsent: lead.publicConsent === true,
  });
  if (lead.message) addFollowUp(instance, ref, lead.message);
  return ref;
}

export type QuoteStatusResult = {
  ref: string;
  status: string;
  destinationCountry: string;
  quoteDate: string;
  updatedAt: string;
};

// Deliberately returns only non-sensitive fields: quote refs are short and
// guessable (EST0001, EST0002, ...) and this database is shared with the
// sibling business's real customers, so no pricing or contact details are
// exposed to an unauthenticated lookup by ref alone.
export function getQuoteStatus(ref: string): QuoteStatusResult | null {
  const instance = getDb();
  const quote = instance.prepare("SELECT ref, status, destination_country, quote_date, updated_at FROM quotes WHERE ref = ?").get(ref) as Row | undefined;
  if (!quote) return null;
  return {
    ref: quote.ref as string,
    status: quote.status as string,
    destinationCountry: quote.destination_country as string,
    quoteDate: quote.quote_date as string,
    updatedAt: quote.updated_at as string,
  };
}

export type ShipmentUpdate = {
  ref: string;
  destinationCountry: string;
  status: string;
  updatedAt: string;
};

// Only quotes whose customer explicitly opted in at submission time
// (public_consent = 1) — never name, phone, email, or any financial figure,
// regardless of consent. Real historical rows created before this column
// existed default to 0 and are excluded automatically.
export function getShipmentUpdates(limit = 20): ShipmentUpdate[] {
  const instance = getDb();
  const rows = instance
    .prepare(
      `SELECT ref, destination_country, status, updated_at FROM quotes
       WHERE public_consent = 1 ORDER BY updated_at DESC LIMIT ?`
    )
    .all(limit) as Row[];
  return rows.map((r) => ({
    ref: r.ref as string,
    destinationCountry: r.destination_country as string,
    status: r.status as string,
    updatedAt: r.updated_at as string,
  }));
}
