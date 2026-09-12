import {requireAdmin,apiError,validId} from "../../../../lib/admin-api";
import {getPool} from "../../../../lib/crm";
export async function POST(request:Request){let client;try{
 const user=await requireAdmin(request);const b=await request.json();
 if(!validId(b.requestId)||typeof b.name!=="string"||!b.name.trim()||b.name.length>200||[b.phone,b.email,b.address,b.city,b.country,b.notes].some(v=>typeof v!=="string"||v.length>5000))throw new Error("Invalid customer details.");
 client=await getPool().connect();await client.query("BEGIN");await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[b.requestId]);
 const values=[b.name.trim(),b.phone||null,b.email||null,b.address||null,b.city||null,b.country||null,b.notes||null];
 let id;
 if(b.id){if(!b.updatedAt)throw new Error("Invalid customer version. Reload before saving.");const result=await client.query("UPDATE customers SET name=$1,phone=$2,email=$3,address=$4,city=$5,country=$6,notes=$7,updated_at=now() WHERE id=$8 AND date_trunc('milliseconds',updated_at)=$9::timestamptz RETURNING id",[...values,b.id,b.updatedAt]);if(!result.rows[0])throw new Error("Customer changed by another admin. Reload before saving.");id=result.rows[0].id;}
 else {const existing=await client.query("SELECT id FROM customers WHERE request_id=$1",[b.requestId]);if(existing.rows[0])id=existing.rows[0].id;else{const created=await client.query("INSERT INTO customers(name,phone,email,address,city,country,notes,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[...values,b.requestId]);id=created.rows[0].id;}}
 await client.query("INSERT INTO admin_activity(actor,action,reference) VALUES($1,'Customer saved',$2)",[user.id,String(id)]);
 await client.query("COMMIT");return Response.json({ok:true,id});
 }catch(e){if(client)await client.query("ROLLBACK");return apiError(e);}finally{client?.release();}}
