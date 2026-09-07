import { AdminShell } from "../admin-shell";
import { DocumentCenter } from "./document-center";
export const dynamic = "force-dynamic";
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ ref?: string; type?: string }> }) {
  const params = await searchParams;
  return <AdminShell><DocumentCenter initialRef={params.ref} initialType={params.type} /></AdminShell>;
}
