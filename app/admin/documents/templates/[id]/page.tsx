import { AdminShell } from "../../../admin-shell";
import { TemplateEditor } from "../template-editor";
export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) { return <AdminShell><TemplateEditor id={(await params).id} /></AdminShell>; }
