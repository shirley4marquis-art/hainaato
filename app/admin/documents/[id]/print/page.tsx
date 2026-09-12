import { notFound } from "next/navigation";
import { getDocument } from "../../../../../lib/admin-store";
import { DocumentView } from "../../document-view";
export const dynamic="force-dynamic";
export default async function PrintDocument({params}:{params:Promise<{id:string}>}) {
 const d=await getDocument((await params).id); if(!d) notFound();
 return <DocumentView snapshot={d.snapshot} number={d.number} status={d.status}/>;
}
