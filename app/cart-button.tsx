"use client";
import { ShoppingCart } from "lucide-react";
import { addToCart, removeFromCart, useCartSlugs } from "./cart-store";

export function AddToCartButton({ slug, className }: { slug: string; className?: string }) {
  const slugs = useCartSlugs();
  const inCart = slugs.includes(slug);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={inCart}
      onClick={() => (inCart ? removeFromCart(slug) : addToCart(slug))}
    >
      <ShoppingCart aria-hidden="true" size={16} />
      {inCart ? "In Cart — Remove" : "Add to Cart"}
    </button>
  );
}
