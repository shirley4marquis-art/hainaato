"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHero, SiteShell } from "../ui";
import { ResilientVehicleImage } from "../vehicle-image";
import { Price } from "../price";
import { CartRequestForm } from "../request-form";
import { CART_MAX, removeFromCart, useCartSlugs } from "../cart-store";
import styles from "./cart.module.css";

type CartVehicle = {
  slug: string;
  title: string;
  priceCNY: number | null;
  bodyType: string | null;
  stockCode: string;
  image: string | null;
};

export default function Cart() {
  const slugs = useCartSlugs();
  const key = slugs.join(",");
  const [fetchedVehicles, setFetchedVehicles] = useState<CartVehicle[]>([]);
  // Tracks which slug set fetchedVehicles corresponds to, so "loading" is
  // derived during render instead of set synchronously inside the effect.
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);
  // Owned here, not inside CartRequestForm: submitting clears the cart,
  // which empties `slugs` and would otherwise unmount the form (and any
  // local "submitted" state it held) before a confirmation could ever show.
  const [submitted, setSubmitted] = useState<{ ref: string; documentNumber: string | null } | null>(null);

  useEffect(() => {
    if (slugs.length === 0) return;
    let cancelled = false;
    fetch(`/api/cart?slugs=${slugs.map(encodeURIComponent).join(",")}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled) return;
        setFetchedVehicles(data.vehicles ?? []);
        setFetchedKey(key);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedVehicles([]);
        setFetchedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [slugs, key]);

  const loading = slugs.length > 0 && fetchedKey !== key;
  const vehicles = slugs.length === 0 ? [] : fetchedVehicles;
  const showEmpty = !loading && slugs.length === 0 && !submitted;

  return (
    <SiteShell>
      <PageHero
        kicker="YOUR SELECTION"
        title="Cart"
        copy={`Add up to ${CART_MAX} vehicles here, then send one combined quote request for all of them.`}
      />
      <section className="section">
        <div className="container form-page">
          {submitted && (
            <div className="empty-state">
              <h2>Quotation sent</h2>
              <p>
                Your personalized quotation{submitted.documentNumber ? ` (${submitted.documentNumber})` : ` (${submitted.ref})`} has
                been generated and emailed to you. Check your inbox, or reply to that email with any questions.
              </p>
              <a className="btn primary" href={`/api/quote-pdf?ref=${encodeURIComponent(submitted.ref)}`}>
                Download quotation
              </a>
              <Link className="btn primary" href="/vehicles">
                Continue browsing
              </Link>
            </div>
          )}
          {!submitted && loading && <p>Loading…</p>}
          {showEmpty && (
            <div className="empty-state">
              <h2>Your cart is empty</h2>
              <p>Open a vehicle and add it to your cart to start building a quote request.</p>
              <Link className="btn primary" href="/vehicles">
                Browse vehicles
              </Link>
            </div>
          )}
          {!submitted && !loading && vehicles.length > 0 && (
            <>
              <ul className={styles.list}>
                {vehicles.map((v) => (
                  <li key={v.slug} className={styles.item}>
                    <Link href={`/vehicles/${v.slug}`} className={styles.thumb}>
                      <ResilientVehicleImage candidates={[v.image]} alt={v.title} sizes="90px" minimumWidth={0} minimumHeight={0} />
                    </Link>
                    <div className={styles.itemBody}>
                      <Link href={`/vehicles/${v.slug}`} className={styles.itemTitle}>
                        {v.title}
                      </Link>
                      <span className={styles.itemStock}>{v.stockCode}</span>
                    </div>
                    <div className={styles.itemPrice}>
                      <Price cny={v.priceCNY} />
                    </div>
                    <button type="button" className={styles.remove} onClick={() => removeFromCart(v.slug)} aria-label={`Remove ${v.title} from cart`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.actions}>
                <Link className="btn ghost" href="/vehicles">
                  Add more vehicles
                </Link>
              </div>
              <CartRequestForm
                vehicles={vehicles.map((v) => ({ slug: v.slug, title: v.title, bodyType: v.bodyType }))}
                onSubmitted={(ref, documentNumber) => setSubmitted({ ref, documentNumber })}
              />
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
