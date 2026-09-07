"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import styles from "./documents.module.css";

export function PdfViewer({ url, page = 1, zoom = 1, onPages, overlay, stageRef }: { url: string; page?: number; zoom?: number; onPages?: (count: number) => void; overlay?: ReactNode; stageRef?: React.RefObject<HTMLDivElement | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const onPagesRef = useRef(onPages);
  useEffect(() => { onPagesRef.current = onPages; }, [onPages]);
  useEffect(() => {
    let cancelled = false;
    let loading: PDFDocumentLoadingTask | undefined, render: RenderTask | undefined;
    async function load() {
      setBusy(true); setError("");
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        if (cancelled) return;
        loading = pdfjs.getDocument({ url, withCredentials: true, enableXfa: false });
        const doc = await loading.promise;
        if (cancelled) return;
        onPagesRef.current?.(doc.numPages);
        const sheet = await doc.getPage(Math.min(page, doc.numPages));
        if (cancelled || !canvas.current) return;
        const viewport = sheet.getViewport({ scale: Math.min(window.devicePixelRatio || 1, 2) * 1.4 });
        canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
        render = sheet.render({ canvas: canvas.current, viewport });
        await render.promise;
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load PDF preview."); }
      finally { if (!cancelled) setBusy(false); }
    }
    void load();
    return () => { cancelled = true; render?.cancel(); void loading?.destroy(); };
  }, [url, page]);
  return <div className={styles.viewer} aria-busy={busy}>
    {busy && <p role="status">Loading PDF preview…</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div ref={stageRef} className={styles.stage} style={{ width: `${zoom * 100}%` }}><canvas ref={canvas} aria-label={`PDF page ${page}`} />{!busy && !error && overlay}</div>
  </div>;
}
