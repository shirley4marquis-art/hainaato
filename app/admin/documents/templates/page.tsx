import { AdminShell } from "../../admin-shell";
import { TemplateManager } from "./template-manager";
export const dynamic = "force-dynamic";
export default function TemplatesPage() { return <AdminShell><TemplateManager /></AdminShell>; }
