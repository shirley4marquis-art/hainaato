import type { PoolClient } from "pg";
import type { DocumentType } from "./types";
const PREFIX: Record<DocumentType, string> = { quotation: "QT", proforma: "PI", invoice: "INV", contract: "CT", specification: "SP", importation_terms: "IT", inspection: "IR", acquisition: "AC", export: "EX", customs: "CU", other: "DOC" };
export async function reserveDocumentNumber(client: PoolClient, type: DocumentType, year = new Date().getUTCFullYear()): Promise<string> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`document-number:${type}:${year}`]);
  const prefix = `HA-${PREFIX[type]}-${year}-`;
  const legacy = type === "quotation" ? Number((await client.query("SELECT COALESCE(MAX(substring(document_number from '[0-9]+$')::bigint),0) AS n FROM quotes WHERE document_number ~ $1", [`^HA-QT-${year}-[0-9]+$`])).rows[0].n) : 0;
  const migrated = (await client.query("SELECT to_regclass('public.document_number_counters') AS table_name")).rows[0].table_name;
  // Old quote creation remains functional during a rolling migration.
  if (!migrated && type === "quotation") return prefix + String(legacy + 1).padStart(4, "0");
  const { rows } = await client.query(`INSERT INTO document_number_counters(document_type,year,last_number) VALUES($1,$2,$3)
    ON CONFLICT(document_type,year) DO UPDATE SET last_number=GREATEST(document_number_counters.last_number+1,EXCLUDED.last_number) RETURNING last_number`, [type, year, legacy + 1]);
  return prefix + String(rows[0].last_number).padStart(4, "0");
}
