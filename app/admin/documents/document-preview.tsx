"use client";
import { useEffect, useRef, useState } from "react";
import { DocumentView } from "./document-view";
import type { DocumentSnapshot,DocumentStatus } from "../../../lib/documents/model";
import styles from "../admin.module.css";
export function DocumentPreview({snapshot,number,status}:{snapshot:DocumentSnapshot;number:string;status?:DocumentStatus}){
 const box=useRef<HTMLDivElement>(null);const paper=useRef<HTMLDivElement>(null);const [size,setSize]=useState({scale:1,height:1123});
 useEffect(()=>{const update=()=>{if(box.current&&paper.current){const scale=Math.min(1,box.current.clientWidth/794);setSize({scale,height:paper.current.scrollHeight*scale});}};const observer=new ResizeObserver(update);if(box.current)observer.observe(box.current);if(paper.current)observer.observe(paper.current);update();return()=>observer.disconnect();},[]);
 return <div ref={box} className={styles.previewFrame} style={{height:size.height}}><div ref={paper} style={{width:794,transform:`scale(${size.scale})`,transformOrigin:"top left"}}><DocumentView snapshot={snapshot} number={number} status={status}/></div></div>;
}
