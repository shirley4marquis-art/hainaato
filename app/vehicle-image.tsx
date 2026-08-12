"use client";

import Image from "next/image";
import { CarFront } from "lucide-react";
import { useMemo, useState } from "react";

export { rankVehicleImages } from "../lib/image-ranking";
import { rankVehicleImages } from "../lib/image-ranking";

type Props = { candidates: Array<string | null | undefined>; alt: string; sizes?: string; priority?: boolean; className?: string; minimumWidth?: number; minimumHeight?: number };

export function ResilientVehicleImage({ candidates, alt, sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw", priority = false, className = "", minimumWidth = 240, minimumHeight = 160 }: Props) {
  const ranked = useMemo(() => rankVehicleImages(candidates), [candidates]);
  return <ImageAttempt key={ranked.join("|")} ranked={ranked} alt={alt} sizes={sizes} priority={priority} className={className} minimumWidth={minimumWidth} minimumHeight={minimumHeight}/>;
}

function ImageAttempt({ ranked, alt, sizes, priority, className, minimumWidth, minimumHeight }: Omit<Props,"candidates"> & { ranked:string[]; sizes:string; priority:boolean; className:string; minimumWidth:number; minimumHeight:number }) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const tryNext = () => { setLoaded(false); setIndex((current) => current + 1); };

  if (!ranked[index]) return <div className={`vehicle-image-fallback ${className}`.trim()} role="img" aria-label={`${alt} image unavailable`}><CarFront aria-hidden="true"/><span>Image unavailable</span></div>;
  return <Image key={ranked[index]} src={ranked[index]} alt={alt} fill sizes={sizes} priority={priority} className={`vehicle-image ${loaded ? "is-loaded" : ""} ${className}`.trim()} onError={tryNext} onLoad={(event) => { const image=event.currentTarget; if(image.naturalWidth<minimumWidth||image.naturalHeight<minimumHeight){tryNext();return;} setLoaded(true); }}/>
}
