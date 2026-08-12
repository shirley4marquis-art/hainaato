"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCompare } from "./compare-store";

export function AddToCompareButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  function handleClick() {
    addToCompare(slug);
    setAdded(true);
    router.push("/compare");
  }
  return (
    <button type="button" onClick={handleClick}>
      {added ? "Added — view compare" : "Add to Compare"}
    </button>
  );
}
