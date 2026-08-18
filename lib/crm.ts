// Writes HainaAuto website leads into HainaAuto's own quotes/customers CRM
// database (Supabase project "hainaauto-crm", Postgres). This used to open a
// local SQLite file shared with a sibling project's CRM (TransPacífico
// Motors) — that only worked from this one machine and had no reach from
// Vercel's serverless functions, and mixed two different businesses' data in
// one database. See supabase/crm-schema.sql for the schema this talks to.
import { Pool, type PoolClient, types } from "pg";

// pg's default DATE parser builds a JS Date at local-timezone midnight, then
// call sites convert back to a "YYYY-MM-DD" string via toISOString() — for
// any positive UTC offset that silently rolls the date back a day (e.g.
// UTC+1: 2026-08-15 local midnight is 2026-08-14T23:00:00Z). These columns
// are pure calendar dates with no time component, so the fix is to just
// never construct a Date from them — OID 1082 is Postgres's `date` type.
types.setTypeParser(1082, (value: string) => value);

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
  const cifTotal =
    itemsSubtotal +
    (quote.inland_transport_cost as number) +
    (quote.export_documentation_cost as number) +
    (quote.freight_cost as number) +
    (quote.insurance_cost as number);
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

// Customer-facing document number (HA-QT-{year}-{seq}), separate from the
// internal EST#### ref — scoped per calendar year, matching the printed
// sample (HA-QT-2026-0002).
async function nextDocumentNumber(client: PoolClient, year: number): Promise<string> {
  const prefix = `HA-QT-${year}-`;
  const { rows } = await client.query<{ document_number: string }>(
    "SELECT document_number FROM quotes WHERE document_number LIKE $1",
    [`${prefix}%`]
  );
  let max = 0;
  for (const { document_number } of rows) {
    const n = parseInt(document_number.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
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
    quoteDate: quote.quote_date as string,
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

// ---------------------------------------------------------------------------
// Admin: quote drafting, editing and the printable-document data shape.
// Gated behind /admin session auth (see middleware.ts) — never called from
// public-facing routes.
// ---------------------------------------------------------------------------

export type AdminCustomerInput = {
  id?: number | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
};

export type AdminQuoteItemPhotoInput = { url: string; caption?: string | null };

export type AdminQuoteItemInput = {
  unitLabel?: string | null;
  make: string;
  model: string;
  year?: number | null;
  condition: "new" | "used";
  mileageKm?: number | null;
  fuelType?: string | null;
  engine?: string | null;
  powerHp?: number | null;
  transmission?: string | null;
  drivetrain?: string | null;
  exteriorColor?: string | null;
  interiorColor?: string | null;
  capacity?: number | null;
  historyNotes?: string | null;
  specSummary?: string | null;
  qty: number;
  fobOriginal: number;
  discount?: number;
  fobFinal: number;
  photos?: AdminQuoteItemPhotoInput[];
};

export type AdminQuoteInput = {
  ref?: string | null; // omit to create a new quote; pass to update an existing one
  documentNumber?: string | null; // omit on create to auto-generate HA-QT-{year}-####
  customer: AdminCustomerInput;
  quoteDate?: string | null;
  validUntil?: string | null;
  destinationPort: string;
  destinationCountry: string;
  incoterm?: string | null;
  deliveryEstimate?: string | null;
  inlandTransportCost?: number;
  exportDocumentationCost?: number;
  freightCost?: number;
  insuranceCost?: number;
  depositPct?: number;
  dutyPct?: number | null;
  dutyEstimateOverride?: number | null;
  currency?: string;
  language?: "en" | "es";
  status?: string;
  notes?: string | null;
  publicConsent?: boolean;
  items: AdminQuoteItemInput[];
};

// Creates a quote (ref omitted) or fully replaces an existing one's fields,
// items and photos (ref provided) in one transaction. Items/photos are
// deleted and reinserted rather than diffed — simpler and correct at the
// scale an admin tool actually needs, since a quote's line items are edited
// as a whole draft, not incrementally by many concurrent editors.
export async function adminSaveQuote(input: AdminQuoteInput): Promise<string> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    let customerId: number;
    if (input.customer.id) {
      await client.query(
        `UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, city=$5, country=$6, notes=$7 WHERE id=$8`,
        [
          input.customer.name,
          input.customer.phone ?? null,
          input.customer.email ?? null,
          input.customer.address ?? null,
          input.customer.city ?? null,
          input.customer.country ?? null,
          input.customer.notes ?? null,
          input.customer.id,
        ]
      );
      customerId = input.customer.id;
    } else {
      const customer = await findOrCreateCustomer(client, input.customer);
      // findOrCreateCustomer only sets these on insert — an existing match by
      // phone/email keeps its prior address, so update it explicitly here too.
      await client.query("UPDATE customers SET address = COALESCE($1, address) WHERE id = $2", [
        input.customer.address ?? null,
        customer.id,
      ]);
      customerId = customer.id as number;
    }

    let ref = input.ref ?? null;
    let isNew = false;
    if (!ref) {
      ref = await nextRef(client);
      isNew = true;
    }
    const documentNumber =
      input.documentNumber ?? (isNew ? await nextDocumentNumber(client, new Date().getFullYear()) : null);

    if (isNew) {
      await client.query(
        `INSERT INTO quotes
          (ref, document_number, customer_id, quote_date, valid_until, destination_port, destination_country,
           incoterm, delivery_estimate, inland_transport_cost, export_documentation_cost, freight_cost,
           insurance_cost, deposit_pct, duty_pct, duty_estimate_override, currency, language, status, notes,
           public_consent)
         VALUES ($1,$2,$3,COALESCE($4,CURRENT_DATE),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          ref,
          documentNumber,
          customerId,
          input.quoteDate ?? null,
          input.validUntil ?? null,
          input.destinationPort,
          input.destinationCountry,
          input.incoterm ?? null,
          input.deliveryEstimate ?? null,
          input.inlandTransportCost ?? 0,
          input.exportDocumentationCost ?? 0,
          input.freightCost ?? 0,
          input.insuranceCost ?? 0,
          input.depositPct ?? 40,
          input.dutyPct ?? null,
          input.dutyEstimateOverride ?? null,
          input.currency ?? "USD",
          input.language ?? "en",
          input.status ?? "quoted",
          input.notes ?? null,
          input.publicConsent === true,
        ]
      );
    } else {
      await client.query(
        `UPDATE quotes SET
           document_number=COALESCE($1,document_number), customer_id=$2,
           quote_date=COALESCE($3,quote_date), valid_until=$4, destination_port=$5, destination_country=$6,
           incoterm=$7, delivery_estimate=$8, inland_transport_cost=$9, export_documentation_cost=$10,
           freight_cost=$11, insurance_cost=$12, deposit_pct=$13, duty_pct=$14, duty_estimate_override=$15,
           currency=$16, language=$17, status=$18, notes=$19, public_consent=$20, updated_at=now()
         WHERE ref=$21`,
        [
          documentNumber,
          customerId,
          input.quoteDate ?? null,
          input.validUntil ?? null,
          input.destinationPort,
          input.destinationCountry,
          input.incoterm ?? null,
          input.deliveryEstimate ?? null,
          input.inlandTransportCost ?? 0,
          input.exportDocumentationCost ?? 0,
          input.freightCost ?? 0,
          input.insuranceCost ?? 0,
          input.depositPct ?? 40,
          input.dutyPct ?? null,
          input.dutyEstimateOverride ?? null,
          input.currency ?? "USD",
          input.language ?? "en",
          input.status ?? "quoted",
          input.notes ?? null,
          input.publicConsent === true,
          ref,
        ]
      );
    }

    const quoteRow = (await client.query("SELECT id FROM quotes WHERE ref = $1", [ref])).rows[0] as Row;
    const quoteId = quoteRow.id;

    const existingItemIds = (await client.query("SELECT id FROM quote_items WHERE quote_id = $1", [quoteId]))
      .rows as Row[];
    if (existingItemIds.length > 0) {
      const ids = existingItemIds.map((r) => r.id);
      await client.query("DELETE FROM quote_item_photos WHERE quote_item_id = ANY($1)", [ids]);
      await client.query("DELETE FROM quote_items WHERE id = ANY($1)", [ids]);
    }

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const { rows: itemRows } = await client.query(
        `INSERT INTO quote_items
           (quote_id, unit_label, make, model, year, condition, mileage_km, fuel_type, engine, power_hp,
            transmission, drivetrain, exterior_color, interior_color, capacity, history_notes, spec_summary,
            qty, fob_original, discount, fob_final, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING id`,
        [
          quoteId,
          item.unitLabel ?? null,
          item.make,
          item.model,
          item.year ?? null,
          item.condition,
          item.mileageKm ?? null,
          item.fuelType ?? null,
          item.engine ?? null,
          item.powerHp ?? null,
          item.transmission ?? null,
          item.drivetrain ?? null,
          item.exteriorColor ?? null,
          item.interiorColor ?? null,
          item.capacity ?? null,
          item.historyNotes ?? null,
          item.specSummary ?? null,
          item.qty,
          item.fobOriginal,
          item.discount ?? 0,
          item.fobFinal,
          i,
        ]
      );
      const itemId = itemRows[0].id;
      const photos = item.photos ?? [];
      for (let p = 0; p < photos.length; p++) {
        await client.query(
          "INSERT INTO quote_item_photos (quote_item_id, url, caption, sort_order) VALUES ($1,$2,$3,$4)",
          [itemId, photos[p].url, photos[p].caption ?? null, p]
        );
      }
    }

    await recalc(client, ref);
    await client.query("COMMIT");
    return ref;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type AdminQuoteSummary = {
  ref: string;
  documentNumber: string | null;
  customerName: string;
  destinationCountry: string;
  vehicleSummary: string;
  currency: string;
  cifTotal: number;
  status: string;
  createdAt: string;
};

export async function adminListQuotes(): Promise<AdminQuoteSummary[]> {
  const { rows } = await getPool().query(`
    SELECT q.ref, q.document_number, c.name AS customer_name, q.destination_country, q.currency, q.cif_total,
           q.status, q.created_at,
           (SELECT string_agg(make || ' ' || model, ', ' ORDER BY sort_order) FROM quote_items WHERE quote_id = q.id) AS vehicle_summary
    FROM quotes q JOIN customers c ON c.id = q.customer_id
    ORDER BY q.created_at DESC
  `);
  return (rows as Row[]).map((r) => ({
    ref: r.ref as string,
    documentNumber: (r.document_number as string) ?? null,
    customerName: r.customer_name as string,
    destinationCountry: r.destination_country as string,
    vehicleSummary: (r.vehicle_summary as string) ?? "—",
    currency: r.currency as string,
    cifTotal: r.cif_total as number,
    status: r.status as string,
    createdAt: (r.created_at as Date).toISOString(),
  }));
}

export type AdminQuoteDetail = Omit<AdminQuoteInput, "currency" | "language" | "depositPct"> & {
  ref: string;
  documentNumber: string | null;
  quoteDate: string;
  currency: string;
  language: "en" | "es";
  depositPct: number;
  inlandTransportCost: number;
  exportDocumentationCost: number;
  freightCost: number;
  insuranceCost: number;
  cifTotal: number;
  depositAmount: number;
  balanceAmount: number;
  dutyEstimate: number | null;
  grandTotalReference: number | null;
  customer: AdminCustomerInput & { id: number };
  items: (AdminQuoteItemInput & { id: number })[];
};

// Full read shape for the admin edit view and the print template — one
// quote, its customer, and every line item with its photos.
export async function adminGetQuote(ref: string): Promise<AdminQuoteDetail | null> {
  const { rows } = await getPool().query(
    `SELECT q.*, c.id AS c_id, c.name AS c_name, c.phone AS c_phone, c.email AS c_email, c.address AS c_address,
            c.city AS c_city, c.country AS c_country, c.notes AS c_notes
     FROM quotes q JOIN customers c ON c.id = q.customer_id WHERE q.ref = $1`,
    [ref]
  );
  const q = rows[0] as Row | undefined;
  if (!q) return null;

  const { rows: itemRows } = await getPool().query(
    "SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY sort_order", [q.id]
  );
  const itemIds = (itemRows as Row[]).map((r) => r.id);
  const photosByItem = new Map<number, AdminQuoteItemPhotoInput[]>();
  if (itemIds.length > 0) {
    const { rows: photoRows } = await getPool().query(
      "SELECT * FROM quote_item_photos WHERE quote_item_id = ANY($1) ORDER BY sort_order", [itemIds]
    );
    for (const p of photoRows as Row[]) {
      const list = photosByItem.get(p.quote_item_id as number) ?? [];
      list.push({ url: p.url as string, caption: (p.caption as string) ?? null });
      photosByItem.set(p.quote_item_id as number, list);
    }
  }

  return {
    ref: q.ref as string,
    documentNumber: (q.document_number as string) ?? null,
    customer: {
      id: q.c_id as number,
      name: q.c_name as string,
      phone: (q.c_phone as string) ?? null,
      email: (q.c_email as string) ?? null,
      address: (q.c_address as string) ?? null,
      city: (q.c_city as string) ?? null,
      country: (q.c_country as string) ?? null,
      notes: (q.c_notes as string) ?? null,
    },
    quoteDate: q.quote_date as string,
    validUntil: (q.valid_until as string) ?? null,
    destinationPort: q.destination_port as string,
    destinationCountry: q.destination_country as string,
    incoterm: (q.incoterm as string) ?? null,
    deliveryEstimate: (q.delivery_estimate as string) ?? null,
    inlandTransportCost: q.inland_transport_cost as number,
    exportDocumentationCost: q.export_documentation_cost as number,
    freightCost: q.freight_cost as number,
    insuranceCost: q.insurance_cost as number,
    depositPct: q.deposit_pct as number,
    dutyPct: (q.duty_pct as number) ?? null,
    dutyEstimateOverride: (q.duty_estimate_override as number) ?? null,
    currency: q.currency as string,
    language: q.language as "en" | "es",
    status: q.status as string,
    notes: (q.notes as string) ?? null,
    publicConsent: q.public_consent as boolean,
    cifTotal: q.cif_total as number,
    depositAmount: q.deposit_amount as number,
    balanceAmount: q.balance_amount as number,
    dutyEstimate: (q.duty_estimate as number) ?? null,
    grandTotalReference: (q.grand_total_reference as number) ?? null,
    items: (itemRows as Row[]).map((r) => ({
      id: r.id as number,
      unitLabel: (r.unit_label as string) ?? null,
      make: r.make as string,
      model: r.model as string,
      year: (r.year as number) ?? null,
      condition: r.condition as "new" | "used",
      mileageKm: (r.mileage_km as number) ?? null,
      fuelType: (r.fuel_type as string) ?? null,
      engine: (r.engine as string) ?? null,
      powerHp: (r.power_hp as number) ?? null,
      transmission: (r.transmission as string) ?? null,
      drivetrain: (r.drivetrain as string) ?? null,
      exteriorColor: (r.exterior_color as string) ?? null,
      interiorColor: (r.interior_color as string) ?? null,
      capacity: (r.capacity as number) ?? null,
      historyNotes: (r.history_notes as string) ?? null,
      specSummary: (r.spec_summary as string) ?? null,
      qty: r.qty as number,
      fobOriginal: r.fob_original as number,
      discount: r.discount as number,
      fobFinal: r.fob_final as number,
      photos: photosByItem.get(r.id as number) ?? [],
    })),
  };
}
