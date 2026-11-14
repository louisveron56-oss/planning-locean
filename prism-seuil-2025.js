/* Prism FY2025 — compte de resultat signe, estimation traçable et simulations. */
(function(){
"use strict";
const A=Object.freeze({ca:2933442.98,produits:3010180.97,charges:2991280.14,achats:764566.60,stocks:24850.73,rh:1549267.04,resultat:18900.83,subventions:11666.64,transferts:47568.65,autres:17502.70});
const euro=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const pc=new Intl.NumberFormat("fr-FR",{style:"percent",maximumFractionDigits:1});
const el=(p,tag,txt,css)=>{const x=document.createElement(tag);if(txt!==null)x.textContent=txt;if(css)x.style.cssText=css;p.appendChild(x);return x;};
const materials=A.achats+A.stocks;
const extra=A.produits-A.ca;
const checked=Math.abs(A.produits-A.charges-A.resultat)<0.01&&Math.abs(materials-789417.33)<0.01;
function calc(pct,includeOther){
 const variable=materials+(A.rh*pct/100),rate=variable/A.ca,fixed=A.charges-variable,credits=includeOther?extra:0;
 return {variable,rate,fixed,credits,threshold:(fixed-credits)/(1-rate)};
}
function render(host){
 if(!host||!checked)return;
 const sec=el(host,"section",null,"margin:16px 0 20px;padding:16px;border:1px solid #d5e2e7;border-radius:11px;background:#fff;color:#254655;font-size:12px;line-height:1.55");
 el(sec,"h3","Seuil estimatif 2025 · société entière","font-size:16px;margin:0 0 4px;color:#264654");
 el(sec,"p","Exercice comptable du 01/10/2024 au 30/09/2025 — restauration, bar et hôtel inclus.","color:#637885;margin:0 0 12px");
 el(sec,"p","Modèle estimatif, non certifié : les marchandises consommées sont considérées variables ; les autres charges sont provisoirement traitées comme structurelles tant que leur part variable n'est pas mesurée.","border-left:3px solid #b57e3a;background:#fff9ed;padding:10px;color:#865c2b;margin:0 0 14px");
 const ctrl=el(sec,"div",null,"display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:12px");
 const l=el(ctrl,"label","Part du coût RH comptable traitée comme variable : 0 %","font-weight:600");
 const slider=el(ctrl,"input",null,"width:180px;max-width:100%;accent-color:#365f73");
 slider.type="range";slider.min="0";slider.max="30";slider.step="1";slider.value="0";slider.setAttribute("aria-label","Part variable hypothétique des charges RH en pourcentage");
 const options=el(sec,"div",null,"margin:0 0 12px");
 const checkbox=el(options,"input",null,"margin-right:8px");checkbox.type="checkbox";checkbox.checked=true;checkbox.id="prism-seuil-2025-other-income";
 const label=el(options,"label","Prendre en compte les autres produits d'exploitation 2025 (76 738 €)");label.htmlFor=checkbox.id;
 const headline=el(sec,"div",null,"display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0");
 function box(caption){const b=el(headline,"div",null,"border:1px solid #dce5e8;border-radius:9px;padding:12px");el(b,"span",caption,"display:block;font-size:11px;color:#6a7c84");return el(b,"strong","—","display:block;font-size:23px;margin-top:6px;font-variant-numeric:tabular-nums;color:#23536c");}
 const threshold=box("Seuil estimatif HT annuel"),safety=box("Marge de sécurité sur CA 2025"),rateBox=box("Taux des charges variables modélisées");
 const details=el(sec,"div",null,"display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:14px 0");
 const values={};
 [["ca","CA HT comptable 2025"],["purch","Marchandises consommées"],["rh","Coût RH comptable"],["other","Autres produits d'exploitation"],["fix","Charges modélisées fixes"],["variable","Charges modélisées variables"],["profit","Résultat d'exploitation recalculé"]].forEach(([key,name])=>{
  const p=el(details,"p",null,"margin:0;padding:8px;background:#f6f8f8;border-radius:7px");
  el(p,"span",name+" : ","color:#68808b");values[key]=el(p,"strong","—");
 });
 const notes=el(sec,"p","Contrôle comptable : produits d'exploitation 3 010 180,97 € − charges d'exploitation 2 991 280,14 € = résultat d'exploitation 18 900,83 €. Source : comptes annuels signés, pages 8 et 15–17. Les produits hors CA comprennent notamment subventions et transferts de charges, dont la reconduction n'est pas garantie.","color:#6b7984;margin:12px 0;font-size:11px");
 function update(){
  const pct=Number(slider.value),r=calc(pct,checkbox.checked),prudent=calc(pct,false);
  l.textContent="Part du coût RH comptable traitée comme variable : "+pct+" % (hypothèse)";
  threshold.textContent=euro.format(r.threshold);safety.textContent=euro.format(A.ca-r.threshold);rateBox.textContent=pc.format(r.rate);
  values.ca.textContent=euro.format(A.ca);values.purch.textContent=euro.format(materials);values.rh.textContent=euro.format(A.rh);
  values.other.textContent=euro.format(r.credits);values.fix.textContent=euro.format(r.fixed);
  values.variable.textContent=euro.format(r.variable);values.profit.textContent=euro.format(A.resultat);
  notes.textContent="Seuil avec autres produits 2025 : "+euro.format(calc(pct,true).threshold)+". Seuil prudent sans ces produits : "+euro.format(prudent.threshold)+". Contrôle comptable : 3 010 180,97 € − 2 991 280,14 € = 18 900,83 €. Toute variation de la part RH est une hypothèse de simulation, non une mesure certifiée. Sources : comptes signés, pages 8 et 15–17.";
 }
 slider.addEventListener("input",update);checkbox.addEventListener("change",update);update();
 el(sec,"p","Attention : il s'agit d'un seuil d'exploitation comptable, non du besoin de trésorerie. Les remboursements de capital d'emprunts ne sont pas des charges d'exploitation ; les dotations aux amortissements ne sont pas des sorties de trésorerie. Le calcul suppose des taux de charges variables stables autour de l'activité observée.","color:#8e4343;font-weight:600;margin:10px 0 0");
}
window.PrismSeuil2025={render};
})();
