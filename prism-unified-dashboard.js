/* Prism - tableau de bord financier unifie, toutes les cases sur la meme periode. */
(function(){
"use strict";
const euro=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const integer=new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0});
const dec=new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});
const amount=x=>Number(String(x??"").replace(/[\s\u00a0\u202f€]/g,"").replace(",",".")),money=x=>Number.isFinite(x)?euro.format(x):"—";
const percent=x=>Number.isFinite(x)?dec.format(x)+" %":"—";
const keydate=x=>String(x||"").slice(0,10);
const create=(p,tag,cl,txt)=>{const el=document.createElement(tag);if(cl)el.className=cl;if(txt!==undefined)el.textContent=txt;p.appendChild(el);return el;};
const total=(rows,k)=>rows.reduce((s,r)=>s+(Number.isFinite(r[k])?r[k]:0),0);
let sources=null,error="",loading=false,mode="month",anchor=new Date().toLocaleDateString("sv-SE");
function interval(){const year=anchor.slice(0,4),m=anchor.slice(0,7);
 return mode==="day"?{start:anchor,end:anchor,title:new Date(anchor+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}:
 mode==="month"?{start:m+"-01",end:m+"-31",title:new Date(m+"-01T12:00:00").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}:
 {start:year+"-01-01",end:year+"-12-31",title:year};}
function shift(n){const d=new Date(anchor+"T12:00:00");if(mode==="day")d.setDate(d.getDate()+n);if(mode==="month")d.setMonth(d.getMonth()+n,1);if(mode==="year")d.setFullYear(d.getFullYear()+n);anchor=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");render()}
async function fetchJson(url,token){const r=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store"});let j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||"Lecture impossible : "+url);return j;}
async function load(force){
 if(loading||sources&&!force)return;loading=true;error="";render();
 try{
  const user=window.netlifyIdentity?.currentUser?.();if(!user)throw Error("Connexion Prism requise.");
  const token=await user.jwt();
  const [sales,rh,mat]=await Promise.all([fetchJson("/.netlify/functions/sales",token),fetchJson("/.netlify/functions/rh-monthly",token),fetchJson("/.netlify/functions/materials-monthly",token)]);
  const salesRows=(sales.rows||[]).filter(x=>String(x.etablissement||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes("ocean")).map(x=>({...x,day:keydate(x.date),ttc:amount(x.ca_ttc),ht:amount(x.ca_ht),cover:amount(x.couverts),ticket:amount(x.ticket_moyen)})).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.day));
  const last=salesRows.map(x=>x.day).sort().at(-1);if(last&&anchor>last)anchor=last;
  sources={sales:salesRows,rh:rh.months||[],materials:mat.months||[]};
 }catch(e){error=e.message}finally{loading=false;render()}
}
function salesSummary(rows){
 const ca=total(rows,"ht"),ttc=total(rows,"ttc"),covers=total(rows,"cover");
 // CA par couvert derived from restaurant-side counts where full split is unavailable; legacy ticket_mean weighted uses covers.
 const weighted=covers?rows.reduce((s,r)=>s+(Number.isFinite(r.ticket)?r.ticket:0)*(Number.isFinite(r.cover)?r.cover:0),0)/covers:NaN;
 return {ca,ttc,covers,ticket:weighted,hasSales:rows.length>0,invalid:rows.some(x=>!Number.isFinite(x.ht)||!Number.isFinite(x.ttc))};
}
function summarize(){
 const p=interval(),sales=sources.sales.filter(x=>x.day>=p.start&&x.day<=p.end),s=salesSummary(sales);
 let rh=[],mat=[];
 if(mode==="month"){const month=anchor.slice(0,7);rh=sources.rh.filter(x=>x.month===month);mat=sources.materials.filter(x=>x.month===month);}
 if(mode==="year"){const year=anchor.slice(0,4);rh=sources.rh.filter(x=>x.month.startsWith(year));mat=sources.materials.filter(x=>x.month.startsWith(year));}
 const needed=mode==="year"?12:1;
 const availableRH=mode!=="day"&&rh.length===needed&&rh.every(x=>Number.isFinite(x.cout_charge));
 const availableMat=mode!=="day"&&mat.length===needed&&mat.every(x=>Number.isFinite(x.total));
 const costRH=availableRH?total(rh,"cout_charge"):NaN,costMat=availableMat?total(mat,"total"):NaN;
 const warnings=[];
 if(s.invalid)warnings.push("Une ligne de vente présente un montant invalide.");
 if(!s.hasSales)warnings.push("Pas encore de données pour cette période.");
 if(mode==="day")warnings.push("RH et achats matières : sources mensuelles, pas de coût journalier constaté.");
 if(mode==="year"&&(!availableRH||!availableMat))warnings.push("Exercice partiel : aucun ratio annuel RH ou matières extrapolé.");
 if(mat.some(x=>x.warnings?.length))warnings.push("Achats matières incomplets ou à rapprocher : voir Rapports.");
 if(rh.some(x=>x.status!=="rapproche_sources"))warnings.push("RH : écarts de rapprochement comptable encore ouverts.");
 return {p,s,rh,mat,availableRH,availableMat,costRH,costMat,warnings,
  ratioRH:availableRH&&s.ca>0&&!s.invalid?costRH/s.ca*100:NaN,
  ratioMat:availableMat&&s.ca>0&&!s.invalid?costMat/s.ca*100:NaN};
}
function card(container,name,value,sub){const el=create(container,"div","prism-overview-card");create(el,"div","prism-overview-card-label",name);create(el,"strong","prism-overview-card-value",value);if(sub)create(el,"p","prism-overview-card-note",sub);}
function button(container,name,fn,selected){const b=create(container,"button","prism-overview-btn"+(selected?" selected":""),name);b.type="button";b.onclick=fn;return b;}
function render(){
 const host=document.querySelector("#module-dashboard .module-shell");if(!host)return;
 let root=host.querySelector("#prismOverview");if(!root){root=create(host,"section","prism-overview");root.id="prismOverview";const place=host.querySelector("#prismDashboardMount");if(place)place.replaceWith(root);}
 root.replaceChildren();
 const controls=create(root,"div","prism-overview-controls");["day","month","year"].forEach((x,i)=>button(controls,["Journalier","Mensuel","Annuel"][i],()=>{mode=x;render()},mode===x));
 const nav=create(controls,"div","prism-overview-nav");button(nav,"‹",()=>shift(-1));
 create(nav,"strong","",interval().title);
 button(nav,"›",()=>shift(1));
 const picker=create(nav,"input","prism-overview-date");picker.type="date";picker.value=anchor;picker.onchange=()=>{if(picker.value){anchor=picker.value;render()}};
 button(controls,"↻ Actualiser",()=>load(true));
 if(!sources){create(root,"p","prism-overview-info",loading?"Chargement des ventes, des RH et des achats matières…":error||"Pas encore de données pour cette période.");return;}
 const d=summarize(),grid=create(root,"div","prism-overview-grid");
 const valid=d.s.hasSales&&!d.s.invalid;
 card(grid,"Chiffre d'affaires TTC",valid?money(d.s.ttc):"—","");
 card(grid,"Chiffre d'affaires HT",valid?money(d.s.ca):"—","");
 card(grid,"Couverts",d.s.hasSales?integer.format(d.s.covers):"—","");
 card(grid,"Ticket moyen",d.s.hasSales&&Number.isFinite(d.s.ticket)?money(d.s.ticket):"—","");
 card(grid,"Ratio RH",percent(d.ratioRH),mode==="day"?"Non disponible au jour · coûts mensuels":d.availableRH?money(d.costRH)+" · brut + patronales":"Période RH incomplète");
 card(grid,"Ratio achats matières",percent(d.ratioMat),mode==="day"?"Non disponible au jour · achats mensuels":d.availableMat?money(d.costMat)+" · hors variation de stocks":"Période achats incomplète");

 if(d.warnings.length){const notes=create(root,"div","prism-overview-warnings");notes.setAttribute("role","status");d.warnings.forEach(w=>create(notes,"p","",w));}

}
function init(){
 const css=document.createElement("style");css.textContent=[
 ".prism-overview{margin:18px 0;padding:20px;background:#fff;border:1px solid #e0e6e9;border-radius:13px;color:#263f4b}",
 ".prism-overview-title{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap}",
 ".prism-overview-title h3{font-size:16px;margin:0}.prism-overview-title span{font-size:11px;color:#77828b}",
 ".prism-overview-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:18px 0}",
 ".prism-overview-btn{padding:9px 11px;background:white;border:1px solid #d5e0e6;border-radius:7px;color:#24495d;cursor:pointer;font-size:11px}",
 ".prism-overview-btn.selected{background:#194a64;border-color:#194a64;color:white}",
 ".prism-overview-nav{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.prism-overview-nav strong{font-size:12px;min-width:110px;text-align:center}",
 ".prism-overview-date{padding:8px;border:1px solid #d6dee2;border-radius:7px;font-size:11px}",
 ".prism-overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}",
 ".prism-overview-card{background:#fff;border:1px solid #e3e9ec;border-radius:10px;padding:15px;min-width:0}",
 ".prism-overview-card-label{font-size:11px;color:#74808a}.prism-overview-card-value{display:block;color:#194c67;font-size:25px;font-variant-numeric:tabular-nums;margin:8px 0}",
 ".prism-overview-card-note{font-size:10px;color:#78848b;margin:0;line-height:1.5}",
 ".prism-overview-next{border:1px dashed #d5e1e6;padding:13px;margin-top:14px;border-radius:9px;display:flex;gap:15px;flex-wrap:wrap;font-size:11px;color:#74808a}",
 ".prism-overview-next strong{color:#294c61}.prism-overview-warnings{border-left:3px solid #c39561;background:#fff9f2;padding:12px;margin-top:14px;font-size:11px;color:#825d38}",
 ".prism-overview-warnings p{margin:7px 0}.prism-overview-source,.prism-overview-info{font-size:11px;color:#78858c;margin:14px 0}",
 "@media(max-width:960px){.prism-overview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}",
 "@media(max-width:560px){.prism-overview-grid{grid-template-columns:1fr}.prism-overview{padding:12px}.prism-overview-card-value{font-size:22px}}"
 ].join("");document.head.appendChild(css);
 render();const node=document.getElementById("module-dashboard");if(node){const observer=new MutationObserver(()=>{if(node.classList.contains("open"))load(false)});observer.observe(node,{attributes:true,attributeFilter:["class"]});if(node.classList.contains("open"))load(false);}
 window.addEventListener("prism-overview-refresh",()=>load(true));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();