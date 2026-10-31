/* Prism - prototype non nominatif de gestion des remunerations.
 * Aucune donnée salariale réelle, aucune persistance, aucun endpoint.
 * Les droits admin devront être vérifiés côté serveur avant activation réelle.
 */
(function(){
"use strict";
const demo=[
 {id:"DEMO-001",name:"Camille D. (fictif)",team:"Cuisine",job:"Chef de partie",gross:2650,start:"2025-04-01",exit:"",status:"actif"},
 {id:"DEMO-002",name:"Thomas L. (fictif)",team:"Salle",job:"Chef de rang",gross:2200,start:"2025-06-15",exit:"",status:"actif"},
 {id:"DEMO-003",name:"Alex M. (fictif)",team:"Bar",job:"Barman",gross:2400,start:"2024-03-11",exit:"2026-08-31",status:"sorti"}
];
const state=demo.map(x=>({...x}));let filter="actif";
const euro=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2});
const el=(p,t,cl,txt)=>{let n=document.createElement(t);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;p.appendChild(n);return n};
function control(p,txt,fn,selected){const b=el(p,"button","remu-btn"+(selected?" remu-on":""),txt);b.type="button";b.onclick=fn;return b;}
function draw(){
 const parent=document.getElementById("prismRemunerationsDemo");if(!parent)return;
 parent.replaceChildren();
 const title=el(parent,"div","remu-title");el(title,"h3","","Registre des rémunérations");el(title,"span","remu-demo-pill","DÉMONSTRATION · DONNÉES FICTIVES");
 el(parent,"p","remu-muted","Préfiguration de la future rubrique réservée aux administrateurs. Aucun salaire réel n'est lu, transmis ou enregistré.");
 const filters=el(parent,"div","remu-filters");
 [["actif","Actifs"],["sorti","Sortis"],["tous","Tous"]].forEach(([k,label])=>control(filters,label,()=>{filter=k;draw()},filter===k));
 const list=state.filter(x=>filter==="tous"||x.status===filter);
 const summary=el(parent,"div","remu-summary");
 const active=state.filter(x=>x.status==="actif");
 el(summary,"div","","Actifs (simulation) : "+active.length);
 el(summary,"div","","Brut contractuel mensuel indicatif : "+euro.format(active.reduce((s,x)=>s+x.gross,0)));
 const scroller=el(parent,"div","remu-table-wrap"),table=el(scroller,"table","remu-table"),thead=el(table,"thead"),head=el(thead,"tr");
 ["Salarié fictif","Service","Poste","Brut mensuel fictif","Entrée","Sortie","Situation","Simulation"].forEach(x=>el(head,"th","",x));
 const tbody=el(table,"tbody");
 list.forEach(x=>{
  const row=el(tbody,"tr","");
  [x.name,x.team,x.job,euro.format(x.gross),x.start,x.exit||"—",x.status==="actif"?"Actif":"Sorti"].forEach(v=>el(row,"td","",v));
  const col=el(row,"td","");
  if(x.status==="actif")control(col,"Simuler une sortie",()=>{const d=window.prompt("Date de sortie fictive (AAAA-MM-JJ) :","2026-10-31");if(d===null)return;if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d))){window.alert("Date non valide");return}x.exit=d;x.status="sorti";draw()});
  else control(col,"Réactiver la démo",()=>{x.exit="";x.status="actif";draw()});
 });
 if(!list.length)el(parent,"p","remu-muted","Aucun salarié fictif dans cette catégorie.");
 const foot=el(parent,"div","remu-foot");
 el(foot,"strong","","Règles prévues pour la version réelle");
 el(foot,"p","","Sortie = archivage, jamais suppression automatique de l'historique. Les salaires contractuels, bruts versés et coûts employeur seront distingués, avec dates d'effet et traçabilité.");
 el(foot,"p","","L'accès devra être autorisé par un rôle administrateur vérifié par le serveur. Aucun import MySilae nominatif avant cette protection.");
 control(foot,"Réinitialiser la démonstration",()=>{state.splice(0,state.length,...demo.map(x=>({...x})));filter="actif";draw()});
}
function init(){
 const shell=document.querySelector("#module-settings .module-shell");if(!shell)return;
 let section=document.getElementById("prismRemunerationsDemo");
 if(!section){section=el(shell,"section","remu-root");section.id="prismRemunerationsDemo";}
 const style=document.createElement("style");style.textContent=[
 ".remu-root{border:1px solid #e2e8ed;background:#fff;border-radius:12px;padding:18px;margin:20px 0;color:#283e4b}",
 ".remu-title{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.remu-title h3{margin:0;font-size:17px}",
 ".remu-demo-pill{font-size:10px;color:#8d5d2d;background:#fff2df;padding:7px;border-radius:6px;font-weight:700}",
 ".remu-muted{font-size:11px;color:#70818b;line-height:1.6}.remu-filters{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}",
 ".remu-btn{font:inherit;font-size:11px;border:1px solid #d9e2e7;border-radius:7px;background:#fff;color:#24506b;padding:9px 12px;cursor:pointer}",
 ".remu-btn.remu-on{background:#194f6e;color:#fff;border-color:#194f6e}.remu-summary{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:15px;font-size:12px;font-weight:650}",
 ".remu-table-wrap{overflow-x:auto}.remu-table{width:100%;min-width:870px;border-collapse:collapse;font-size:11px}",
 ".remu-table th,.remu-table td{text-align:left;padding:11px 9px;border-bottom:1px solid #edf0f2;white-space:nowrap}",
 ".remu-table th{background:#f4f7f8;color:#526572}.remu-foot{border-left:3px solid #c6a36e;background:#fffaf3;margin-top:18px;padding:13px;font-size:11px;color:#715b3c;line-height:1.5}",
 ".remu-foot p{margin:8px 0}.remu-foot strong{color:#4c483d}"
 ].join("");document.head.appendChild(style);
 const old=shell.querySelector(".module-placeholder");if(old){old.style.display="none";}
 draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();