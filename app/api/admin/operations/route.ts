import { requireAdmin, apiError, validId } from "../../../../lib/admin-api";
import { getPool } from "../../../../lib/crm";
import { listOperations } from "../../../../lib/admin-store";
const STATES: Record<string,string[]> = { payment:["pending","confirmed","rejected"],shipment:["booked","in_transit","arrived","completed"],customs:["pending","cleared","completed"],vehicle:["available","reserved","sold"] };
export async function GET(request: Request) { try { await requireAdmin(); const url=new URL(request.url); return Response.json({ok:true,records:await listOperations(url.searchParams.get("kind") ?? undefined)}); } catch(e) { return apiError(e); } }
export async function POST(request: Request) {
 let client;
 try {
  const user=await requireAdmin(request); const input=await request.json();
  if (!validId(input.id) || !STATES[input.kind]?.includes(input.status) || typeof input.title!=="string" || !input.title.trim() || input.title.length>300 || !input.data || typeof input.data!=="object" || Array.isArray(input.data) || Object.values(input.data).some(v=>typeof v!=="string") || JSON.stringify(input.data).length>20000) throw new Error("Invalid record details.");
  if (input.kind!=="vehicle" && (typeof input.quote_ref!=="string" || !input.quote_ref)) throw new Error("Invalid order. Choose an order.");
  if (input.kind==="payment" && (!Number.isFinite(Number(input.data.amount)) || Number(input.data.amount)<=0 || !["USD","EUR","CNY"].includes(input.data.currency) || !input.data.reference?.trim())) throw new Error("Invalid payment. Enter a positive amount, currency and bank reference.");
  client=await getPool().connect(); await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[input.id]);
  if(input.kind==="payment") {
   const q=await client.query("SELECT currency FROM quotes WHERE ref=$1",[input.quote_ref]);
   if(!q.rows[0] || q.rows[0].currency!==input.data.currency) throw new Error("Invalid currency. Payment currency must match the order.");
  }
  const existing=await client.query("SELECT * FROM admin_operations WHERE id=$1 FOR UPDATE",[input.id]);
  if(existing.rows[0]) {
   if(!input.version) { await client.query("COMMIT"); return Response.json({ok:true,id:input.id}); }
   if(existing.rows[0].version!==input.version) throw new Error("Record changed by another admin. Reload before saving.");
   if(existing.rows[0].kind!==input.kind || existing.rows[0].quote_ref!==(input.quote_ref || null)) throw new Error("Invalid record association.");
   await client.query("UPDATE admin_operations SET title=$1,status=$2,data=$3,version=version+1,updated_at=now() WHERE id=$4",[input.title.trim(),input.status,JSON.stringify(input.data),input.id]);
  } else await client.query("INSERT INTO admin_operations(id,kind,quote_ref,title,status,data,actor) VALUES($1,$2,$3,$4,$5,$6,$7)",[input.id,input.kind,input.quote_ref || null,input.title.trim(),input.status,JSON.stringify(input.data),user.id]);
  await client.query("INSERT INTO admin_activity(actor,action,reference,quote_ref) VALUES($1,$2,$3,$4)",[user.id,`${input.kind}: ${input.status}`,input.id,input.quote_ref || null]);
  await client.query("COMMIT"); return Response.json({ok:true,id:input.id});
 } catch(e) { if(client) await client.query("ROLLBACK"); return apiError(e); } finally { client?.release(); }
}
