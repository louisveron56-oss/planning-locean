/* Prism — Ratio RH mensuel, L'Océan. Sources en lecture seule. */
(function(){
'use strict';
const period="2026-09";
const euro=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"});
const num=new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt=v=>euro.format(v);
const asNumber=x=>{const n=Number(String(x??"").replace(/[\s\u00a0\u202f€]/g,"").replace(",","."));return Number.isFinite(n)?n:NaN};
let snapshot=null,loaded=false,loading=false;
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const add=(el,tag,cls,text)=>{const e=make(tag,cls,text);el.appendChild(e);return e};
async function api(url,token){
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||"Lecture impossible");
 return data;
}
function getTarget(id){
 const parent=document.querySelector("#module-"+id+" .module-shell");if(!parent)return null;
 let root=parent.querySelector(".rh-monthly-panel");
 if(!root){root=add(parent,"section","rh-monthly-panel");if(id==="dashboard"){const before=parent.querySelector(".dq-root");if(before)parent.insertBefore(root,before)}}
 return root;
}
function line(root,label,value){const r=add(root,"div","rh-kpi-row");add(r,"span","",label);add(r,"strong","",value);}
function navigate(){
 const b=document.querySelector('.app-nav-item[data-page="reports"]');
 if(b)b.click();else window.navigateApp?.("reports");
}
function render(){
 for(const id of ["dashboard","teamperf","reports"]){
  const root=getTarget(id);if(!root)continue;root.replaceChildren();
  const head=add(root,"div","rh-head");
  add(head,"strong","",id==="dashboard"?"Masse salariale · septembre 2026":id==="reports"?"Analyse des coûts RH · septembre 2026":"Ratio RH · L'Océan · septembre 2026");
  add(head,"span","rh-state",typeof snapshot?.ratio==="number"?"PROVISOIRE":"À COMPLÉTER");
  if(!loaded){add(root,"p","rh-message",loading?"Lecture des sources en cours…":"Ouvre la rubrique ou actualise pour charger les données.");}
  else if(snapshot?.error){add(root,"p","rh-warning",snapshot.error);}
  else {
   if(snapshot.ratio!==null){
    const main=add(root,"div","rh-metric");
    add(main,"strong","rh-big",num.format(snapshot.ratio)+" %");
    add(main,"span","","Coût salarial chargé MySilae / CA HT de septembre");
   }
   else add(root,"p","rh-warning","Ratio indisponible : données de paie ou CA HT non rapprochées.");
   line(root,"Coût salarial chargé",fmt(snapshot.payroll.charged));
   line(root,"Salaire brut",fmt(snapshot.payroll.gross));
   line(root,"Charges patronales",fmt(snapshot.payroll.patronales));
   line(root,"CA HT des Z",snapshot.ca!==null?fmt(snapshot.ca):"Non disponible");
   if(id==="teamperf"||id==="reports"){
    line(root,"Lignes Z retenues",String(snapshot.salesRows));
    const warns=add(root,"div","rh-notes");
    add(warns,"strong","","Contrôles avant validation définitive");
    snapshot.warnings.forEach(w=>add(warns,"p","", "⚠ "+w));
    add(root,"p","rh-source","Sources : Journal de paie MySilae septembre 2026 · LOCEAN_DATA_API / Jours. Aucune provision CP ajoutée. Les logements et le compte 649 restent suivis séparément.");
   } else {
    add(root,"p","rh-warning","⚠ Donnée de paie exploitable ; rapprochement comptable et dates des Z à contrôler.");
    const b=add(root,"button","rh-action","Ouvrir l’analyse RH →");b.type="button";b.onclick=navigate;
   }
  }
  if(id==="teamperf"||id==="reports"){
   const b=add(root,"button","rh-action","↻ Actualiser le CA et la paie");b.type="button";b.disabled=loading;b.onclick=()=>load(true);
  }
 }
}
async function load(force){
 if(loading||loaded&&!force)return;loading=true;render();
 try{
  const user=window.netlifyIdentity?.currentUser?.();
  if(!user)throw Error("Connexion requise pour consulter les montants RH.");
  const token=await user.jwt();
  const [p,s]=await Promise.all([api("/.netlify/functions/rh-monthly?month="+period,token),api("/.netlify/functions/sales",token)]);
  if(!p.ok||!p.payroll)throw Error("Journal de paie non disponible.");
  const rows=(s.rows||[]).filter(x=>String(x.date||"").startsWith(period)&&String(x.etablissement||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes("ocean"));
  const invalid=rows.filter(x=>!Number.isFinite(asNumber(x.ca_ht)));
  const ca=invalid.length?null:Math.round(rows.reduce((sum,x)=>sum+asNumber(x.ca_ht),0)*100)/100;
  const uniqueDays=new Set(rows.map(x=>String(x.date).slice(0,10))).size;
  const warnings=[];
  if(rows.length!==30)warnings.push(rows.length+" lignes de Z en septembre : vérifier les journées de clôture.");
  if(uniqueDays!==30)warnings.push(rows.length+" lignes sur "+uniqueDays+" dates distinctes : des Z sont datés le même jour, probablement à la clôture nocturne. À vérifier.");
  if(invalid.length)warnings.push(invalid.length+" ligne(s) de Z avec CA HT invalide.");
  warnings.push("Les 700 € de participations logement (400 € Martin, 300 € Maxence) sont identifiés et confirmés ; leur présentation entre journal et écriture 641 reste à documenter.");
  warnings.push("Le crédit 649 de 2 962,35 € correspond aux avantages nourriture ; selon le comptable, ils sont à intégrer sans charges supplémentaires, sans double comptage. Leur inclusion exacte dans le brut reste à confirmer.");
  warnings.push("La variation des provisions de congés payés n'est pas intégrée au coût salarial de paie.");
  snapshot={payroll:p.payroll,ca,salesRows:rows.length,ratio:ca>0&&!invalid.length?100*p.payroll.charged/ca:null,warnings};
 }catch(err){snapshot={error:err.message,ratio:null};}
 finally{loading=false;loaded=true;render();}
}
function init(){
 render();
 const a=document.getElementById("module-dashboard"),b=document.getElementById("module-teamperf"),c=document.getElementById("module-reports");
 const observer=new MutationObserver(()=>{if(a?.classList.contains("open")||b?.classList.contains("open")||c?.classList.contains("open"))load(false)});
 [a,b,c].filter(Boolean).forEach(e=>observer.observe(e,{attributes:true,attributeFilter:["class"]}));
 if(a?.classList.contains("open")||b?.classList.contains("open"))load(false);
 window.addEventListener("rh-ratio-refresh",()=>load(true));
}
const css=make("style");
css.textContent=[
 ".rh-monthly-panel{background:#fff;border:1px solid #e6ddd5;border-radius:12px;padding:17px;margin:17px 0;color:#372c27}",
 ".rh-head{display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;font-size:14px}",
 ".rh-state{background:#fff0d6;color:#8c590d;font-size:10px;font-weight:800;padding:5px 8px;border-radius:6px}",
 ".rh-metric{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin:13px 0}",
 ".rh-big{font-size:32px;font-weight:800;color:#3b3028}.rh-metric span{font-size:11px;color:#796b61}",
 ".rh-kpi-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f0ebe5;font-size:12px}",
 ".rh-kpi-row strong{font-variant-numeric:tabular-nums}.rh-warning{font-size:11px;color:#a82d2b;line-height:1.5;margin:10px 0}",
 ".rh-notes{background:#fff6f5;border:1px solid #efc7c2;border-radius:9px;padding:12px;margin-top:14px}",
 ".rh-notes strong{color:#a3332d;font-size:12px}.rh-notes p{color:#a3332d;font-size:11px;margin:7px 0}",
 ".rh-source,.rh-message{font-size:11px;color:#7c7067;margin:12px 0}",
 ".rh-action{border:1px solid #ddd1c6;background:#faf7f3;border-radius:8px;padding:9px 12px;margin-top:9px;color:#533d30;cursor:pointer;font-size:11px;font-weight:700}"
].join("");
document.head.appendChild(css);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();