// Isolated schema inside one rolled-back transaction; never changes business rows.
const {readFileSync}=require('node:fs');
const {randomUUID}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const {Client}=require('pg');
(async()=>{
 const client=new Client({connectionString:process.env.CRM_DATABASE_URL,connectionTimeoutMillis:10000});
 await client.connect();
 try{
  await client.query('BEGIN');
  const schema='admin_check_'+randomUUID().replaceAll('-','');
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}"`);
  await client.query(readFileSync('supabase/crm-schema.sql','utf8'));
  const migration=readFileSync('supabase/migrations/202609070001_operations.sql','utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
  await client.query(migration);
  await client.query(migration);
  const c=await client.query("INSERT INTO customers(name) VALUES('Verification only') RETURNING id");
  await client.query("INSERT INTO quotes(ref,customer_id,destination_port,destination_country) VALUES('TEST', $1, 'Test', 'Test')",[c.rows[0].id]);
  const id=randomUUID();
  await client.query("INSERT INTO admin_documents(id,number,quote_ref,customer_id,type,language,snapshot,actor) VALUES($1,'TEST-1','TEST',$2,'quote','es','{}','test')",[id,c.rows[0].id]);
  const {rows}=await client.query("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace=$1::regnamespace AND relname IN ('admin_documents','admin_drafts','admin_operations','admin_activity')",[schema]);
  if(rows.length!==4||rows.some(r=>!r.relrowsecurity))throw new Error('RLS check failed');
  for(const [label,sql,args] of [
   ['duplicate number',"INSERT INTO admin_documents(id,number,quote_ref,customer_id,type,language,snapshot,actor) VALUES($1,'TEST-1','TEST',$2,'quote','es','{}','test')",[randomUUID(),c.rows[0].id]],
   ['invalid language',"UPDATE admin_documents SET language='bad' WHERE id=$1",[id]],
   ['referenced order deletion',"DELETE FROM quotes WHERE ref='TEST'",[]]
  ]){await client.query('SAVEPOINT check_constraint');let failed=false;try{await client.query(sql,args);}catch{failed=true;}await client.query('ROLLBACK TO SAVEPOINT check_constraint');if(!failed)throw new Error(`Constraint failed: ${label}`);}
  console.log('PASS: migration is repeatable; RLS, document uniqueness, language checks and order references enforced.');
 }finally{await client.query('ROLLBACK');await client.end();console.log('Verification transaction rolled back.');}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
