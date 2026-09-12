import styles from "./admin.module.css";
export default function Loading(){return <div className={styles.shell}><div className={styles.body} role="status" aria-live="polite">Loading operations…</div></div>;}
