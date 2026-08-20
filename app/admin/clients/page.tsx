import { Mail, MapPin, Phone, Users } from "lucide-react";
import { AdminShell } from "../admin-shell";
import { adminListCustomers } from "../../../lib/crm";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await adminListCustomers();
  return <AdminShell>
    <div className={styles.pageHeading}><div><span className={styles.eyebrow}>CRM database</span><h1>Clients</h1><p>{clients.length} customer records connected to quotes and orders.</p></div></div>
    {clients.length === 0 ? <div className={styles.emptyState}><Users size={28}/><p>No clients yet.</p></div> :
      <div className={styles.clientGrid}>{clients.map((client) => <article className={styles.clientCard} key={client.id}>
        <header><span>{client.name.slice(0,2).toUpperCase()}</span><div><h2>{client.name}</h2><small>Last activity {new Date(client.lastActivityAt).toLocaleDateString()}</small></div></header>
        <div className={styles.clientContacts}>
          <span><Mail size={13}/>{client.email ?? "No email"}</span>
          <span><Phone size={13}/>{client.phone ?? "No phone"}</span>
          <span><MapPin size={13}/>{client.country ?? "Country not set"}</span>
        </div>
        <footer><div><b>{client.quoteCount}</b><small>Quotes / orders</small></div><div><b>${client.totalValue.toLocaleString()}</b><small>Pipeline value</small></div></footer>
      </article>)}</div>}
  </AdminShell>;
}
