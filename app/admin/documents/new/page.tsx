import {AdminShell} from "../../admin-shell";
import {DocumentEditor} from "../document-editor";
import {adminListQuotes} from "../../../../lib/crm";
export const dynamic="force-dynamic";
export default async function NewDocument({searchParams}:{searchParams:Promise<{ref?:string}>}){const [quotes,sp]=await Promise.all([adminListQuotes(),searchParams]);return <AdminShell><h1>Generate document</h1><DocumentEditor quotes={quotes} initialRef={sp.ref}/></AdminShell>;}
