"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, DatabaseZap, ExternalLink, Eye, FileClock, Filter, RefreshCw, Save, Search, ShieldCheck, SlidersHorizontal, XCircle } from "lucide-react";
import styles from "../admin.module.css";
import type { ImportedListing, ImportedListingStatus, ImportConfig, ImportLog } from "../../../lib/imports/types";

type Props = {
  initialListings: ImportedListing[];
  initialLogs: ImportLog[];
  initialConfig: ImportConfig;
};

const STATUS_LABELS: Record<ImportedListingStatus, string> = {
  pending_review: "Pending review",
  verified: "Verified",
  rejected: "Rejected",
  needs_update: "Needs update",
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function statusTone(status: ImportedListingStatus) {
  if (status === "verified") return "green";
  if (status === "rejected") return "red";
  if (status === "needs_update") return "amber";
  return "blue";
}

export function ImportReviewClient({ initialListings, initialLogs, initialConfig }: Props) {
  const [listings, setListings] = useState(initialListings);
  const [logs, setLogs] = useState(initialLogs);
  const [config, setConfig] = useState(initialConfig);
  const [selected, setSelected] = useState<ImportedListing | null>(initialListings[0] ?? null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const categories = useMemo(() => unique(listings.map((item) => item.category)), [listings]);
  const brands = useMemo(() => unique(listings.map((item) => item.brand)), [listings]);
  const suppliers = useMemo(() => unique(listings.map((item) => item.supplier_name)), [listings]);
  const filtered = useMemo(() => listings.filter((item) => {
    const haystack = `${item.title} ${item.model} ${item.supplier_name}`.toLowerCase();
    if (query && !haystack.includes(query.toLowerCase())) return false;
    if (category && item.category !== category) return false;
    if (brand && item.brand !== brand) return false;
    if (supplier && item.supplier_name !== supplier) return false;
    if (status && item.listing_status !== status) return false;
    return true;
  }), [brand, category, listings, query, status, supplier]);

  async function refreshData() {
    const [listingResponse, logsResponse] = await Promise.all([fetch("/api/admin/imports"), fetch("/api/admin/imports/runs")]);
    const listingJson = await listingResponse.json();
    const logsJson = await logsResponse.json();
    if (listingJson.ok) setListings(listingJson.listings);
    if (logsJson.ok) setLogs(logsJson.runs);
  }

  async function updateListing(id: string, patch: Partial<ImportedListing>) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/imports/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Update failed");
      setListings((current) => current.map((item) => item.id === id ? json.listing : item));
      setSelected((current) => current?.id === id ? json.listing : current);
      setMessage("Listing updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function runImport() {
    setBusy("import");
    setMessage("Running Made-in-China discovery...");
    try {
      const response = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_products_per_run: config.max_products_per_run, max_pages_per_query: config.max_pages_per_query }),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Import failed");
      setMessage(`Import complete: ${json.log.listings_imported} imported, ${json.log.duplicates} duplicates, ${json.log.rejected} rejected.`);
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveConfig() {
    setBusy("config");
    setMessage("");
    try {
      const response = await fetch("/api/admin/imports/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await response.json();
      if (!json.ok) throw new Error(json.error || "Config update failed");
      setConfig(json.config);
      setMessage("Import configuration saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Config update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Supplier discovery</span>
          <h1>Made-in-China Imports</h1>
          <p>Staged supplier listings stay under review until staff verifies and approves them.</p>
        </div>
        <button className={styles.btn} type="button" onClick={runImport} disabled={busy === "import"}>
          <RefreshCw size={14} /> {busy === "import" ? "Running..." : "Run discovery"}
        </button>
      </div>

      {message ? <div className={styles.importNotice}>{message}</div> : null}

      <div className={styles.importStats}>
        <article><DatabaseZap size={18} /><div><b>{listings.length}</b><span>Imported listings</span></div></article>
        <article><FileClock size={18} /><div><b>{listings.filter((item) => item.listing_status === "pending_review").length}</b><span>Pending review</span></div></article>
        <article><ShieldCheck size={18} /><div><b>{listings.filter((item) => item.source_verified).length}</b><span>Verified by staff</span></div></article>
      </div>

      <section className={styles.importControlPanel}>
        <div className={styles.importPanelTitle}><Filter size={15} /><b>Review filters</b></div>
        <div className={styles.importFilters}>
          <label><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search model, supplier, title" /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">All brands</option>{brands.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={supplier} onChange={(event) => setSupplier(event.target.value)}><option value="">All suppliers</option>{suppliers.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        </div>
      </section>

      <div className={styles.importLayout}>
        <section className={styles.importList}>
          {filtered.length === 0 ? <div className={styles.emptyState}>No imported supplier listings match these filters.</div> : filtered.map((item) => (
            <button key={item.id} type="button" className={`${styles.importCard} ${selected?.id === item.id ? styles.importCardActive : ""}`} onClick={() => setSelected(item)}>
              <span className={styles.statusPill} data-tone={statusTone(item.listing_status)}>{STATUS_LABELS[item.listing_status]}</span>
              <b>{item.title}</b>
              <small>{item.brand} {item.model ? `· ${item.model}` : ""}</small>
              <span>{item.supplier_name || "Supplier pending"} · Source: Made-in-China.com</span>
              <strong>{item.price || "Contact Supplier"}</strong>
            </button>
          ))}
        </section>

        <aside className={styles.importPreview}>
          {selected ? (
            <>
              <div className={styles.importPreviewImage}>
                {selected.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.images[0].original_url} alt="" />
                ) : <Eye size={24} />}
              </div>
              <div className={styles.importPreviewHead}>
                <span className={styles.statusPill} data-tone={statusTone(selected.listing_status)}>{STATUS_LABELS[selected.listing_status]}</span>
                <h2>{selected.title}</h2>
                <p>{selected.description}</p>
              </div>
              <dl className={styles.importMeta}>
                <div><dt>Source</dt><dd>Made-in-China.com</dd></div>
                <div><dt>Category</dt><dd>{selected.category} · {selected.subcategory}</dd></div>
                <div><dt>Brand</dt><dd>{selected.brand}</dd></div>
                <div><dt>Supplier</dt><dd>{selected.supplier_name || "Pending"}</dd></div>
                <div><dt>Location</dt><dd>{selected.supplier_location || "China"}</dd></div>
                <div><dt>MOQ</dt><dd>{selected.moq || "Not listed"}</dd></div>
              </dl>
              <div className={styles.importActions}>
                <button type="button" onClick={() => updateListing(selected.id, { listing_status: "verified", source_verified: true })} disabled={busy === selected.id}><CheckCircle2 size={13} /> Approve</button>
                <button type="button" onClick={() => updateListing(selected.id, { listing_status: "needs_update" })} disabled={busy === selected.id}><SlidersHorizontal size={13} /> Needs update</button>
                <button type="button" onClick={() => updateListing(selected.id, { listing_status: "rejected" })} disabled={busy === selected.id}><XCircle size={13} /> Reject</button>
                <a href={selected.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Original listing</a>
              </div>
            </>
          ) : <div className={styles.emptyState}>Select an imported listing to preview it.</div>}
        </aside>
      </div>

      <section className={styles.importControlPanel}>
        <div className={styles.importPanelTitle}><SlidersHorizontal size={15} /><b>Search configuration</b></div>
        <div className={styles.importConfigGrid}>
          <label>Enabled<select value={config.enabled ? "true" : "false"} onChange={(event) => setConfig({ ...config, enabled: event.target.value === "true" })}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
          <label>Auto publish<select value={config.auto_publish ? "true" : "false"} onChange={(event) => setConfig({ ...config, auto_publish: event.target.value === "true" })}><option value="false">No, stage for review</option><option value="true">Yes, after review only</option></select></label>
          <label>Pages per query<input type="number" min="1" max="5" value={config.max_pages_per_query} onChange={(event) => setConfig({ ...config, max_pages_per_query: Number(event.target.value) })} /></label>
          <label>Products per run<input type="number" min="1" max="100" value={config.max_products_per_run} onChange={(event) => setConfig({ ...config, max_products_per_run: Number(event.target.value) })} /></label>
          <label className={styles.importWide}>Queries<textarea rows={7} value={config.queries.join("\n")} onChange={(event) => setConfig({ ...config, queries: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} /></label>
        </div>
        <button className={styles.btn} type="button" onClick={saveConfig} disabled={busy === "config"}><Save size={14} /> Save configuration</button>
      </section>

      <section className={styles.importControlPanel}>
        <div className={styles.importPanelTitle}><FileClock size={15} /><b>Recent import logs</b></div>
        <table className={styles.table}>
          <thead><tr><th>Run</th><th>Queries</th><th>Scanned</th><th>Imported</th><th>Duplicates</th><th>Rejected</th><th>Completed</th></tr></thead>
          <tbody>{logs.slice(0, 8).map((log) => <tr key={log.run_id}><td>{log.run_id}</td><td>{log.queries.length}</td><td>{log.pages_scanned}</td><td>{log.listings_imported}</td><td>{log.duplicates}</td><td>{log.rejected}</td><td>{log.completed_at ? new Date(log.completed_at).toLocaleString() : "Running"}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
