"use client";
import { useEffect, useRef, useState } from "react";
// Local writes happen on every change; network saves are serialized and debounced.
export function useDraft<T>(key:string,value:T,restore:(value:T)=>void) {
 const serialized=JSON.stringify(value);
 const [state,setState]=useState("Loading draft…");
 const ready=useRef(false); const cleared=useRef(false); const restoreRef=useRef(restore);
 const latest=useRef(value); const owner=useRef(""); const sequence=useRef(Promise.resolve());
 useEffect(()=>{restoreRef.current=restore;latest.current=value;},[restore,value]);
 useEffect(()=>{
  let active=true;
  async function load(){
   try {
    const r=await fetch(`/api/admin/drafts?key=${encodeURIComponent(key)}`,{cache:"no-store"}); if(!r.ok)throw new Error();const data=await r.json();if(!active)return;
    owner.current=data.owner; sessionStorage.setItem("admin-draft-owner",data.owner);
    const raw=localStorage.getItem(`admin-draft:${data.owner}:${key}`); const local=raw?JSON.parse(raw):null;
    const saved=local && (!data.draft || local.at>new Date(data.draft.updated_at).getTime()) ? local.data : data.draft?.data;
    if(saved)restoreRef.current(saved);
    ready.current=true;setState(saved?"Draft restored":"Draft ready");
   }catch{
    if(!active)return;
    try { owner.current=sessionStorage.getItem("admin-draft-owner")||"";const raw=owner.current?localStorage.getItem(`admin-draft:${owner.current}:${key}`):null;if(raw)restoreRef.current(JSON.parse(raw).data); }catch{}
    ready.current=Boolean(owner.current);setState(ready.current?"Offline · saved on this device":"Draft storage unavailable · retry when connected");
   }
  }
  void load(); return()=>{active=false;};
 },[key]);
 useEffect(()=>{
  if(!ready.current||cleared.current)return;
  try{localStorage.setItem(`admin-draft:${owner.current}:${key}`,`{"at":${Date.now()},"data":${serialized}}`);}catch{queueMicrotask(()=>setState("Device storage full · keep this page open"));}
  const timer=setTimeout(()=>{
   setState("Saving draft…");
   sequence.current=sequence.current.then(async()=>{
    if(cleared.current)return;
    try{const r=await fetch("/api/admin/drafts",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,data:latest.current})});if(!r.ok)throw new Error();setState("Draft saved");}catch{setState("Offline · saved on this device");}
   });
  },700);
  return()=>clearTimeout(timer);
 },[serialized,key]);
 async function clear(){cleared.current=true;await sequence.current;try{localStorage.removeItem(`admin-draft:${owner.current}:${key}`);await fetch(`/api/admin/drafts?key=${encodeURIComponent(key)}`,{method:"DELETE"});}catch{}setState("Saved");}
 return {state,clear};
}
