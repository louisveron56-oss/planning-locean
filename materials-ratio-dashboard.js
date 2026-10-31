(function(){
"use strict";
const eur=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}),per=new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt=v=>Number.isFinite(v)?eur.format(v):"—",pct=v=>Number.isFinite(v)?per.format(v)+" %":"—";
const add=(p,t,c,s)=>{const x=document.createElement(t);if(c)x.className=c;if(s!==undefined)x.textContent=s;p.appendChild(x);return x};
let data=null,error="",loading=false,mode="month",year="2025";
async function fetchData(force){
 if(loading||data&&!force)return;loading=true;error="";paint();
 try{
  const u=window.netlifyIdentity?.currentUser?.();if(!u)throw Error("Connexion requise");
  const token=await u.jwt(),r=await fetch("/.netlify/functions/materials-monthly",{headers:{Authorization:"Bearer "+token},cache:"no-store"}),j=await r.json();
  if(!r.ok||!j.ok)throw Error(j.error||"Données indisponibles");data=j;
 }catch(e){error=e.message}finally{loading=false;paint()}
}
function groups(a){
 const m=new Map();
 a.forEach(x=>{
  const y=x.month.slice(0,4),k=mode==="year"?y:mode==="quarter"?y+"-T"+Math.ceil(Number(x.month.slice(5))/3):x.month;
  if(!m.has(k))m.set(k,{key:k,year:y,ca:0,food:0,drinks:0,total:0,months:0,bad:[]});
  const b=m.get(k);b.ca+=x.ca;b.food+=x.food;b.drinks+=x.drinks;b.total+=x.total;b.months++;if(x.warnings.length)b.bad.push(x.month);
 });
 return [...m.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(x=>({...x,ratio:100*x.total/x.ca}));
}
function btn(p,s,cb,active){const b=add(p,"button","mat-btn"+(active?" mat-selected":""),s);b.type="button";b.onclick=cb;return b}
function container(id){
 const shell=document.querySelector("#module-"+id+" .module-shell");if(!shell)return null;
 let x=shell.querySelector(".mat-ratio-panel");
 if(!x){x=add(shell,"section","mat-ratio-panel");const anchor=shell.querySelector(".rh-monthly-panel");if(anchor)anchor.after(x)}
 return x;
}
function renderReport(root){
 root.replaceChildren();
 const h=add(root,"div","mat-head");add(h,"h3","","Achats matières · Analyse financière");add(h,"span","mat-chip","PROVISOIRE");
 add(root,"p","mat-sub","Achats alimentaires + boissons HT / CA HT KSD. Hors variation des stocks ; ce n'est pas encore le ratio de consommation comptable.");
 if(!data){add(root,"p","mat-note",loading?"Chargement…":error||"Connexion nécessaire");btn(root,"Charger",()=>fetchData(true));return}
 const controls=add(root,"div","mat-controls");
 [["month","Mensuel"],["quarter","Trimestriel"],["year","Annuel"]].forEach(([v,s])=>btn(controls,s,()=>{mode=v;paint()},mode===v));
 if(mode!=="year")["2024","2025","2026"].forEach(y=>btn(controls,y,()=>{year=y;paint()},year===y));
 btn(controls,"↻ Actualiser",()=>fetchData(true));
 const all=groups(data.months),shown=mode==="year"?all:all.filter(x=>x.year===year),focus=shown.at(-1);
 const cards=add(root,"div","mat-cards");
 [["Ratio achats / CA",pct(focus?.ratio)],["Achats alimentaires",fmt(focus?.food)],["Achats boissons",fmt(focus?.drinks)],["CA HT",fmt(focus?.ca)]].forEach(([name,value])=>{const c=add(cards,"div","mat-card");add(c,"small","",name);add(c,"strong","",value)});
 add(root,"h4","","Évolution des ratios d'achats");
 const bars=add(root,"div","mat-bars"),max=Math.max(1,...shown.map(x=>Math.max(0,x.ratio)))*1.12;
 shown.forEach(x=>{const l=add(bars,"div","mat-bar");add(l,"span","",x.key);const track=add(l,"div","mat-track"),fill=add(track,"div","mat-fill"+(x.bad.length?" mat-uncertain":""));fill.style.width=Math.min(100,Math.max(0,x.ratio/max*100))+"%";add(l,"strong","",pct(x.ratio))});
 add(root,"h4","","Détail des achats et contrôles");
 const scroll=add(root,"div","mat-scroll"),table=add(scroll,"table","mat-table"),thead=add(table,"thead"),tr=add(thead,"tr");
 ["Période","CA HT","Alimentation HT","Boissons HT","Achats HT","Ratio achats","Évolution N-1","Fiabilité"].forEach(t=>add(tr,"th","",t));
 const body=add(table,"tbody");
 shown.forEach(x=>{
  const prev=all.find(z=>z.key===String(Number(x.key.slice(0,4))-1)+x.key.slice(4));
  const valid=prev&&!(mode==="year"&&(x.months<12||prev.months<12));
  const delta=valid?per.format(x.ratio-prev.ratio)+" pt":"—",r=add(body,"tr","");
  [x.key,fmt(x.ca),fmt(x.food),fmt(x.drinks),fmt(x.total),pct(x.ratio),delta,x.bad.length?"⚠ "+x.bad.join(", "):"Source renseignée"].forEach((v,i)=>add(r,"td",i===7&&x.bad.length?"mat-warn":"",v));
 });
 const note=add(root,"div","mat-note");add(note,"strong","","Point de vigilance comptable");
 add(note,"p","","2024 : achats alimentaires incomplets jusqu'en septembre. 2026 : factures récentes non exhaustives. Ne pas déduire une amélioration de ces données sans contrôle.");
 add(note,"p","","Pour mesurer les matières consommées : stock initial + achats nets - stock final. Les écarts de stocks, avoirs et imputations doivent être rapprochés. Les ratios d'achats peuvent être utiles au quotidien mais ne remplacent pas le coût matières comptable.");
}
function compact(r){
 r.replaceChildren();add(r,"h3","","Achats matières · L'Océan");
 if(!data){add(r,"p","mat-sub",loading?"Chargement…":error||"Données disponibles dans Rapports");btn(r,"Charger",()=>fetchData(true));return}
 const latest=data.months.filter(x=>x.validated).at(-1);
 if(latest)add(r,"p","mat-sub",latest.month+" : "+pct(latest.ratio)+" d'achats / CA HT, hors variation des stocks.");
 btn(r,"Ouvrir l'analyse matières →",()=>{const b=document.querySelector('.app-nav-item[data-page="reports"]');if(b)b.click();else window.navigateApp?.("reports")});
}
function paint(){for(const id of ["dashboard","reports"]){const r=container(id);if(r)id==="reports"?renderReport(r):compact(r)}}
function init(){
 const style=document.createElement("style");
 style.textContent=[
 ".mat-ratio-panel{background:white;border:1px solid #dde5e8;border-radius:12px;padding:18px;margin:18px 0;color:#293b43}",
 ".mat-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.mat-head h3{font-size:17px;margin:0}",
 ".mat-chip{font-size:10px;color:#915431;background:#fff0e4;padding:6px 9px;border-radius:5px}.mat-sub{font-size:11px;color:#71818a}",
 ".mat-controls{display:flex;flex-wrap:wrap;gap:7px;margin:17px 0}.mat-btn{border:1px solid #d5e0e5;border-radius:7px;background:white;color:#28536b;font-size:11px;padding:9px;cursor:pointer}",
 ".mat-selected{color:white;background:#174b66;border-color:#174b66}.mat-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0}",
 ".mat-card{border:1px solid #e3e8eb;border-radius:8px;padding:13px;display:flex;flex-direction:column;gap:7px}.mat-card small{color:#71818a;font-size:11px}.mat-card strong{color:#164e68;font-size:20px}",
 ".mat-ratio-panel h4{font-size:13px;margin:18px 0 11px}.mat-bars{display:flex;flex-direction:column;gap:9px}.mat-bar{display:grid;grid-template-columns:78px 1fr 80px;align-items:center;gap:10px;font-size:11px}",
 ".mat-track{height:16px;background:#e9f0f3;border-radius:4px;overflow:hidden}.mat-fill{height:100%;background:#217c9e}.mat-uncertain{background:#d39b63}.mat-bar strong{text-align:right}",
 ".mat-scroll{overflow-x:auto}.mat-table{width:100%;border-collapse:collapse;min-width:850px;font-size:11px}.mat-table th,.mat-table td{border-bottom:1px solid #e9eef0;padding:10px 7px;text-align:right;white-space:nowrap}",
 ".mat-table th{background:#f2f5f7}.mat-table td:first-child,.mat-table th:first-child{text-align:left}.mat-warn{color:#b45c37}",
 ".mat-note{margin:14px 0;background:#fff8f3;border-left:3px solid #c68c52;padding:12px;color:#835533;font-size:11px;line-height:1.6}",
 "@media(max-width:900px){.mat-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:550px){.mat-cards{grid-template-columns:1fr}.mat-bar{grid-template-columns:60px 1fr 65px}}"
 ].join("");document.head.appendChild(style);
 paint();const ids=["dashboard","reports"];const observer=new MutationObserver(()=>{if(ids.some(id=>document.getElementById("module-"+id)?.classList.contains("open")))fetchData(false)});
 ids.forEach(id=>{const e=document.getElementById("module-"+id);if(e)observer.observe(e,{attributes:true,attributeFilter:["class"]})});
 if(ids.some(id=>document.getElementById("module-"+id)?.classList.contains("open")))fetchData(false);
 window.addEventListener("materials-ratio-refresh",()=>fetchData(true));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();