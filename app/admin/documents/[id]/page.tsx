import {notFound} from "next/navigation";
import {AdminShell} from "../../admin-shell";
import {getDocument} from "../../../../lib/admin-store";
import {DocumentPreview} from "../document-preview";
import {DocumentActions} from "../document-actions";
export const dynamic="force-dynamic";
export default async function Document({params}:{params:Promise<{id:string}>}){const d=await getDocument((await params).id);if(!d)notFound();return <AdminShell><h1>{d.number}</h1><DocumentActions document={d}/><DocumentPreview snapshot={d.snapshot} number={d.number} status={d.status}/></AdminShell>;}
