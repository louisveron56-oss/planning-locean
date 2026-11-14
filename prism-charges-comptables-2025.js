/* PRISM : lecture seule des charges FY2025. Classification analytique provisoire. */
(function(){"use strict";
const data=[["607","Achats nets",764566.6,"variable",[["6070010","Boissons",304768.08,"variable"],["6070020","Alimentation",498819.21,"variable"],["6097000","Remises fournisseurs",-39020.69,"variable"]]],["6037","Variation stocks",24850.73,"variable",[["6037000","Variation stocks",24850.73,"variable"]]],["60-62","Achats et charges externes",449239.76,"mixte",[["6061100","Electricite",26556.21,"mixte"],["6061200","Eau",11228.24,"mixte"],["6061300","Gaz",7884.9,"mixte"],["6061400","Carburant",1527.12,"mixte"],["6063000","Petit equipement",15559.3,"mixte"],["6063010","Verrerie et vaisselle",5541,"mixte"],["6063020","Entretien et hygiene",13746.09,"mixte"],["6063100","Fournitures intracom",453.11,"mixte"],["6064000","Fournitures administratives",6683.11,"mixte"],["6068400","Fournitures consommables brasserie",13282.51,"variable"],["6080000","Frais accessoires achats",4056.16,"variable"],["6110000","Sous traitance generale",149,"mixte"],["6111000","Agendrix",2462.48,"fixe"],["6112000","Blanchissage",3929.94,"mixte"],["6121000","Credit-bail vehicule utilitaire",1876.11,"fixe"],["6122000","Credit-bail vehicule particulier",3027.7,"fixe"],["6131000","Location gerance",33000,"fixe"],["6132000","Locations immobilieres",57279.96,"fixe"],["6132010","Location murs Le Douarin",8232.24,"fixe"],["6132020","Location murs SCI Laredo",11932.61,"fixe"],["6132030","Location SCI Ocean",34800,"fixe"],["6132040","Stockage",7380,"fixe"],["6135000","Locations mobilieres",1705.4,"fixe"],["6135020","Location informatique",1881.96,"fixe"],["6135043","Location vehicule 208",3575.64,"fixe"],["6135070","Location Visioflux",39.3,"fixe"],["6135080","Location DAE",1068,"fixe"],["6135090","Location Epack",1224,"fixe"],["6135100","Location appartement",3850,"fixe"],["6135110","Telesurveillance",360,"fixe"],["6135120","Location logement",2260,"fixe"],["6135210","Location Volkswagen",4587.36,"fixe"],["6135300","Location TPE",2689.97,"fixe"],["6135800","Epack hygiene",1444.66,"fixe"],["6140000","Charges locatives et copropriete",2655.35,"mixte"],["6142100","Contributions foncieres bailleurs",3178.86,"fixe"],["6152000","Entretien immobilier",930.26,"mixte"],["6155000","Entretien mobilier",6599.33,"mixte"],["6155200","Entretien vehicules",1891.46,"mixte"],["6156000","Maintenance",2593.66,"fixe"],["6160000","Primes assurances",68.68,"fixe"],["6161000","Multirisques",10347.9,"fixe"],["6161200","Assurances prets",4058.46,"fixe"],["6163000","Assurance transport",4316.98,"fixe"],["6168000","Responsabilite civile",504.24,"fixe"],["6185000","Seminaires",1150,"discretionnaire"],["6211000","Interim",1007.28,"mixte"],["6226100","Honoraires comptables",20800,"fixe"],["6226400","Honoraires divers",2411,"discretionnaire"],["6226600","Honoraires juridiques",1460,"discretionnaire"],["6226700","Honoraires sociaux",19412.25,"mixte"],["6227000","Actes et contentieux",527.74,"discretionnaire"],["6228100","Animations",568.46,"discretionnaire"],["6231100","Publicite internet",881.29,"fixe"],["6234000","Cadeaux clients salaries",5197.06,"discretionnaire"],["6234100","Offerts clients",10138.48,"variable"],["6235000","Publicites diverses",3155.92,"discretionnaire"],["6238000","Divers dons pourboires",3020,"discretionnaire"],["6239000","Decoration",481.23,"discretionnaire"],["6251000","Voyages deplacements",4519.97,"discretionnaire"],["6257000","Receptions",19426.21,"discretionnaire"],["6260000","Poste",324.99,"mixte"],["6262000","Telephone internet",4434.15,"fixe"],["6262030","Canalsat",2852.66,"fixe"],["6270000","Frais bancaires",2936.13,"mixte"],["6278000","Commissions prestations",11719.56,"mixte"],["6281000","Cotisations diverses",339.12,"fixe"],["6281100","Cotisations professionnelles",57,"fixe"]]],["63","Impots taxes",69852.09,"mixte",[["6333000","Formation professionnelle",11810.25,"mixte"],["6335000","Taxe apprentissage",7437.23,"mixte"],["6351100","CET",2332.75,"fixe"],["6351120","CVAE",1715,"variable"],["6351400","Taxe vehicules",1103,"fixe"],["6375000","CSG deductible",9737,"mixte"],["6378000","Taxes diverses",32191.86,"mixte"],["6378100","AGEFIPH",3525,"mixte"]]],["64","Salaires",1193519.95,"mixte",[["6411000","Salaires et appointements",1021317.27,"mixte"],["6411500","Salaire gerante",93092.74,"fixe"],["6412000","Conges payes",974.53,"mixte"],["6413000","Primes gratifications",35522.82,"mixte"],["6413500","Indemnites stagiaires",400,"variable"],["6414000","Avantages indemnites",36732.25,"mixte"],["6414300","Rupture conventionnelle",2301.69,"exceptionnel"],["6481000","Vetements de travail",3178.65,"mixte"]]],["645-647","Charges sociales",355747.09,"mixte",[["6451000","URSSAF",238049.88,"mixte"],["6452000","Mutuelles",12216.03,"mixte"],["6453200","Retraite salaries",45147.3,"mixte"],["6458000","Autres organismes sociaux",1029.18,"mixte"],["6459000","Provision sociale conges",127.93,"mixte"],["6460000","Cotisations exploitant",35844,"fixe"],["6465000","Cotisations PER",118.08,"fixe"],["6465100","Prevoyance Generali",8732.46,"fixe"],["6465200","Sante Generali",1561.8,"fixe"],["6465300","Retraite Generali",9487.12,"fixe"],["6475000","Medecine du travail",3433.31,"mixte"]]],["681","Amortissements",99762.69,"fixe",[["6811200","Dotations immobilisations",99762.69,"fixe"]]],["65","Autres charges",33741.23,"mixte",[["6512000","SACEM",1010.56,"mixte"],["6516000","Droits auteur",613.34,"fixe"],["6580000","Penalites et autres charges",32117.33,"a_verifier"]]]];
const fmt=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"});
const el=(p,tag,value,css)=>{const x=document.createElement(tag);if(value!==null)x.textContent=value;if(css)x.style.cssText=css;p.appendChild(x);return x;};
const names={fixe:"Fixe (provisoire)",variable:"Variable (provisoire)",mixte:"Mixte — à ventiler",a_verifier:"À vérifier",discretionnaire:"Pilotable · non proportionnel au CA",exceptionnel:"Non récurrent · à isoler"};
function render(host){
 const root=el(host,"section",null,"margin-top:16px;padding:15px;background:#fff;border:1px solid #e4e9ec;border-radius:10px;color:#264553;font-size:12px;line-height:1.55");
 el(root,"h3","Ventilation comptable · L'Océan, société entière","font-size:15px;margin:0 0 6px");
 el(root,"p","Exercice : 01/10/2024 – 30/09/2025 · Sources : comptes annuels signés, pages 15–18. Classification indicative, aucun seuil publié.","color:#687b83;margin:0 0 12px");
 el(root,"p","Charges d'exploitation rapprochées : "+fmt.format(2991280.1399999997)+" / "+fmt.format(2991280.14),"font-weight:700");
 el(root,"p","Classification complète par compte, à confirmer économiquement : personnel permanent et renforts saisonniers, parts fixes des charges mixtes, nature du compte 658 et cohérence des périodes. Aucune valeur fixe/variable inventée.","padding:10px;border-left:3px solid #be4949;color:#a23b3b;background:#fff5f2");
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
 const audit=el(root,"details",null,"margin-top:18px;padding:12px;border:1px solid #e6d8c7;border-radius:8px;background:#fffaf5");
 el(audit,"summary","Rapprochement RH 2025 — écart MySilae / comptabilité","cursor:pointer;font-weight:700;font-size:13px");
 el(audit,"p","Période identique : 01/10/2024 au 30/09/2025. Sources : onglet RH_Mensuel (MySilae) et comptes annuels signés, pages 16–17. Diagnostic figé, non synchronisé automatiquement.","font-size:11px;color:#637881");
 const rowsRH=[
 ["Salaires et traitements comptabilisés",1193519.95],
 ["Brut MySilae cumulé",1093708.52],
 ["Écart salaires",99811.43],
 ["Dont compte 6411500 — rémunération gérante",93092.74],
 ["Solde salaires à rapprocher",6718.69],
 ["Charges sociales comptabilisées",355747.09],
 ["Charges patronales MySilae cumulées",315047],
 ["Écart charges sociales",40700.09],
 ["Dont compte 6460000 — cotisations exploitant",35844],
 ["Solde charges à rapprocher",4856.09],
 ["Écart résiduel total",11574.78]
 ];
 const t=el(audit,"table",null,"width:100%;border-collapse:collapse;font-size:11px");
 rowsRH.forEach(([label,value])=>{const tr=el(t,"tr",null);
 el(tr,"td",label,"padding:7px 4px;border-bottom:1px solid #ece4da");
 el(tr,"td",fmt.format(value),"text-align:right;white-space:nowrap;padding:7px 4px;border-bottom:1px solid #ece4da;font-variant-numeric:tabular-nums");
 });
 el(audit,"p","Attention : les montants de gérance et de cotisations personnelles expliquent potentiellement l'écart de périmètre, mais leur absence du cumul MySilae n'est pas encore prouvée ligne à ligne. Il reste 11 574,78 € à rapprocher, ainsi que les écritures de primes, avantages et régularisations. Aucun ajustement automatique du ratio RH.","color:#ae4740;font-weight:600;margin-top:10px");
 el(root,"p","Note : charges financières (5 213,15 €), impôt et éléments exceptionnels exclus du total d'exploitation. Les lignes détaillées ci-dessus sont une sélection, le solde reste identifié et non classé.","color:#6b7981;margin-top:12px");
}
window.PrismCharges2025={render};
})();