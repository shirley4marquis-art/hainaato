import { getPool, adminGetQuote } from "./crm";
import { DOCUMENT_TYPES, makeSnapshot, type BusinessDocument, type DocumentType, type Language, type Operation } from "./documents/model";

export async function listOperations(kind?: string, ref?: string): Promise<Operation[]> {
 const { rows } = await getPool().query("SELECT * FROM admin_operations WHERE ($1::text IS NULL OR kind=$1) AND ($2::text IS NULL OR quote_ref=$2) ORDER BY created_at DESC LIMIT 500", [kind ?? null, ref ?? null]);
 return JSON.parse(JSON.stringify(rows));
}
export async function listDocuments(ref?: string, customer?: number): Promise<BusinessDocument[]> {
 const { rows } = await getPool().query("SELECT * FROM admin_documents WHERE ($1::text IS NULL OR quote_ref=$1) AND ($2::bigint IS NULL OR customer_id=$2) ORDER BY created_at DESC LIMIT 500", [ref ?? null, customer ?? null]);
 return JSON.parse(JSON.stringify(rows));
}
export async function getDocument(id: string): Promise<BusinessDocument | null> {
 if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
 const { rows } = await getPool().query("SELECT * FROM admin_documents WHERE id=$1",[id]);
 return rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
}
export async function generateDocument(input: { expectedUpdatedAt?: string; id: string; ref: string; type: DocumentType; language: Language; notes: string; paymentTerms: string }, actor: string) {
 const client = await getPool().connect();
 try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[input.id]);
  const existing = await client.query("SELECT id FROM admin_documents WHERE id=$1",[input.id]);
  if (existing.rows[0]) { await client.query("COMMIT"); return input.id; }
  // Serialize against edits/deletion while the complete snapshot is read.
  const locked = await client.query("SELECT ref FROM quotes WHERE ref=$1 FOR UPDATE",[input.ref]);
  if (!locked.rows[0]) throw new Error("Order not found.");
  const quote = await adminGetQuote(input.ref);
  if (!quote || !quote.items.length) throw new Error("Add vehicles to the order before generating a document.");
  if (input.expectedUpdatedAt && quote.updatedAt !== input.expectedUpdatedAt) throw new Error("Order changed by another admin. Preview again before generating.");
  if (["invoice","contract","shipping","supply","traceability","export"].includes(input.type) && quote.items.some(v=>!v.vin?.trim() || v.qty!==1)) throw new Error("Invalid vehicle details. Assign one VIN per vehicle before issuing this document.");
  const operations = await listOperations(undefined,input.ref);
  if (["receipt","confirmation"].includes(input.type) && !operations.some(o => o.kind === "payment" && o.status === "confirmed")) throw new Error("Invalid payment records. Confirm a payment before generating a receipt or confirmation.");
  const scope = `ND-${DOCUMENT_TYPES[input.type][2]}-${new Date().getUTCFullYear()}`;
  const { rows } = await client.query("INSERT INTO admin_document_counters(scope,value) VALUES($1,1) ON CONFLICT(scope) DO UPDATE SET value=admin_document_counters.value+1 RETURNING value",[scope]);
  const number = `${scope}-${String(rows[0].value).padStart(4,"0")}`;
  const snapshot = makeSnapshot(quote,input.type,input.language,operations,input.notes,input.paymentTerms);
  await client.query("INSERT INTO admin_documents(id,number,quote_ref,customer_id,type,language,snapshot,actor) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[input.id,number,input.ref,quote.customer.id,input.type,input.language,JSON.stringify(snapshot),actor]);
  await client.query("INSERT INTO admin_activity(actor,action,reference,quote_ref) VALUES($1,'Document generated',$2,$3)",[actor,number,input.ref]);
  await client.query("COMMIT");
  return input.id;
 } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
export async function operationStats() {
 const { rows } = await getPool().query(`SELECT
 (SELECT count(*)::int FROM admin_documents WHERE status='draft') AS pending_documents,
 (SELECT count(*)::int FROM admin_documents WHERE status<>'draft' AND created_at>now()-interval '7 days') AS recent_documents,
 (SELECT count(*)::int FROM admin_operations WHERE kind='payment' AND status='pending') AS pending_payments,
 (SELECT count(*)::int FROM admin_operations WHERE kind='shipment' AND status='booked') AS awaiting_shipping,
 (SELECT count(*)::int FROM admin_operations WHERE kind='shipment' AND status='in_transit') AS in_transit`);
 return rows[0] as Record<string,number>;
}
