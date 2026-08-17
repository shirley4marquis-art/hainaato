// Writes HainaAuto website leads into HainaAuto's own quotes/customers CRM
// database (Supabase project "hainaauto-crm", Postgres). This used to open a
// local SQLite file shared with a sibling project's CRM (TransPacífico
// Motors) — that only worked from this one machine and had no reach from
// Vercel's serverless functions, and mixed two different businesses' data in
// one database. See supabase/crm-schema.sql for the schema this talks to.
import { Pool, type PoolClient } from "pg";

const CONNECTION_STRING = process.env.CRM_DATABASE_URL;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!CONNECTION_STRING) {
    throw new Error("CRM_DATABASE_URL is not set — the CRM database connection string is required.");
  }
  if (!pool) pool = new Pool({ connectionString: CONNECTION_STRING });
  return pool;
}

type Row = Record<string, unknown>;

async function nextRef(client: PoolClient): Promise<string> {
  const { rows } = await client.query<{ ref: string }>("SELECT ref FROM quotes WHERE ref LIKE 'EST%'");
  let max = 0;
  for (const { ref } of rows) {
    const n = parseInt(ref.slice(3), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return "EST" + String(max + 1).padStart(4, "0");
}

async function findOrCreateCustomer(
  client: PoolClient,
  { name, phone, email, city, country, notes }: { name: string; phone?: string | null; email?: string | null; city?: string | null; country?: string | null; notes?: string | null }
): Promise<Row> {
  if (!name) throw new Error("customer name is required");
  let row: Row | undefined;
  if (phone) row = (await client.query("SELECT * FROM customers WHERE phone = $1", [phone])).rows[0];
  if (!row && email) row = (await client.query("SELECT * FROM customers WHERE email = $1", [email])).rows[0];
  if (row) return row;
  const { rows } = await client.query(
    "INSERT INTO customers (name, phone, email, city, country, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [name, phone ?? null, email ?? null, city ?? null, country ?? null, notes ?? null]
  );
  return rows[0];
}

async function recalc(client: PoolClient, ref: string): Promise<void> {
  const quote = (await client.query("SELECT * FROM quotes WHERE ref = $1", [ref])).rows[0] as Row | undefined;
  if (!quote) throw new Error(`no quote with ref ${ref}`);
  const items = (await client.query("SELECT * FROM quote_items WHERE quote_id = $1", [quote.id])).rows as Row[];
  const itemsSubtotal = items.reduce((sum, it) => sum + (it.fob_final as number) * (it.qty as number), 0);
  const cifTotal = itemsSubtotal + (quote.freight_cost as number) + (quote.insurance_cost as number);
  const depositAmount = cifTotal * ((quote.deposit_pct as number) / 100);
  const balanceAmount = cifTotal - depositAmount;
  const dutyPct = quote.duty_pct as number | null;
  const dutyEstimate = (quote.duty_estimate_override as number | null) ?? (dutyPct != null ? itemsSubtotal * (dutyPct / 100) : null);
  const grandTotal = cifTotal + (dutyEstimate ?? 0);
  await client.query(
    `UPDATE quotes SET cif_total = $1, deposit_amount = $2, balance_amount = $3, duty_estimate = $4,
     grand_total_reference = $5, updated_at = now() WHERE ref = $6`,
    [cifTotal, depositAmount, balanceAmount, dutyEstimate, grandTotal, ref]
  );
}

async function createQuote(
  client: PoolClient,
  q: { customerId: number; destinationPort: string; destinationCountry: string; notes?: string | null; status?: string; publicConsent?: boolean }
): Promise<string> {
  const ref = await nextRef(client);
  await client.query(
    `INSERT INTO quotes
      (ref, customer_id, destination_port, destination_country, shipping_mode,
       container_note, freight_cost, insurance_cost, deposit_pct, duty_pct, duty_estimate_override,
       currency, status, notes, public_consent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
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
      q.publicConsent === true,
    ]
  );
  await recalc(client, ref);
  return ref;
}

async function addFollowUp(client: PoolClient, ref: string, note: string): Promise<void> {
  const quote = (await client.query("SELECT id FROM quotes WHERE ref = $1", [ref])).rows[0] as Row | undefined;
  if (!quote) throw new Error(`no quote with ref ${ref}`);
  await client.query("INSERT INTO follow_ups (quote_id, note) VALUES ($1, $2)", [quote.id, note]);
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
// Wrapped in a transaction: a customer created but its quote failing to
// insert (or vice versa) would otherwise leave orphaned/partial rows.
export async function saveLead(lead: WebLead): Promise<string> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const customer = await findOrCreateCustomer(client, {
      name: lead.name,
      phone: lead.phone ?? null,
      email: lead.email ?? null,
      city: null,
      country: lead.destination ?? null,
      notes: lead.company ? `Company: ${lead.company}` : null,
    });
    const summaryLines = [
      `Web lead via ${lead.source} (hainaautochina.com)`,
      lead.vehicle ? `Vehicle: ${lead.vehicle}` : null,
      lead.budget ? `Budget: ${lead.budget}` : null,
      lead.quantity ? `Quantity: ${lead.quantity}` : null,
    ].filter(Boolean);
    const ref = await createQuote(client, {
      customerId: customer.id as number,
      destinationPort: lead.destination || "Not specified",
      destinationCountry: lead.destination || "Not specified",
      notes: summaryLines.join(" · "),
      status: "quoted",
      publicConsent: lead.publicConsent === true,
    });
    if (lead.message) await addFollowUp(client, ref, lead.message);
    await client.query("COMMIT");
    return ref;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type QuoteStatusResult = {
  ref: string;
  status: string;
  destinationCountry: string;
  quoteDate: string;
  updatedAt: string;
};

// Deliberately returns only non-sensitive fields: quote refs are short and
// guessable (EST0001, EST0002, ...), so no pricing or contact details are
// exposed to an unauthenticated lookup by ref alone.
export async function getQuoteStatus(ref: string): Promise<QuoteStatusResult | null> {
  const { rows } = await getPool().query(
    "SELECT ref, status, destination_country, quote_date, updated_at FROM quotes WHERE ref = $1",
    [ref]
  );
  const quote = rows[0] as Row | undefined;
  if (!quote) return null;
  return {
    ref: quote.ref as string,
    status: quote.status as string,
    destinationCountry: quote.destination_country as string,
    quoteDate: (quote.quote_date as Date).toISOString().slice(0, 10),
    updatedAt: (quote.updated_at as Date).toISOString(),
  };
}

export type ShipmentUpdate = {
  ref: string;
  destinationCountry: string;
  status: string;
  updatedAt: string;
};

// Only quotes whose customer explicitly opted in at submission time
// (public_consent = true) — never name, phone, email, or any financial
// figure, regardless of consent.
export async function getShipmentUpdates(limit = 20): Promise<ShipmentUpdate[]> {
  const { rows } = await getPool().query(
    `SELECT ref, destination_country, status, updated_at FROM quotes
     WHERE public_consent = true ORDER BY updated_at DESC LIMIT $1`,
    [limit]
  );
  return (rows as Row[]).map((r) => ({
    ref: r.ref as string,
    destinationCountry: r.destination_country as string,
    status: r.status as string,
    updatedAt: (r.updated_at as Date).toISOString(),
  }));
}
