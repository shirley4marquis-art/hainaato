"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import styles from "./admin.module.css";

export function QuoteDeleteButton({ ref: quoteRef, label }: { ref: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    if (!window.confirm(`Delete quote ${label}? This removes the quote and its line items permanently.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteRef)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        window.alert(body?.error ?? "Could not delete the quote.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      window.alert("Could not delete the quote.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`${styles.smallBtn} ${styles.smallBtnDanger} ${styles.orderDeleteBtn}`}
      onClick={handleDelete}
      disabled={busy}
      aria-label={`Delete quote ${label}`}
      title="Delete this quote"
    >
      <Trash2 size={12} />
    </button>
  );
}
