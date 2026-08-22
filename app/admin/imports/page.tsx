import { AdminShell } from "../admin-shell";
import { listImportLogs, listImportedListings, getImportConfig } from "../../../lib/imports/store";
import { ImportReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const [listings, logs, config] = await Promise.all([
    listImportedListings(),
    listImportLogs(),
    getImportConfig(),
  ]);

  return (
    <AdminShell>
      <ImportReviewClient initialListings={listings} initialLogs={logs} initialConfig={config} />
    </AdminShell>
  );
}

