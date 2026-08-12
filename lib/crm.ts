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
  db = instance;
  return instance;
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
  q: { customerId: number | bigint; destinationPort: string; destinationCountry: string; notes?: string | null; status?: string }
): string {
  const ref = nextRef(instance);
  instance
    .prepare(
      `INSERT INTO quotes
        (ref, customer_id, quote_date, destination_port, destination_country, shipping_mode,
         container_note, freight_cost, insurance_cost, deposit_pct, duty_pct, duty_estimate_override,
         currency, status, notes)
       VALUES (?,?,date('now'),?,?,?,?,?,?,?,?,?,?,?,?)`
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
      q.notes ?? null
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
