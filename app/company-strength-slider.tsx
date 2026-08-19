"use client";

import {useEffect, useState} from "react";

export function CompanyStrengthSlider({images}:{images:readonly string[]}){
  const [active,setActive]=useState(0);
  useEffect(()=>{
    if(images.length<2) return;
    const timer=window.setInterval(()=>setActive(current=>(current+1)%images.length),4200);
    return ()=>window.clearInterval(timer);
  },[images.length]);
  if(!images.length) return null;
  return <div className="strength-slider" aria-label="HainaAuto company strength photos">
    <div className="strength-slider-frame">
      {images.map((src,index)=><img key={src} className={index===active?"active":""} src={src} alt={`HainaAuto facility ${index+1}`} aria-hidden={index!==active}/>) }
    </div>
    <div className="strength-slider-controls" role="tablist" aria-label="Company photos">
      {images.map((src,index)=><button key={src} type="button" role="tab" aria-selected={index===active} aria-label={`Show company photo ${index+1}`} className={index===active?"active":""} onClick={()=>setActive(index)}/>) }
    </div>
  </div>;
}
