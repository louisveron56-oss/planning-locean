(function(){
"use strict";
const id="prismRecipeSimulator",key="prism_recipe_drafts_v1",euro=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"});
const factor={g:.001,kg:1,ml:.001,cl:.01,L:1,piece:1},base={g:"kg",kg:"kg",ml:"L",cl:"L",L:"L",piece:"piece"};
let catalog=[],lines=[],drafts=[],name="",price=17,vat=10,msg="",savedId=null,search="";
const make=(p,t,txt)=>{let a=document.createElement(t);if(txt!==undefined)a.textContent=txt;p.append(a);return a};
const button=(p,t,fn)=>{let a=make(p,"button",t);a.type="button";a.className="rc-btn";a.onclick=fn;return a};
const num=x=>Number(String(x).replace(",",".")),valid=n=>Number.isFinite(n)&&n>=0;
const basis=x=>{let u=String(x||"").trim().toLowerCase();return /^(kg|kilo|kilogramme)$/.test(u)?"kg":/^(l|litre)$/.test(u)?"L":/^(pièce|piece|pcs|unité|unite)$/.test(u)?"piece":""};
function input(p,title,value,cb,type="text"){let l=make(p,"label");make(l,"span",title);let a=make(l,"input");a.type=type;a.value=value;if(type==="number"){a.step="any";a.min="0"}a.oninput=()=>cb(a.value);return a}
function pick(p,title,value,values,cb){let l=make(p,"label");make(l,"span",title);let a=make(l,"select");values.forEach(([v,t])=>{let o=make(a,"option",t);o.value=v});a.value=value;a.onchange=()=>cb(a.value);return a}
function calc(x){let qty=num(x.qty),cost=num(x.cost);return valid(qty)&&qty>0&&valid(cost)&&base[x.unit]===x.basis?qty*factor[x.unit]*cost:NaN}
function total(){return lines.reduce((v,l)=>v+calc(l),0)}
function store(){try{localStorage.setItem(key,JSON.stringify(drafts))}catch(e){msg="Sauvegarde locale indisponible"}}
function newDraft(){lines=[];name="";price=17;vat=10;savedId=null;msg="Nouveau brouillon";render()}
function saveDraft(){if(!name.trim()||!lines.length||!lines.every(x=>Number.isFinite(calc(x)))||!valid(num(price))||num(price)<=0){msg="Nom, prix HT et ingrédients valides obligatoires.";render();return}let row={id:savedId||Date.now(),name,price,vat,lines:JSON.parse(JSON.stringify(lines))};drafts=drafts.filter(x=>x.id!==row.id);drafts.unshift(row);savedId=row.id;store();msg="Recette enregistrée sur cet appareil";render()}
function add(x){lines.push({name:x.name,cost:x.price,basis:x.basis,qty:x.basis==="kg"?100:x.basis==="L"?10:1,unit:x.basis==="kg"?"g":x.basis==="L"?"cl":"piece",source:x.source});msg=x.basis?"":"Confirme l’unité de prix du produit avant de calculer.";render()}
function drawSummary(){
 let p=document.getElementById("rc-summary");if(!p)return;p.replaceChildren();make(p,"h3","Simulation en direct");
 let cost=total(),selling=num(price),ok=lines.length>0&&Number.isFinite(cost)&&valid(selling)&&selling>0;
 const stat=(a,b)=>{let r=make(p,"div");r.className="rc-stat";make(r,"span",a);make(r,"strong",b)};
 stat("Coût matière HT",ok?euro.format(cost):"—");stat("Prix de vente HT",valid(selling)?euro.format(selling):"—");
 stat("Marge brute matière HT",ok?euro.format(selling-cost):"—");stat("Food cost",ok?(cost/selling*100).toFixed(1)+" %":"—");
 stat("Marge brute / CA HT",ok?((selling-cost)/selling*100).toFixed(1)+" %":"—");
 stat("Prix TTC indicatif",valid(selling)?euro.format(selling*(1+num(vat)/100)):"—");
 make(p,"p","Tester le prix de vente HT avec le curseur");
 let slider=make(p,"input");slider.type="range";slider.min=1;slider.max=Math.max(50,Math.ceil((selling||17)*2));slider.step=.1;slider.value=valid(selling)?selling:17;
 slider.oninput=()=>{price=slider.value;let inp=document.getElementById("rc-sell");if(inp)inp.value=price;drawSummary()};
 if(!ok){let w=make(p,"p","Confirme les unités et les montants des ingrédients pour obtenir une marge.");w.className="rc-warn"}
}
function render(){
 let root=document.getElementById(id);if(!root)return;root.replaceChildren();
 let top=make(root,"div");top.className="rc-header";make(top,"h2","Simulateur de recette");button(top,"+ Nouvelle recette",newDraft);
 let note=make(root,"p",msg||"Simulation basée sur les prix HT des achats. Les conditionnements ambigus nécessitent une confirmation.");note.className="rc-note";
 let layout=make(root,"div");layout.className="rc-layout";let main=make(layout,"div");let detail=make(main,"section");detail.className="rc-panel";
 make(detail,"h3","1. Recette et prix de vente");
 input(detail,"Nom de la recette",name,x=>name=x);
 let selling=input(detail,"Prix de vente HT (€)",price,x=>{price=x;drawSummary()},"number");selling.id="rc-sell";
 pick(detail,"TVA indicative",String(vat),[["5.5","5,5 %"],["10","10 %"],["20","20 %"]],x=>{vat=x;drawSummary()});
 let ingest=make(main,"section");ingest.className="rc-panel";make(ingest,"h3","2. Ajouter les ingrédients");
 input(ingest,"Chercher dans les produits existants",search,x=>{search=x;renderCatalog()});
 let results=make(ingest,"div");results.id="rc-results";renderCatalog();
 let custom=make(ingest,"details");let summary=make(custom,"summary","+ Ingrédient non référencé");let customBox=make(custom,"div");let c={name:"",price:"",basis:"kg"};
 input(customBox,"Nom de l’ingrédient","",x=>c.name=x);
 input(customBox,"Coût d’achat HT par unité (€)","",x=>c.price=x,"number");
 pick(customBox,"Unité du prix","kg",[["kg","€/kg"],["L","€/L"],["piece","€/pièce"]],x=>c.basis=x);
 button(customBox,"Ajouter l’ingrédient",()=>{if(!c.name.trim()||!valid(num(c.price))){msg="Renseigne le produit et son coût HT.";render();return}add({name:c.name.trim(),price:num(c.price),basis:c.basis,source:"manuel"})});
 make(ingest,"h3","3. Composition de la recette");
 if(!lines.length)make(ingest,"p","Aucun ingrédient sélectionné.");
 lines.forEach((x,i)=>{
  let card=make(ingest,"div");card.className="rc-line";let head=make(card,"div");head.className="rc-header";make(head,"strong",x.name);button(head,"Retirer",()=>{lines.splice(i,1);render()});
  input(card,"Quantité utilisée",x.qty,v=>{x.qty=v;updateCosts()},"number");
  pick(card,"Unité utilisée",x.unit,[["g","g"],["kg","kg"],["ml","ml"],["cl","cl"],["L","L"],["piece","pièce"]],v=>{x.unit=v;updateCosts()});
  input(card,"Prix d’achat HT / unité",x.cost,v=>{x.cost=v;updateCosts()},"number");
  pick(card,"Prix exprimé en",x.basis,[["","À confirmer"],["kg","€/kg"],["L","€/L"],["piece","€/pièce"]],v=>{x.basis=v;updateCosts()});
  let amount=make(card,"div");amount.id="rc-line-"+i;amount.className="rc-cost";amount.textContent=Number.isFinite(calc(x))?euro.format(calc(x)):"Unité à corriger";
 });
 button(main,savedId?"Mettre à jour le brouillon":"Enregistrer le brouillon",saveDraft);
 let existing=make(main,"section");existing.className="rc-panel";make(existing,"h3","Brouillons de cet appareil");
 drafts.forEach(x=>{let row=make(existing,"div");row.className="rc-header";make(row,"span",x.name);button(row,"Ouvrir",()=>{savedId=x.id;name=x.name;price=x.price;vat=x.vat;lines=JSON.parse(JSON.stringify(x.lines));render()});button(row,"Supprimer",()=>{if(confirm("Supprimer ce brouillon ?")){drafts=drafts.filter(z=>z.id!==x.id);store();if(savedId===x.id)newDraft();else render()}})});
 let side=make(layout,"aside");side.id="rc-summary";side.className="rc-panel rc-side";drawSummary();
 let foot=make(root,"p","Brouillons enregistrés uniquement sur ce navigateur. Les ajouts manuels ne modifient pas la mercuriale centrale. La marge matière exclut main-d’œuvre, énergie et charges fixes.");foot.className="rc-note";
}
function updateCosts(){lines.forEach((x,i)=>{let a=document.getElementById("rc-line-"+i);if(a)a.textContent=Number.isFinite(calc(x))?euro.format(calc(x)):"Vérifier les unités"});drawSummary()}
function renderCatalog(){let host=document.getElementById("rc-results");if(!host)return;host.replaceChildren();
 let list=catalog.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())).slice(0,30);
 if(!list.length){make(host,"p",catalog.length?"Aucun résultat.":"Catalogue non chargé ou accès non autorisé.");return}
 let row=make(host,"div");row.className="rc-header";let sel=make(row,"select");list.forEach(p=>{let o=make(sel,"option",p.name+" · "+eur(p.price)+" / "+(p.basis||p.unit||"à vérifier"));o.value=String(p.id)});
 button(row,"Ajouter",()=>{let p=list.find(p=>String(p.id)===sel.value);if(p)add(p)});
}
function eur(v){return euro.format(Number(v))}
async function loadCatalog(){
 try{let u=window.netlifyIdentity&&window.netlifyIdentity.currentUser();if(!u)throw Error("Connexion requise");
 let res=await fetch("/.netlify/functions/purchases",{headers:{Authorization:"Bearer "+await u.jwt()},cache:"no-store"});
 let d=await res.json();if(!res.ok)throw Error(d.error||"Catalogue indisponible");
 catalog=(d.products||[]).filter(p=>p.name&&!p.archivedAt&&Number.isFinite(Number(p.price))).map(p=>({id:p.id,name:p.name,price:Number(p.price),unit:p.unit,basis:basis(p.unit),source:"catalogue"}));
 msg=catalog.length?catalog.length+" produits disponibles depuis les achats.":"Catalogue achats vide.";
 }catch(e){msg="Catalogue achats : "+e.message}
 render();
}
function init(){
 let page=document.getElementById("module-menu");if(!page)return;let shell=page.querySelector(".module-shell");if(!shell)return;
 let placeholder=shell.querySelector(".module-placeholder");if(placeholder)placeholder.style.display="none";
 let section=make(shell,"section");section.id=id;
 let style=make(document.head,"style");style.textContent=".rc-header{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}.rc-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:15px}.rc-panel{background:#fff;border:1px solid #e2e7e7;border-radius:12px;padding:16px;margin-bottom:14px}.rc-panel h3{font-size:14px}.rc-panel label{display:inline-flex;flex-direction:column;gap:5px;min-width:140px;margin:8px;font-size:11px}.rc-panel input,.rc-panel select{max-width:100%;border:1px solid #dce2e3;padding:9px;border-radius:7px;background:white;color:#203e4b}.rc-line{border-top:1px solid #e4e8e8;padding:12px 0}.rc-cost{font-weight:700}.rc-btn{border:1px solid #dae0e0;background:#fff;color:#24566b;border-radius:7px;padding:9px;cursor:pointer;margin:5px;font-size:11px}.rc-side{position:sticky;top:15px;background:#fbfcfb}.rc-stat{display:flex;justify-content:space-between;border-bottom:1px solid #e9eeee;padding:11px 0;gap:6px;font-size:11px}.rc-stat strong{font-size:15px;text-align:right}.rc-note{font-size:11px;color:#708089}.rc-warn{color:#986123;font-size:11px}@media(max-width:800px){.rc-layout{grid-template-columns:1fr}.rc-side{position:static}}";
 try{let data=JSON.parse(localStorage.getItem(key)||"[]");drafts=Array.isArray(data)?data:[]}catch(_){}
 render();loadCatalog();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();