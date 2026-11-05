(function(){
"use strict";
let rows=[],loaded=false,filter="visible",site="ALL",busy=false,period="2026-10";
const root=()=>document.getElementById("prismRemunerationsDemo");
const make=(p,t,v)=>{let e=document.createElement(t);if(v!==undefined)e.textContent=v;p.append(e);return e};
const money=n=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
async function api(body){
const u=window.netlifyIdentity?.currentUser?.();if(!u)throw Error("Connexion requise");
const token=await u.jwt();
const r=await fetch("/.netlify/functions/private-payroll?month="+encodeURIComponent(period),{method:body?"POST":"GET",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,cache:"no-store"});
const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||"Accès indisponible");return d;
}
function btn(p,label,fn){let b=make(p,"button",label);b.type="button";b.onclick=fn;b.style.margin="5px";return b}
async function load(){let box=root();if(!box)return;box.textContent="Vérification des droits…";try{const d=await api();rows=d.rows||[];loaded=true;draw()}catch(e){loaded=true;box.replaceChildren();make(box,"h3","Rémunérations · Accès privé");make(box,"p","Le dossier des salaires est verrouillé. Les autres paramètres de Prism restent accessibles.");make(box,"p",e.message);if(String(e.message).includes("configurez PRISM_PAYROLL_ADMIN_EMAILS"))make(box,"p","Vérifie la portée Functions et le contexte Deploy Previews dans Netlify, puis redéploie cet aperçu.");else if(String(e.message).includes("Réservé à l’administration")||String(e.message).includes("Réservé à l\'administration"))make(box,"p","Ton compte Prism est connecté, mais son e-mail ne correspond pas à la liste administrateur. Vérifie la valeur de la variable Netlify.");else if(String(e.message).includes("Connexion Prism requise"))make(box,"p","Reconnecte-toi à Prism, puis réessaie.");else if(String(e.message).includes("Stockage privé"))make(box,"p","Accès administrateur autorisé, mais le stockage Netlify Blobs n’est pas disponible.");btn(box,"Réessayer",()=>{loaded=false;load()});}}
async function upload(file){if(!file)return;try{let document=JSON.parse(await file.text());if(document.period!==period)throw Error("Le fichier correspond à "+document.period+" et non à "+period);await api({action:"import",document});await load()}catch(e){alert(e.message)}}
async function archive(r){try{await api({action:"archive",record_id:r.record_id,status:r.status==="archived"?"visible":"archived"});await load()}catch(e){alert(e.message)}}
function draw(){
 const box=root();if(!box)return;box.replaceChildren();
 make(box,"h3","Rémunérations · "+period+" — accès administrateur");
 const chooser=make(box,"label","Période : ");const picker=make(chooser,"input");picker.type="month";picker.value=period;picker.min="2026-01";picker.max="2035-12";picker.onchange=()=>{if(!/^20\\d\\d-(0[1-9]|1[0-2])$/.test(picker.value))return;period=picker.value;loaded=false;load()};
 make(box,"p","Données individuelles confidentielles. Chaque mois est conservé séparément ; archiver masque sans supprimer les montants.");
 if(!rows.length){make(box,"p","Aucune fiche de salaire individuelle importée pour ce mois. La synthèse RH comptable est indépendante et reste disponible.");
 const input=make(box,"input");input.type="file";input.accept=".json";input.onchange=()=>upload(input.files[0]);return}
 const select=make(box,"select");["ALL","OCEAN","ESCALE"].forEach(v=>{const o=make(select,"option",v==="ALL"?"Tous les établissements":v);o.value=v});select.value=site;select.onchange=()=>{site=select.value;draw()};
 const st=make(box,"select");["visible","archived","all"].forEach(v=>{let o=make(st,"option",v==="visible"?"Visibles":v==="archived"?"Archives":"Tous");o.value=v});st.value=filter;st.onchange=()=>{filter=st.value;draw()};
 const list=rows.filter(r=>(site==="ALL"||r.establishment===site)&&(filter==="all"||r.status===filter));
 const sum=k=>money(list.reduce((a,r)=>a+r[k],0));
 make(box,"p",list.length+" lignes · Brut "+sum("gross")+" · Net "+sum("net")+" · Coût "+sum("employer_cost"));
 const wrap=make(box,"div");wrap.style.overflowX="auto";
 const table=make(wrap,"table");table.style.width="100%";table.style.borderCollapse="collapse";
 let head=make(table,"tr");["Société","Matricule","Salarié","Brut","Net à payer","Coût","Situation","Action"].forEach(v=>make(head,"th",v));
 for(const r of list){let tr=make(table,"tr");[r.establishment,r.employee_id,r.name,money(r.gross),money(r.net),money(r.employer_cost),r.status].forEach(v=>{let td=make(tr,"td",v);td.style.padding="8px";td.style.borderBottom="1px solid #ddd"});btn(make(tr,"td"),r.status==="archived"?"Réafficher":"Archiver",()=>archive(r))}
}
function init(){const host=document.querySelector("#module-settings .module-shell");if(!host)return;let box=make(host,"section");box.id="prismRemunerationsDemo";box.style.cssText="background:white;border:1px solid #ddd;border-radius:12px;padding:18px;margin:18px 0";make(box,"h3","Rémunérations · Accès privé");const target=document.getElementById("module-settings");if(target){new MutationObserver(()=>{if(target.classList.contains("open")&&!loaded&&!busy){busy=true;load().finally(()=>busy=false)}}).observe(target,{attributes:true,attributeFilter:["class"]});if(target.classList.contains("open"))load()}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();