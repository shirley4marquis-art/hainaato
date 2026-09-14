import {createClient} from "@supabase/supabase-js";
import {AdminShell} from "../admin-shell";
import {requireAdmin} from "../../../lib/admin-api";
import {ADMIN_ROLES} from "../../../lib/supabase/roles";
import styles from "../admin.module.css";
export const dynamic="force-dynamic";
export default async function Users(){const user=await requireAdmin();const key=process.env.SUPABASE_SERVICE_ROLE_KEY;let users:{id:string;email?:string;app_metadata:Record<string,unknown>}[]=[];let message="";if(user.app_metadata.role!=="admin")message="Only administrators can view staff accounts.";else if(!key)message="Staff account management requires the server's Supabase service connection.";else{const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.admin.listUsers({page:1,perPage:1000});if(error)message="Could not load staff accounts. Reload to retry.";else users=data.users.filter(u=>(ADMIN_ROLES as readonly string[]).includes(u.app_metadata.role));}return <AdminShell><h1>Admin users</h1>{message&&<p role="status">{message}</p>}<div className={styles.recordList}>{users.map(u=><article key={u.id} className={styles.documentCard}><strong>{u.email}</strong><span>{String(u.app_metadata.role)}</span></article>)}</div><p>Staff access is managed through Supabase Auth roles.</p></AdminShell>;}
