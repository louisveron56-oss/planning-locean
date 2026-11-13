/* PRISM : lecture seule des charges FY2025. Classification analytique provisoire. */
(function(){"use strict";
const data=[["607","Achats nets de marchandises",764566.6,"variable",[["6070010","Boissons",304768.08],["6070020","Alimentation",498819.21],["6097000","Remises fournisseurs",-39020.69]]],["6037","Variation des stocks",24850.73,"variable",[["6037000","Variation de stocks",24850.73]]],["60-62","Autres achats et charges externes",449239.76,"a_verifier",[["6061100","Électricité",26556.21,"mixte"],["6061200","Eau",11228.24,"mixte"],["6061300","Gaz",7884.9,"mixte"],["6063000","Petit équipement",15559.3],["6063010","Verrerie",5541],["6063020","Entretien / hygiène",13746.09,"mixte"],["6068400","Consommables brasserie",13282.51,"variable"],["6080000","Frais accessoires achats",4056.16,"variable"],["6111000","Agendrix",2462.48,"fixe"],["6112000","Blanchissage",3929.94,"mixte"],["6131000","Location-gérance",33000,"fixe"],["6132000","Locations immobilières",57279.96,"fixe"],["6132010","Murs Le Douarin",8232.24,"fixe"],["6132020","Murs SCI Laredo",11932.61,"fixe"],["6132030","SCI L'Océan",34800,"fixe"],["6132040","Stockage",7380,"fixe"],["6161000","Assurance multirisques",10347.9,"fixe"],["6226100","Honoraires comptables",20800,"fixe"],["6226700","Honoraires sociaux",19412.25,"mixte"],["6234100","Offerts clients",10138.48,"variable"],["6270000","Services bancaires",2936.13,"mixte"],["6278000","Commissions sur prestations",11719.56]]],["63","Impôts et taxes",69852.09,"a_verifier",[["6333000","Formation professionnelle",11810.25,"mixte"],["6335000","Taxe apprentissage",7437.23,"mixte"],["6351100","CET",2332.75,"fixe"],["6351120","CVAE",1715,"variable"],["6378000","Taxes diverses",32191.86]]],["64","Salaires et traitements",1193519.95,"mixte",[["6411000","Salaires et appointements",1021317.27,"mixte"],["6411500","Salaire gérante",93092.74,"fixe"],["6413000","Primes",35522.82],["6414000","Indemnités et avantages",36732.25]]],["645-647","Charges sociales",355747.09,"mixte",[["6451000","URSSAF",238049.88,"mixte"],["6452000","Mutuelles",12216.03,"mixte"],["6453200","Retraite salariés",45147.3,"mixte"],["6460000","Cotisations dirigeant",35844,"fixe"]]],["681","Amortissements",99762.69,"fixe",[["6811200","Immobilisations corporelles",99762.69,"fixe"]]],["65","Autres charges d'exploitation",33741.23,"a_verifier",[["6512000","SACEM",1010.56,"fixe"],["6516000","Droits d'auteur",613.34,"fixe"],["6580000","Pénalités et autres charges",32117.33]]]];
const fmt=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"});
const el=(p,tag,value,css)=>{const x=document.createElement(tag);if(value!==null)x.textContent=value;if(css)x.style.cssText=css;p.appendChild(x);return x;};
const names={fixe:"Fixe (provisoire)",variable:"Variable (provisoire)",mixte:"Mixte — à ventiler",a_verifier:"À vérifier"};
function render(host){
 const root=el(host,"section",null,"margin-top:16px;padding:15px;background:#fff;border:1px solid #e4e9ec;border-radius:10px;color:#264553;font-size:12px;line-height:1.55");
 el(root,"h3","Ventilation comptable · L'Océan, société entière","font-size:15px;margin:0 0 6px");
 el(root,"p","Exercice : 01/10/2024 – 30/09/2025 · Sources : comptes annuels signés, pages 15–18. Classification indicative, aucun seuil publié.","color:#687b83;margin:0 0 12px");
 el(root,"p","Charges d'exploitation rapprochées : "+fmt.format(2991280.1399999997)+" / "+fmt.format(2991280.14),"font-weight:700");
 el(root,"p","À valider : personnel permanent et renforts saisonniers, parts fixes des charges mixtes, rapprochement RH, affectation des autres comptes et cohérence des périodes.","padding:10px;border-left:3px solid #be4949;color:#a23b3b;background:#fff5f2");
 for(const [id,label,amount,groupType,rows] of data){
  const details=el(root,"details",null,"padding:10px 0;border-top:1px solid #e5eaec");
  const sum=el(details,"summary",null,"cursor:pointer;display:flex;justify-content:space-between;gap:10px;font-weight:600");
  el(sum,"span",label);el(sum,"span",fmt.format(amount),"white-space:nowrap");
  const table=el(details,"table",null,"width:100%;border-collapse:collapse;font-size:11px");
  let included=0;
  for(const [num,name,value,kind] of rows){
   included+=value;
   const tr=el(table,"tr",null);
   el(tr,"td",num+" · "+name,"padding:6px 4px;border-bottom:1px solid #f2f3f4");
   el(tr,"td",fmt.format(value),"padding:6px 4px;white-space:nowrap;text-align:right");
   el(tr,"td",names[kind||groupType],"padding:6px 4px;color:#a33e3e");
  }
  const rest=Math.round((amount-included)*100)/100;
  if(Math.abs(rest)>.01){
   const tr=el(table,"tr",null);
   el(tr,"td","Autres comptes non encore ventilés","padding:8px 4px;font-weight:600");
   el(tr,"td",fmt.format(rest),"padding:8px 4px;text-align:right;white-space:nowrap");
   el(tr,"td","À vérifier","padding:8px 4px;color:#b23f3f");
  }
 }
 el(root,"p","Note : charges financières (5 213,15 €), impôt et éléments exceptionnels exclus du total d'exploitation. Les lignes détaillées ci-dessus sont une sélection, le solde reste identifié et non classé.","color:#6b7981;margin-top:12px");
}
window.PrismCharges2025={render};
})();