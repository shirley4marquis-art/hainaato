import { Pool } from "pg";
import { createHash, randomUUID } from "node:crypto";
import { DocumentError, type DocumentType, type DocumentLanguage, type Template, type TemplateFile, type TemplateMapping, type GeneratedDocument } from "./types";
import { inspectPdf } from "./pdf";
import { prepareTemplate } from "./prepare-template";

let pool: Pool | undefined;
export function documentPool() {
  if (!process.env.CRM_DATABASE_URL) throw new DocumentError("Document storage is not configured.", 503);
  return pool ??= new Pool({ connectionString: process.env.CRM_DATABASE_URL, max: 4 });
}
type Row = Record<string, unknown>;
const metadata = (r: Row): Template => ({ id: String(r.id), familyId: String(r.family_id), version: Number(r.version), name: String(r.name), type: r.document_type as DocumentType, language: r.language as DocumentLanguage, originalName: String(r.original_name), sha256: String(r.sha256), pages: r.pages as Template["pages"], mapping: r.mapping as TemplateMapping, active: r.active === true, createdAt: new Date(r.created_at as string).toISOString(), updatedAt: new Date(r.updated_at as string).toISOString(), isDefault: r.is_default === true });
const COLUMNS = "t.id,t.family_id,t.version,t.name,t.document_type,t.language,t.original_name,t.sha256,t.pages,t.mapping,t.active,t.created_at,t.updated_at";
export async function listTemplates(): Promise<Template[]> {
  const { rows } = await documentPool().query(`SELECT ${COLUMNS}, d.template_id IS NOT NULL AS is_default FROM document_templates t LEFT JOIN document_template_defaults d ON d.template_id=t.id ORDER BY t.created_at DESC LIMIT 250`);
  return rows.map(metadata);
}
export async function getTemplate(id: string): Promise<TemplateFile> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new DocumentError("Invalid template ID.", 400);
  const { rows } = await documentPool().query("SELECT * FROM document_templates WHERE id=$1", [id]);
  if (!rows[0]) throw new DocumentError("Unable to load PDF template.", 404);
  return { ...metadata(rows[0]), original: rows[0].original_pdf, prepared: rows[0].prepared_pdf };
}
export async function defaultTemplate(type: DocumentType, language: DocumentLanguage): Promise<TemplateFile> {
  const { rows } = await documentPool().query("SELECT template_id FROM document_template_defaults WHERE document_type=$1 AND language=$2", [type, language]);
  if (!rows[0]) throw new DocumentError(`Select an active ${language} ${type.replaceAll("_", " ")} template in Admin → Documents → Templates.`);
  const template = await getTemplate(rows[0].template_id);
  if (!template.active || !template.mapping.reviewed) throw new DocumentError("The selected template is inactive or needs mapping review.");
  return template;
}
export async function saveTemplate(input: { name: string; type: DocumentType; language: DocumentLanguage; originalName: string; original: Buffer; mapping: TemplateMapping; previousId?: string; activate?: boolean }): Promise<Template> {
  const pages = await inspectPdf(input.original);
  const prepared = await prepareTemplate(input.original, input.mapping);
  if (input.activate && (!input.mapping.reviewed || (!input.mapping.fields.length && input.type !== "other" && input.type !== "importation_terms"))) throw new DocumentError("Review and save the dynamic fields before activating this template.");
  const prior = input.previousId ? await getTemplate(input.previousId) : null;
  const client = await documentPool().connect();
  try {
    await client.query("BEGIN");
    const family = prior?.familyId ?? randomUUID();
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`template:${family}`]);
    const version = Number((await client.query("SELECT COALESCE(MAX(version),0)+1 AS n FROM document_templates WHERE family_id=$1", [family])).rows[0].n);
    const id = randomUUID();
    const { rows } = await client.query(`INSERT INTO document_templates(id,family_id,version,name,document_type,language,original_name,original_pdf,prepared_pdf,sha256,mapping,pages,active)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ${COLUMNS.replaceAll("t.", "")}`, [id, family, version, input.name.slice(0, 160), input.type, input.language, input.originalName.slice(0, 200), input.original, prepared, createHash("sha256").update(input.original).digest("hex"), JSON.stringify(input.mapping), JSON.stringify(pages), input.activate === true]);
    if (input.activate) await client.query(`INSERT INTO document_template_defaults(document_type,language,template_id) VALUES($1,$2,$3) ON CONFLICT(document_type,language) DO UPDATE SET template_id=EXCLUDED.template_id`, [input.type, input.language, id]);
    await client.query("COMMIT");
    return metadata(rows[0]);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
export async function setTemplateActive(id: string, active: boolean) {
  const template = await getTemplate(id);
  if (active && !template.mapping.reviewed) throw new DocumentError("Review this template before activating it.");
  await documentPool().query("UPDATE document_templates SET active=$2,updated_at=now() WHERE id=$1", [id, active]);
}
export { reserveDocumentNumber as nextDocumentNumber } from "./numbering";
export function documentFilename(type: DocumentType, number: string, language: DocumentLanguage) {
  const label = { quotation: "Quotation", contract: "Contrato", proforma: "Proforma", invoice: "Invoice", specification: "Vehicle-Specification" }[type as "quotation"] ?? type;
  return `HainaAuto-${label}-${number}-${language.toUpperCase()}.pdf`.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 180);
}
export function generatedMetadata(r: Row): GeneratedDocument { return { id: String(r.id), number: String(r.document_number), filename: String(r.filename), type: r.document_type as DocumentType, language: r.language as DocumentLanguage, quoteRef: String(r.quote_ref), templateId: String(r.template_id), createdAt: new Date(r.created_at as string).toISOString() }; }
export async function listDocuments(quoteRef?: string) {
  const { rows } = await documentPool().query(`SELECT id,document_number,filename,document_type,language,quote_ref,template_id,created_at FROM generated_documents WHERE ($1::text IS NULL OR quote_ref=$1) ORDER BY created_at DESC LIMIT 100`, [quoteRef ?? null]);
  return rows.map(generatedMetadata);
}
export async function getDocument(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new DocumentError("Invalid document ID.", 400);
  const { rows } = await documentPool().query("SELECT * FROM generated_documents WHERE id=$1", [id]);
  if (!rows[0]) throw new DocumentError("Document not found.", 404);
  return { ...generatedMetadata(rows[0]), pdf: rows[0].pdf as Buffer };
}
