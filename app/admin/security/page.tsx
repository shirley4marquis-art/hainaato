import { AdminShell } from "../admin-shell";
import { recentSecurityEvents } from "../../../lib/security/log";
import { getGeoPolicy } from "../../../lib/security/geo-policy";
import { SecurityPolicyEditor } from "./security-client";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  geo_blocked: "Geo blocked",
  edge_auth_failed: "Direct-origin blocked",
  rate_limited: "Rate limited",
  admin_login_failed: "Admin login failed",
  admin_login_blocked: "Admin login blocked",
  admin_login_success: "Admin login",
  security_policy_changed: "Policy changed",
  suspicious_request: "Suspicious request",
};

export default async function SecurityPage() {
  const [events, policy] = await Promise.all([recentSecurityEvents(150), getGeoPolicy()]);
  const editable = Boolean(process.env.VERCEL_API_TOKEN && process.env.EDGE_CONFIG_ID);

  return (
    <AdminShell>
      <div className={styles.pageHeading}>
        <h1>Security</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Geo-restriction policy</h2>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
          Canonical enforcement is the Cloudflare geo firewall rule. This is the in-app backstop that
          also blocks any request reaching the origin directly. Hong Kong (HK), Macau (MO) and Taiwan
          (TW) are separate codes and are only blocked if added here.
        </p>
        <SecurityPolicyEditor initialPolicy={policy} editable={editable} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent security events</h2>
        {events.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>
            No events recorded yet (or no database configured for security logging).
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Country</th>
                <th>Path</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.ts).toLocaleString()}</td>
                  <td>{TYPE_LABEL[e.type] ?? e.type}</td>
                  <td>{e.country ?? "—"}</td>
                  <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.path ?? "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>
                    {Object.keys(e.detail || {}).length ? JSON.stringify(e.detail) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
