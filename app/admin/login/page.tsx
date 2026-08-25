"use client";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Mail, Lock } from "lucide-react";
import styles from "../admin.module.css";

function safeAdminRedirect(value: string | null): string {
  if (!value) return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Login failed.");
        setBusy(false);
        return;
      }
      router.push(safeAdminRedirect(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginBrand}>
        <p>HAINAAUTO ADMIN</p>
        <h1>Quotes &amp; orders,<br />handled in one place.</h1>
        <span>Draft quotes, track status from first inquiry through delivery, and generate the documents your buyers sign.</span>
        <div>
          <ShieldCheck size={16} />
          Staff access only — accounts are issued individually.
        </div>
      </div>
      <div className={styles.loginFormWrap}>
        <form className={styles.loginForm} onSubmit={submit}>
          <span className={styles.loginMark}>
            <ShieldCheck size={20} />
          </span>
          <p>SIGN IN</p>
          <h2>Welcome back</h2>
          <span>Use the email and password your administrator set up for you.</span>
          <label htmlFor="admin-email"><Mail size={13} /> Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
          <label htmlFor="admin-password"><Lock size={13} /> Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className={styles.loginError}>{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <small>Locked out or need an account? Contact your administrator.</small>
        </form>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
