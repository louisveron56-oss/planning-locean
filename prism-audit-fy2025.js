/* Audit CA FY2025 : sources KSD / comptes signés. Sans écriture ni correction automatique. */
(function(){"use strict";
const R={ca:2933442.98,bar:2805112.99,hotel:124273.83,personnel:4056.16,prism:2904786.21,achats:788592.72,matiere:789417.33};
const money=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"});
const pct=new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});
const add=(p,t,s)=>{const el=document.createElement(t);if(s!==null)el.textContent=s;p.appendChild(el);return el;};
const fmt=d=>d.slice(8,10)+"/"+d.slice(5,7)+"/"+d.slice(0,4);
function dates(rows){
 const r=(rows||[]).filter(x=>x.day>="2024-10-01"&&x.day<="2025-09-30");
 const map=new Map();let total=0,bad=0;
 for(const v of r){if(!map.has(v.day))map.set(v.day,[]);map.get(v.day).push(v);if(Number.isFinite(v.ht))total+=v.ht;else bad++}
 const missing=[];let d=new Date("2024-10-01T12:00:00Z");
 while(d.toISOString().slice(0,10)<="2025-09-30"){const k=d.toISOString().slice(0,10);if(!map.has(k))missing.push(k);d.setUTCDate(d.getUTCDate()+1)}
 return {total,bad,count:r.length,missing,multiple:[...map.entries()].filter(([k,v])=>v.length>1)};
}
function render(parent,sales){
 const outer=add(parent,"section",null);outer.style.cssText="padding:15px;margin-top:15px;background:white;border:1px solid #dde7eb;border-radius:9px;color:#304958;font-size:12px;line-height:1.55";
 add(outer,"h3","Audit du CA 2025 · références distinctes").style.margin="0 0 8px";
 add(outer,"p","Exercice 01/10/2024 – 30/09/2025. Bilan signé p. 8 et 15, comparé aux lignes de ventes Prism. Contrôle en lecture seule.").style.color="#6b7981";
 function line(label,n){const tr=add(outer,"div",null);tr.style.cssText="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #edf1f3";add(tr,"span",label);add(tr,"strong",money.format(n)).style.whiteSpace="nowrap"}
 line("CA HT comptable total",R.ca);line("Compte 707 · bar et brasserie",R.bar);line("Compte 706 · hôtel",R.hotel);line("Compte 708 · prestations personnel",R.personnel);line("CA HT Prism, relevé de gestion",R.prism);line("Écart total bilan − gestion",R.ca-R.prism);line("Prism − bar/brasserie uniquement",R.prism-R.bar);
 const warn=add(outer,"p","Attention : le CA Prism dépasse les seules ventes comptables bar/brasserie de 99 673,22 €. Avant d'imputer les 28 656,77 € d'écart aux Z, identifier les ventes d'hôtel et les traitements comptables inclus dans chaque source.");
 warn.style.cssText="padding:10px;border-left:3px solid #ba8a4e;background:#fff8ed;color:#765938";
 const audit=dates(sales);add(outer,"h4","Exhaustivité des dates dans les lignes de caisse disponibles").style.marginBottom="4px";
 add(outer,"p","Lignes chargées : "+audit.count+" · total HT : "+money.format(audit.total)+" · écart avec la référence de gestion : "+money.format(audit.total-R.prism)+(audit.bad?" · "+audit.bad+" montant(s) invalide(s)":""));
 if(audit.count){
  add(outer,"p","Dates sans ligne : "+(audit.missing.length?audit.missing.map(fmt).join(", "):"aucune"));
  add(outer,"p","Dates avec plusieurs lignes : "+(audit.multiple.length?audit.multiple.map(([date,rows])=>fmt(date)+" ("+rows.length+" Z/lignes"+(rows.some(x=>x.z!=null)?", numéros "+rows.map(x=>x.z).join(" et "):"")+")").join(" ; "):"aucune"));
 }
 add(outer,"p","Une date absente ne prouve pas une perte de CA ; plusieurs Z un même jour ne sont pas automatiquement des doublons. Conserver l'historique avant toute rectification.").style.cssText="font-size:11px;color:#637781";
 add(outer,"h4","Ratios de sources différentes").style.marginBottom="4px";
 add(outer,"p","Achats Prism / CA Prism : "+pct.format(R.achats/R.prism*100)+" % · consommation comptable / CA comptable : "+pct.format(R.matiere/R.ca*100)+" %.");
 add(outer,"p","À rapprocher : affectation des Z aux dates, ventilation hôtel / restauration, recettes comptables 706/707/708 et justificatifs des ajustements. Aucune correction automatique du CA ni des ratios.").style.cssText="font-size:11px;color:#a54438";
}
window.PrismAuditFY2025=Object.freeze({render,dates});
})();