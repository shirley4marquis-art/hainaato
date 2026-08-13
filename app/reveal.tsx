"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Site-wide scroll-reveal: any element with class "reveal" fades/slides in
// once it enters the viewport. Mounted once in SiteShell rather than wrapping
// every element in its own observer — one IntersectionObserver, re-scanned on
// route change since App Router navigation doesn't remount SiteShell.
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal:not(.is-visible)");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
