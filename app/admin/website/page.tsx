import Link from "next/link";
import {AdminShell} from "../admin-shell";
import styles from "../admin.module.css";
export default function Website(){return <AdminShell><h1>Website management</h1><div className={styles.recordList}><Link className={styles.documentCard} href="/admin/vehicles"><b>Public catalogue</b><span>Review vehicles and availability</span></Link><Link className={styles.documentCard} href="/admin/imports"><b>Inventory imports</b><span>Review and publish supplier listings</span></Link><Link className={styles.documentCard} href="/"><b>View website</b><span>Open the customer experience</span></Link></div></AdminShell>;}
