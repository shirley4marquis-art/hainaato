"use client";
import { useState } from "react";
import styles from "../admin.module.css";

type Policy = { blockedCountries: string[]; allowIps: string[] };

export function SecurityPolicyEditor({ initialPolicy, editable }: { initialPolicy: Policy; editable: boolean }) {
  const [blocked, setBlocked] = useState(initialPolicy.blockedCountries.join(", "));
  const [allow, setAllow] = useState(initialPolicy.allowIps.join("\n"));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/security/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedCountries: blocked.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean),
          allowIps: allow.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ tone: "err", text: data.error || "Could not save the policy." });
      } else {
        setMsg({ tone: "ok", text: "Policy saved. Changes take effect within ~30 seconds." });
      }
    } catch {
      setMsg({ tone: "err", text: "Network error while saving." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <label className={styles.field}>
        <span>Blocked countries (ISO 3166-1 alpha-2, comma separated)</span>
        <input
          value={blocked}
          onChange={(e) => setBlocked(e.target.value)}
          disabled={!editable || busy}
          placeholder="CN"
        />
      </label>
      <label className={styles.field}>
        <span>Trusted IP allowlist (one per line — bypasses the block)</span>
        <textarea value={allow} onChange={(e) => setAllow(e.target.value)} disabled={!editable || busy} rows={4} />
      </label>
      {editable ? (
        <div>
          <button className={styles.btn} onClick={save} disabled={busy} type="button">
            {busy ? "Saving…" : "Save policy"}
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
          This policy is managed via the <code>BLOCKED_COUNTRIES</code> and <code>GEO_IP_ALLOWLIST</code>{" "}
          environment variables. Set <code>VERCEL_API_TOKEN</code> + <code>EDGE_CONFIG_ID</code> to edit it here
          without a redeploy.
        </p>
      )}
      {msg && <p style={{ fontSize: 13, color: msg.tone === "ok" ? "#15803d" : "#b91c1c", margin: 0 }}>{msg.text}</p>}
    </div>
  );
}
