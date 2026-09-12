"use client";
import Link from "next/link";
import styles from "./admin.module.css";
export default function AdminError({reset}:{reset:()=>void}){return <main className={styles.shell}><section className={styles.body}><h1>Could not load this section</h1><p>Your saved records are unchanged. Check the connection and retry.</p><button className={styles.btn} onClick={reset}>Retry</button> <Link href="/admin">Dashboard</Link></section></main>;}
