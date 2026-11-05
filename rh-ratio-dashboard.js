/* PRISM - Analyse RH consolidee, sources MySilae et KSD en lecture seule. */
(function(){
"use strict";
const eur=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const pct=new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});
const num=v=>{const n=Number(String(v??"").replace(/[\s\u00a0\u202f€]/g,"").replace(",","."));return Number.isFinite(n)?n:NaN};
const money=v=>Number.isFinite(v)?eur.format(v):"—",percentage=v=>Number.isFinite(v)?pct.format(v)+" %":"—";
let data=null,error="",loading=false,period="month",year="2026",selectedMonth="2026-09";
const make=(tag,cls,t)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(t!==undefined)e.textContent=t;return e;};
const put=(p,tag,cls,t)=>{const e=make(tag,cls,t);p.appendChild(e);return e;};
const round=v=>Math.round(v*100)/100;
const sum=(a,k)=>round(a.reduce((s,x)=>s+(Number.isFinite(x[k])?x[k]:0),0));
const ratio=x=>x.ca>0?x.rh/x.ca*100:NaN;
const calMonth=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5,7)),0).getDate();
async function read(url,token){const res=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store"});const p=await res.json();if(!res.ok||!p.ok)throw Error(p.error||"Source indisponible");return p;}
async function load(force){
 if(loading||data&&!force)return;loading=true;error="";render();
 try{
  const user=window.netlifyIdentity?.currentUser?.();if(!user)throw Error("Connecte-toi pour accéder à l'analyse RH.");
  const token=await user.jwt();
  const [rh,sales]=await Promise.all([read("/.netlify/functions/rh-monthly",token),read("/.netlify/functions/sales",token)]);
  const salesMap=new Map();
  (sales.rows||[]).forEach(r=>{
   const m=String(r.date||"").slice(0,7);if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(m))return;
   if(!String(r.etablissement||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes("ocean"))return;
   if(!salesMap.has(m))salesMap.set(m,{ca:0,z:0,dates:new Set(),zIds:new Set(),duplicateZ:0,invalid:0});
   const s=salesMap.get(m),v=num(r.ca_ht),zId=String(r.z||"").trim();s.z++;s.dates.add(String(r.date).slice(0,10));
   if(zId){if(s.zIds.has(zId))s.duplicateZ++;s.zIds.add(zId)}
   if(!Number.isFinite(v))s.invalid++;else s.ca+=v;
  });
  const months=(rh.months||[]).map(p=>{
   const s=salesMap.get(p.month),reconciled=p.status==="complet"&&Number.isFinite(p.cout_comptable);
   return {...p,rh:reconciled?p.cout_comptable:p.cout_charge,baseRH:reconciled?"comptable nette":"brut + charges",ca:s&&s.invalid===0?round(s.ca):NaN,z:s?.z||0,days:s?.dates.size||0,invalidZ:s?.invalid||0,
    warnings:[...(Math.abs(p.ecart_641||0)>.02&&!reconciled?["Écart 641 : "+money(p.ecart_641)]:[]),
      ...(Math.abs(p.ecart_charges||0)>.02?["Écart 633/645 : "+money(p.ecart_charges)]:[]),
      ...(p.avantages_nourriture<0?["Contrepartie nourriture négative"]:[]),
      ...(!s?["Z de caisse absents"]:s.invalid?["CA HT non numérique"]:s.dates.size!==calMonth(p.month)?["Dates de Z à contrôler ("+s.dates.size+"/"+calMonth(p.month)+")"]:[])]};
  }).sort((a,b)=>a.month.localeCompare(b.month));
  if(!months.length)throw Error("Aucun mois RH importé");
  const rhMonthKeys=new Set(months.map(x=>x.month));
  const pendingSalesMonths=[...salesMap.entries()].filter(([m,x])=>m>="2026-10"&&!rhMonthKeys.has(m)&&x.dates.size>0).map(([m,x])=>({month:m,ca:round(x.ca),days:x.dates.size,z:x.z,invalid:x.invalid,duplicateZ:x.duplicateZ})).sort((a,b)=>b.month.localeCompare(a.month));
  data={months,duplicates:rh.duplicates||[],invalid:rh.invalid||[],pendingSalesMonths};
  const years=[...new Set(months.map(x=>x.month.slice(0,4)))];if(!years.includes(year))year=years.at(-1);
 }catch(e){error=e.message}finally{loading=false;render()}
}
function group(items){
 const map=new Map();
 items.forEach(x=>{
  const y=x.month.slice(0,4),m=Number(x.month.slice(5)),label=period==="month"?x.month:period==="quarter"?y+"-T"+Math.ceil(m/3):y;
  if(!map.has(label))map.set(label,{label,year:y,rh:0,ca:0,months:0,warnings:0,z:0,invalidCa:false});
  const p=map.get(label);p.rh+=x.rh;p.months++;p.z+=x.z;p.warnings+=x.warnings.length;if(!Number.isFinite(x.ca))p.invalidCa=true;else p.ca+=x.ca;
 });
 return [...map.values()].map(x=>({...x,rh:round(x.rh),ca:x.invalidCa?NaN:round(x.ca),ratio:x.invalidCa?NaN:x.rh/x.ca*100})).sort((a,b)=>a.label.localeCompare(b.label));
}
function comparison(all,label){
 const current=all.find(x=>x.label===label),previous=all.find(x=>x.label===String(Number(label.slice(0,4))-1)+label.slice(4));
 return !current||!previous||!Number.isFinite(current.ratio)||!Number.isFinite(previous.ratio)?null:{
  delta:current.ratio-previous.ratio,rhChange:previous.rh?(current.rh/previous.rh-1)*100:NaN,caChange:previous.ca?(current.ca/previous.ca-1)*100:NaN
 };
}
function root(id){
 const shell=document.querySelector("#module-"+id+" .module-shell");if(!shell)return null;
 let e=shell.querySelector(".rh-monthly-panel");
 if(!e){e=make("section","rh-monthly-panel");const anchor=id==="reports"?shell.querySelector(".module-placeholder"):id==="teamperf"?shell.querySelector(".future-panel-grid"):shell.querySelector(".dq-root");
  if(anchor)shell.insertBefore(e,anchor);else shell.appendChild(e)}
 return e;
}
function button(parent,label,action,active){const b=put(parent,"button","rh-action"+(active?" selected":""),label);b.type="button";b.onclick=action;return b;}
function stat(p,label,value,detail){const c=put(p,"div","rh-stat");put(c,"span","rh-muted",label);put(c,"strong","",value);if(detail)put(c,"small","rh-muted",detail);}
function drawBars(parent,groups,view){
 const all=groups.filter(x=>view==="year"||x.year===year);
 if(!all.length)return;
 const holder=put(parent,"div","rh-bars");const max=Math.max(1,...all.map(x=>Number.isFinite(x.ratio)?x.ratio:0))*1.13;
 all.forEach(x=>{
  const row=put(holder,"div","rh-bar-row");
  put(row,"span","rh-bar-label",period==="month"?x.label.slice(5):period==="quarter"?x.label.slice(5):x.label);
  const track=put(row,"div","rh-bar-track");
  const fill=put(track,"div","rh-bar-fill"+(Number.isFinite(x.ratio)&&x.ratio>45?" rh-high":""),undefined);
  fill.style.width=(Number.isFinite(x.ratio)?Math.max(0,x.ratio/max*100):0)+"%";
  fill.title=x.label+" : "+percentage(x.ratio);
  put(row,"strong","rh-bar-num",percentage(x.ratio));
 });
}
function table(parent,groups){
 const wrap=put(parent,"div","rh-table-scroll"),t=put(wrap,"table","rh-table"),head=put(t,"thead"),tr=put(head,"tr");
 ["Période","CA HT","Brut","Charges patronales","Coût RH chargé","Ratio RH","N-1 (points)","Contrôles"].forEach(h=>put(tr,"th","",h));
 const body=put(t,"tbody");
 groups.forEach(x=>{
  const rows=data.months.filter(m=>m.month.startsWith(x.label.slice(0,4))&&(period==="year"||period==="quarter"?period==="year"||Math.ceil(Number(m.month.slice(5))/3)===Number(x.label.at(-1)):m.month===x.label));
  const delta=period==="year"&&x.months!==12?null:comparison(groups,x.label);const tr=put(body,"tr");
  const brut=sum(rows,"brut"),pat=sum(rows,"charges_patronales");
  [x.label,money(x.ca),money(brut),money(pat),money(x.rh),percentage(x.ratio),delta?(delta.delta>=0?"+":"")+pct.format(delta.delta)+" pt":"—",x.warnings?"⚠ "+x.warnings+" contrôle(s)":"Source(s) rapprochée(s)"].forEach((v,i)=>put(tr,"td",i===7&&x.warnings?"rh-attention":"",v));
 });
}
function pendingPayrollDiagnostic(p){
 const waiting=data?.pendingSalesMonths?.[0];if(!waiting)return;
 const panel=put(p,"section","rh-pending");
 put(panel,"strong","","⚠ "+waiting.month+" · paie absente des données RH consolidées");
 put(panel,"p","","CA HT KSD "+money(waiting.ca)+" sur "+waiting.days+" jour(s), mais aucun coût de paie MySilae n'est encore intégré pour ce mois dans RH_Mensuel. Le ratio RH n'est donc pas calculable de manière fiable.");
 const knownOctober=waiting.month==="2026-10";
 const warnings=knownOctober?[
  "Écart de 700 € entre brut MySilae et comptes de rémunération : appartements / avantages en nature identifiés par la direction. Rapprocher l'imputation comptable, sans compter deux fois le logement.",
  "Fin des contrats saisonniers au 31 octobre : indemnités et soldes de congés peuvent gonfler le coût mensuel ; distinguer sorties exceptionnelles et charges récurrentes.",
  "Provisions de repos : baisse de 7 940,50 € entre fin septembre et fin octobre, expliquée par les sorties saisonnières. Vérifier son passage en comptabilité avant tout ajustement.",
  "Vérifier les charges patronales 633/645 et les indemnités du compte 649 sans double comptage."
 ]:[
  "Rapprocher le brut du journal de paie avec le compte 641 (et les avantages en nature).",
  "Vérifier les charges patronales 633/645 et les indemnités du compte 649 sans double comptage.",
  "Vérifier les variations des provisions de repos en comptabilité d'engagement avant le ratio."
 ];
 if(waiting.duplicateZ)warnings.push(knownOctober?
  "Z n° 1067 reporté sur les 26 et 27 octobre : incident de saturation de la clé de caisse le 26 octobre déclaré par la direction. La valeur du 26 est une estimation, non une seconde clôture réelle. Contrôler uniquement le CA reconstitué.":
  waiting.duplicateZ+" numéro(s) de Z répété(s) à contrôler sur les ventes du mois.");
 if(waiting.invalid)warnings.push(waiting.invalid+" ligne(s) de CA HT non numérique(s).");
 const ul=put(panel,"ul","");warnings.forEach(t=>put(ul,"li","",t));
 put(panel,"p","rh-muted","Diagnostic uniquement : les ratios précédents et les données de paie n'ont pas été modifiés.");
}
function renderReport(p){
 p.replaceChildren();
 const top=put(p,"div","rh-header");put(top,"h3","","Analyse financière · Masse salariale");put(top,"span","rh-state",data?.months.at(-1)?.status==="complet"?"PAIE COMPTABLE INTÉGRÉE":"DONNÉES À RAPPROCHER");
 put(p,"p","rh-muted","L'Océan · RH sur CA HT KSD. Coût comptable net retenu lorsqu'il est explicitement rapproché avec les comptes 641, 633/645 et 649 ; sinon brut + charges patronales. Pas de provision CP ajoutée deux fois.");
 if(!data){put(p,"p","rh-warn",loading?"Synchronisation des données RH et CA…":error||"Connexion nécessaire pour afficher les données.");button(p,"↻ Charger",()=>load(true));return;}
 pendingPayrollDiagnostic(p);
 const actions=put(p,"div","rh-controls");
 ["month","quarter","year"].forEach((v,i)=>button(actions,["Mensuel","Trimestriel","Annuel"][i],()=>{period=v;render()},period===v));
 if(period!=="year")for(const y of ["2024","2025","2026"])button(actions,y,()=>{year=y;render()},year===y);
 button(actions,"↻ Actualiser",()=>load(true));
 const all=group(data.months),shown=period==="year"?all:all.filter(x=>x.year===year);
 const thisYear=group(data.months.filter(x=>x.month.slice(0,4)===year));
 const focus=shown.at(-1),prior=focus&&!(period==="year"&&focus.months!==12)?comparison(all,focus.label):null;
 const cards=put(p,"div","rh-summary-grid");
 stat(cards,"Ratio RH · "+(focus?.label||"—"),percentage(focus?.ratio),focus&&period==="year"&&focus.months<12?focus.months+" mois disponibles · année incomplète":"Coût chargé / CA HT");
 stat(cards,"Coût RH retenu",money(focus?.rh),focus&&period==="month"&&data.months.find(m=>m.month===focus.label)?.baseRH==="comptable nette"?"Coût comptable après indemnités 649":"Brut + charges patronales");
 stat(cards,"CA HT",money(focus?.ca),"KSD · ventes mensuelles");
 stat(cards,"Évolution du ratio N-1",prior?(prior.delta>=0?"+":"")+pct.format(prior.delta)+" pt":"—",prior?"Même période année précédente":"Comparer uniquement des périodes équivalentes");
 const chart=put(p,"div","rh-chart");put(chart,"h4","","Comparaison des ratios RH · "+(period==="year"?"exercices":year));drawBars(chart,shown,period);
 const caption=put(p,"p","rh-muted","Graphique : coût salarial chargé rapporté au CA HT, calculé sur les totaux de chaque période (pas de moyenne simple). Les années incomplètes ne doivent pas être comparées comme des exercices entiers.");
 put(p,"h4","","Détail de gestion et rapprochements");table(p,shown);
 const notes=put(p,"div","rh-notes");
 put(notes,"strong","","Contrôles non clos");
 put(notes,"p","","Autres périodes : des écarts historiques restent signalés. Octobre 2026 : chiffres issus du cabinet comptable, rapprochés suivant les explications communiquées par la direction.");
 put(notes,"p","","Repas et logements : ne pas ajouter ni déduire deux fois les rubriques. Coût global MySilae et provisions CP conservés pour réconciliation, hors ratio principal.");
 put(notes,"p","","Octobre 2026 : 700 € de logements expliqués ; coût comptable 641 + 633/645 - 649 retenu ; fin des contrats saisonniers et variation des provisions de repos documentées sans double comptage ; Z du 26 octobre estimé en raison d'un incident de clé de caisse.");
 if(data.duplicates.length||data.invalid.length)put(notes,"p","","Imports : "+data.duplicates.length+" doublon(s) ; "+data.invalid.length+" mois invalide(s).");
}
function renderSmall(p,id){
 p.replaceChildren();
 const heading=put(p,"div","rh-header");put(heading,"h3","",id==="dashboard"?"Ratio RH · L'Océan":"Masse salariale · synthèse");put(heading,"span","rh-state",data?.months.at(-1)?.status==="complet"?"PAIE INTÉGRÉE":"PROVISOIRE");
 if(!data){put(p,"p","rh-muted",loading?"Chargement…":error||"Ouvre l’analyse RH.");button(p,"Actualiser",()=>load(true));return;}
 pendingPayrollDiagnostic(p);
 const item=data.months.at(-1);
 put(p,"div","rh-main",percentage(ratio({rh:item.rh,ca:item.ca})));
 put(p,"p","rh-muted",item.month+" · "+money(item.rh)+" de coût RH "+(item.baseRH==="comptable nette"?"comptable net":"brut + charges")+" / "+money(item.ca)+" CA HT");
 button(p,"Ouvrir l'analyse RH →",()=>{const b=document.querySelector('.app-nav-item[data-page="reports"]');if(b)b.click();else window.navigateApp?.("reports");});
}
function render(){
 for(const id of ["teamperf","reports"]){const p=root(id);if(p){if(id==="reports")renderReport(p);else renderSmall(p,id)}}
}
function install(){
 const css=make("style");css.textContent=[
 ".rh-monthly-panel{background:#fff;border:1px solid #e3e7e9;border-radius:13px;padding:20px;margin:18px 0;color:#25333b;font:inherit}",
 ".rh-header{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap}.rh-header h3{font-size:17px;margin:0;font-weight:750}",
 ".rh-state{font-size:10px;background:#fff0e5;border-radius:7px;color:#a2542e;padding:6px 9px;font-weight:750}",
 ".rh-muted{font-size:11px;color:#737d85;line-height:1.6}.rh-main{font-size:31px;font-weight:800;color:#163d59;margin-top:14px}",
 ".rh-controls{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:17px 0}",
 ".rh-action{font-size:11px;font-weight:650;padding:9px 11px;border:1px solid #dbe2e6;background:#fff;color:#284255;border-radius:7px;cursor:pointer}",
 ".rh-action.selected{background:#153f60;color:#fff;border-color:#153f60}",
 ".rh-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}",
 ".rh-stat{padding:15px;border:1px solid #e5e9eb;border-radius:10px;display:flex;flex-direction:column;gap:8px;min-width:0}",
 ".rh-stat strong{font-size:20px;color:#153f60;font-variant-numeric:tabular-nums}.rh-stat small{font-size:10px}",
 ".rh-chart{border:1px solid #e5e9eb;border-radius:10px;padding:15px;margin-top:16px}.rh-chart h4{font-size:13px;margin:0 0 16px}",
 ".rh-bars{display:flex;flex-direction:column;gap:10px}.rh-bar-row{display:grid;grid-template-columns:76px 1fr 85px;align-items:center;gap:10px;font-size:11px}",
 ".rh-bar-label{color:#53626e}.rh-bar-track{height:16px;background:#edf2f5;border-radius:3px;overflow:hidden}",
 ".rh-bar-fill{background:#1e6689;height:100%;border-radius:3px}.rh-bar-fill.rh-high{background:#c17d52}.rh-bar-num{text-align:right;font-variant-numeric:tabular-nums}",
 ".rh-table-scroll{overflow-x:auto}.rh-table{width:100%;border-collapse:collapse;min-width:850px;font-size:11px}",
 ".rh-table th{background:#f2f5f7;text-align:right;color:#556571;font-weight:700;padding:11px 9px}.rh-table td{text-align:right;border-bottom:1px solid #eef0f2;padding:11px 9px;white-space:nowrap}",
 ".rh-table th:first-child,.rh-table td:first-child{text-align:left}.rh-attention{color:#bd513a}",
 ".rh-notes{margin-top:17px;border-left:3px solid #bf6c4f;background:#fff7f4;padding:13px;color:#8f4231;font-size:11px;line-height:1.6}",
 ".rh-pending{border-left:3px solid #bf4e39;background:#fff5f1;color:#823b2f;padding:14px;margin:15px 0;border-radius:8px;font-size:12px;line-height:1.6}.rh-pending strong{font-size:13px}.rh-pending ul{padding-left:20px;margin:8px 0}.rh-pending li{margin:3px 0}",
 ".rh-warn{color:#ad4030;font-size:12px}@media(max-width:950px){.rh-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}",
 "@media(max-width:540px){.rh-summary-grid{grid-template-columns:1fr}.rh-bar-row{grid-template-columns:58px 1fr 66px}}"
 ].join("");document.head.appendChild(css);
 render();const ids=["dashboard","teamperf","reports"],observer=new MutationObserver(()=>{if(ids.some(id=>document.getElementById("module-"+id)?.classList.contains("open")))load(false)});
 ids.forEach(id=>{const e=document.getElementById("module-"+id);if(e)observer.observe(e,{attributes:true,attributeFilter:["class"]})});
 if(ids.some(id=>document.getElementById("module-"+id)?.classList.contains("open")))load(false);
 window.addEventListener("rh-ratio-refresh",()=>load(true));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();