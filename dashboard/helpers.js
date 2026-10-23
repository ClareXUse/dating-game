export const $ = id => document.getElementById(id);
export const fmt = v => v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(4);
export const short = v => Number(v).toFixed(2).replace(/\.00$/, '');
export const initial = name => (name || '?').trim().split(/[\s_-]+/).at(-1).slice(0,1).toUpperCase();
export function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
let toastTimer;
export function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600);}
export async function copy(value){try{await navigator.clipboard.writeText(value);toast('Copied to clipboard');}catch{toast('Clipboard unavailable. Select and copy the displayed text.');}}
export function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=element('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function post(path,data={}){const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
export function error(message){$('error').textContent=message||'';$('error').hidden=!message;}
