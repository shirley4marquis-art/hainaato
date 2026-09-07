import { redirect } from "next/navigation";

// Preview the actual template-generated PDF, never a separate HTML layout.
export default async function QuotePrintPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  redirect(`/api/admin/quotes/${encodeURIComponent(ref)}/pdf?preview=1`);
}
