/* Prism — Catalogue produits unifié, phase 1.
   Consultation uniquement : aucun import, écrasement de tarif ou rapprochement automatique.
   La correspondance source utilise exclusivement fournisseur + référence fournisseur.
*/
(function(){
'use strict';
const PAGE='module-suppliers', PAGE_SIZE=60;
const fmt=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const make=(parent,tag,cls,label)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(label!==undefined)x.textContent=String(label);parent.appendChild(x);return x;};
const money=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(Number(x))?fmt.format(Number(x)):'—';
const iso=x=>{const v=String(x||'').trim();return /^\d{4}-\d\d-\d\d/.test(v)?v.slice(0,10):'';};
const showDate=x=>{let d=iso(x);return d?new Date(d+'T12:00:00').toLocaleDateString('fr-FR'):'Non renseignée';};
const number=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(String(x).replace(/[\s\u00a0\u202f€]/g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?n:null;};
function unitLabel(value){
 const n=norm(value).replace(/[.\s]/g,'');
 if(['kg','kilogramme','kilogrammes','€/kg'].includes(n))return 'kg';
 if(['g','gramme','grammes'].includes(n))return 'g';
 if(['l','litre','litres','€/l'].includes(n))return 'L';
 if(['cl'].includes(n))return 'cl';
 if(['ml'].includes(n))return 'ml';
 if(['piece','pieces','unite','unites','u','pc','pcs','€/piece'].includes(n))return 'pièce';
 return '';
}
function normalizedPrice(price,unit){
 const value=number(price),u=unitLabel(unit);
 if(value===null)return {text:'Prix indisponible',normal:null,unit:'',valid:false};
 if(u==='g')return {text:money(value*1000)+'/kg',normal:value*1000,unit:'kg',valid:true};
 if(u==='cl')return {text:money(value*100)+'/L',normal:value*100,unit:'L',valid:true};
 if(u==='ml')return {text:money(value*1000)+'/L',normal:value*1000,unit:'L',valid:true};
 if(!u)return {text:money(value)+' HT · unité à vérifier',normal:null,unit:'',valid:false};
 return {text:money(value)+'/'+u,normal:value,unit:u,valid:true};
}
/* Affichage uniquement : nom lisible + clé de tri. Le nom d'origine reste dans p.name (info-bulle). */
const SMALL_WORDS={de:1,du:1,des:1,et:1,la:1,le:1,les:1,en:1,au:1,aux:1,a:1,sur:1};
function cleanName(raw){
 const t=String(raw||'').trim();
 let x=t.replace(/^\d{8,}\s*/,'').replace(/^\d{1,3}\s*[_\[\]“”"'‘’=…\-—.+]+\s*/,'').replace(/^[_\[\]“”"'‘’=…\-—.+]+\s*/,'');
 x=x.replace(/(\s+\d+[.,]\d{2}\s*€?)+\s*$/,'').trim();
 while(/^[\d.,]+\s+\S/.test(x)&&/[A-Za-zÀ-ÿ]{3}\S*\s+\S/.test(x.replace(/^[\d.,]+\s+/,'')))x=x.replace(/^[\d.,]+\s+/,'');
 const letters=x.replace(/[^A-Za-zÀ-ÿ]/g,''),upper=letters.replace(/[^A-ZÀ-Þ]/g,'');
 if(letters.length>=3&&upper.length/letters.length>0.7){x=x.toLowerCase().replace(/(^|\s)([a-zà-ÿ])/,(_,a,b)=>a+b.toUpperCase()).replace(/(\d)l\b/g,'$1L');}
 return x||t||'Sans nom';
}
function prettySupplier(raw){
 const t=String(raw||'').trim();const letters=t.replace(/[^A-Za-zÀ-ÿ]/g,'');
 if(letters.length<3||letters.replace(/[^A-ZÀ-Þ]/g,'').length/letters.length<=0.7)return t;
 return t.toLowerCase().split(/(\s+|-)/).map((w,i)=>(i&&SMALL_WORDS[w])?w:w.charAt(0).toUpperCase()+w.slice(1)).join('');
}
function supplierKey(supplier,ref){return norm(supplier)+'|'+norm(ref);}
function joinSources(catalog,sheets){
 const items=[],matched=new Set(),sheetsByRef=new Map(),catalogRefCounts=new Map(),sheetsByName=new Map(),catalogNameCounts=new Map();
 (catalog||[]).filter(p=>!p.archivedAt).forEach(p=>{if(norm(p.supplier)&&norm(p.supplierReference)){const k=supplierKey(p.supplier,p.supplierReference);catalogRefCounts.set(k,(catalogRefCounts.get(k)||0)+1);}else if(norm(p.supplier)&&norm(p.name)){const k=supplierKey(p.supplier,p.name);catalogNameCounts.set(k,(catalogNameCounts.get(k)||0)+1);}});
 sheets.forEach((x,i)=>{
  const key=supplierKey(x.fournisseur,x.code);
  if(norm(x.fournisseur)&&norm(x.designation)){const nameKey=supplierKey(x.fournisseur,x.designation);const found=sheetsByName.get(nameKey)||[];found.push(i);sheetsByName.set(nameKey,found);}
  if(norm(x.fournisseur)&&norm(x.code)){
   const list=sheetsByRef.get(key)||[];list.push(i);sheetsByRef.set(key,list);
  }
 });
 (catalog||[]).filter(p=>!p.archivedAt).forEach((p,i)=>{
  let match=null,sourceCount=0;
  const key=supplierKey(p.supplier,p.supplierReference);
  if(norm(p.supplier)&&norm(p.supplierReference)){
   const candidates=sheetsByRef.get(key)||[];
   if(catalogRefCounts.get(key)===1&&candidates.length===1&&!matched.has(candidates[0])){match=sheets[candidates[0]];matched.add(candidates[0]);sourceCount=1;}
  }else if(norm(p.supplier)&&norm(p.name)){
   const exact=supplierKey(p.supplier,p.name),candidates=sheetsByName.get(exact)||[];
   if(catalogNameCounts.get(exact)===1&&candidates.length===1&&!matched.has(candidates[0])){match=sheets[candidates[0]];matched.add(candidates[0]);sourceCount=1;}
  }
  const price=normalizedPrice(p.price,p.unit);
  items.push({
   id:'catalog:'+String(p.id||i),catalog:p,sheet:match,
   name:p.name||match?.designation||'Sans nom',supplier:p.supplier||match?.fournisseur||'Non renseigné',
   supplierReference:p.supplierReference||match?.code||'',category:p.subcategory||p.category||match?.famille||'À classer',
   price,source:p.source||'Catalogue Prism',date:iso(p.sourceLastPurchaseDate||p.updatedAt||p.createdAt||match?.date_dernier_achat),
   added:iso(p.createdAt||match?.date_dernier_achat),confirmed:!!sourceCount,
   warning:!!(match&&number(match.prix_actuel_ht)!==null&&number(p.price)!==null&&Math.abs(Number(p.price)-number(match.prix_actuel_ht))>0.000001)
  });
 });
 sheets.forEach((p,i)=>{
  if(matched.has(i))return;
  const price=normalizedPrice(p.prix_actuel_ht,p.unite||p.unite_prix||'');
  items.push({
   id:'sheet:'+i,catalog:null,sheet:p,name:p.designation||'Sans nom',
   supplier:p.fournisseur||'Non renseigné',supplierReference:p.code||'',category:p.famille||'À classer',
   price,source:'Google Sheets · Pennylane',date:iso(p.date_dernier_achat),added:'',
   confirmed:false,warning:false
  });
 });
 return items;
}
let groupFilter='Tous',sortDir='asc',chipsHost=null,rows=[],loading=false,loadedOnce=false,partialSources=false,initialized=false,search='',supplierFilter='',sort='name',pageIndex=0,detailId='',pendingSupplier='',listHost=null,stateHost=null;
const fetchJson=async(url,token)=>{
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 const json=await r.json();if(!r.ok)throw Error(json.error||'Données indisponibles');
 return json;
};
function hideLegacy(hidden){
 const page=document.getElementById(PAGE);if(!page)return;
 const legacy=page.querySelector('.purchases-root'),sheet=page.querySelector('.ps-products');
 if(legacy){
  if(legacy.hidden!==hidden)legacy.hidden=hidden;
  if(legacy.style.getPropertyValue('display')!==(hidden?'none':'block'))legacy.style.setProperty('display',hidden?'none':'block','important');
 }
 if(sheet){
  if(sheet.hidden!==hidden)sheet.hidden=hidden;
  if(sheet.style.getPropertyValue('display')!==(hidden?'none':'block'))sheet.style.setProperty('display',hidden?'none':'block','important');
 }
 // A late-mounted old view must also be suppressed once the unified data has loaded.
}
function backToSupplier(supplier){
 const nav=document.querySelector('.app-nav-item[data-page="supplier-directory"]');
 if(nav)nav.click();else if(typeof window.navigateApp==='function')window.navigateApp('supplier-directory');
 window.dispatchEvent(new CustomEvent('prism-show-supplier',{detail:{supplier}}));
}

const historyApi='/.netlify/functions/purchase-history';
let historyIndex=null,historyIndexError='',historyIndexLoading=null,detailRequest=0;
function compactKey(x){return norm(x).replace(/\s+/g,' ');}
function historyKey(supplier,ref){return compactKey(supplier)+'|'+compactKey(ref);}
async function historicalIndex(){
 if(historyIndex)return historyIndex;
 if(historyIndexLoading)return historyIndexLoading;
 historyIndexLoading=(async()=>{
  const user=window.netlifyIdentity?.currentUser?.();
  if(!user)throw Error('Connexion nécessaire');
  const token=await user.jwt();
  const res=await fetch(historyApi,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  const data=await res.json();
  if(!res.ok)throw Error(data.error||'Historique indisponible');
  historyIndex=data.ready?(data.products||[]):[];
  historyIndexError='';
  return historyIndex;
 })();
 try{return await historyIndexLoading;}catch(e){historyIndexError=e.message;throw e;}finally{historyIndexLoading=null;}
}
function matchingHistory(item,products){
 const supplier=compactKey(item.supplier),reference=compactKey(item.supplierReference);
 if(!supplier||supplier==='non renseigné')return null;
 if(reference){
  const exact=products.filter(p=>historyKey(p.supplier,p.reference)===historyKey(item.supplier,item.supplierReference));
  return exact.length===1?exact[0]:null;
 }
 // For missing reference only: one exact supplier+description candidate is safe enough to suggest, but not assert linkage.
 const matches=products.filter(p=>compactKey(p.supplier)===supplier&&compactKey(p.description)===compactKey(item.name));
 return matches.length===1?matches[0]:null;
}
function statusLine(container,message,warning){
 const line=make(container,'p',warning?'pcu-warning':'pcu-muted',message);
 if(warning)line.setAttribute('role','status');
 return line;
}

async function confirmUnit(item,closeParent){
 const amount=number(item.catalog?.price??item.sheet?.prix_actuel_ht);
 if(amount===null){alert('Prix absent : vérifier la facture avant de confirmer une unité.');return;}
 const layer=document.createElement('div');layer.className='pcu-info-layer';
 const panel=make(layer,'section','pcu-info-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 make(panel,'h3','','Confirmer une unité');
 make(panel,'p','pcu-muted',item.name+' · '+money(amount)+' HT');
 statusLine(panel,'Le prix actuel est conservé sans conversion. Vérifie sur la facture qu’il correspond exactement à une unité choisie.',true);
 const select=make(panel,'select','pcu-select');[['','Choisir une unité'],['kg','1 kg'],['L','1 litre'],['pièce','1 pièce']].forEach(([v,t])=>{const o=make(select,'option','',t);o.value=v;});
 const label=make(panel,'label','pcu-unit-confirm'),check=make(label,'input');check.type='checkbox';
 make(label,'span','','Je confirme que ce prix HT correspond bien à l’unité sélectionnée.');
 const status=make(panel,'p','pcu-warning',''),actions=make(panel,'div','pcu-unit-actions');
 const cancel=make(actions,'button','pcu-back','Annuler');cancel.onclick=()=>layer.remove();
 const save=make(actions,'button','pcu-primary','Enregistrer');save.onclick=async()=>{
  if(!select.value||!check.checked){status.textContent='Vérifie l’unité et coche la confirmation.';return;}
  save.disabled=true;
  const payload=item.catalog?{establishment:'LOCEAN',action:'confirm-unit',productId:item.catalog.id,unit:select.value,confirmUnit:true}:
  {establishment:'LOCEAN',action:'create-from-source',confirmUnit:true,product:{name:item.name,supplier:item.supplier,supplierReference:item.supplierReference,category:groupOf(item),price:amount,unit:select.value,date:item.date}};
  try{
   const user=window.netlifyIdentity?.currentUser?.();if(!user)throw Error('Connexion requise');
   const res=await fetch('/.netlify/functions/purchases',{method:'PATCH',headers:{Authorization:'Bearer '+await user.jwt(),'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
   const d=await res.json();if(!res.ok||!d.ok)throw Error(d.error||'Enregistrement impossible');
   layer.remove();if(closeParent)closeParent();detailId='';historyIndex=null;load();window.dispatchEvent(new Event('prism-catalog-updated'));
  }catch(e){status.textContent=e.message;save.disabled=false;}
 };
 document.body.appendChild(layer);select.focus();
}
function infoModal(item){
 const layer=document.createElement('div');layer.className='pcu-info-layer';
 const modal=make(layer,'section','pcu-info-panel');
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Informations produit');
 const close=make(modal,'button','pcu-info-close','Fermer ×');close.type='button';close.onclick=()=>layer.remove();
 make(modal,'h3','','Informations produit');
 const fields=make(modal,'dl','pcu-details');
 const attr=(label,value)=>{make(fields,'dt','',label);make(fields,'dd','',value||'Non renseigné');};
 attr('Désignation',item.name);
 attr('Fournisseur',item.supplier);
 attr('Référence fournisseur',item.supplierReference);
 attr('Famille / catégorie',item.category);
 attr('Prix catalogue HT',item.price.text);
 attr('Dernier prix renseigné',showDate(item.date));
 attr('Date d’ajout au catalogue',showDate(item.added));
 attr('Source principale',item.source);
 attr('Rapprochement des sources',item.confirmed?'Référence rapprochée':'Non rapprochée automatiquement');
 if(item.catalog){
  const p=item.catalog,pack=p.packaging;
  attr('Conditionnement',pack&&pack.quantity?pack.quantity+' '+(pack.unit||p.unit||'')+' · '+money(pack.purchasePrice):p.unit||'Non renseigné');
  attr('Origine du prix',p.sourcePrice||p.source);
  attr('Fiabilité du prix',p.priceStatus==='indicatif_a_rapprocher_facture'?'Indicatif : facture à rapprocher':'À confirmer selon les sources');
 }
 if(item.sheet){
  attr('Prix Sheets',money(item.sheet.prix_actuel_ht));
  attr('Prix initial Sheets',money(item.sheet.prix_debut_ht));
  attr('Dernier achat Sheets',showDate(item.sheet.date_dernier_achat));
 }
 if(item.warning)statusLine(modal,'Écart de tarif entre les sources : contrôle nécessaire.',true);
 const editUnit=make(modal,'button','pcu-primary',item.price.valid?'Corriger l’unité':'Renseigner l’unité');editUnit.type='button';editUnit.onclick=()=>confirmUnit(item,()=>layer.remove());
 layer.addEventListener('click',e=>{if(e.target===layer)layer.remove()});
 const key=e=>{if(e.key==='Escape'){layer.remove();document.removeEventListener('keydown',key)}};
 document.addEventListener('keydown',key);
 document.body.appendChild(layer);
 close.focus();
}
function purchasesChart(host,lines){
 host.replaceChildren();
 const comparable=lines.filter(r=>Number.isFinite(Number(r.priceHT))&&Number(r.priceHT)>0&&/^\d{4}-\d\d-\d\d$/.test(r.date)&&unitLabel(r.unit));
 const groups=new Map();
 comparable.forEach(r=>{const u=unitLabel(r.unit);if(!groups.has(u))groups.set(u,[]);groups.get(u).push(r)});
 const eligible=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length);
 const pair=eligible[0],series=pair?.[1]?.slice().sort((a,b)=>a.date.localeCompare(b.date))||[];
 if(series.length<2){statusLine(host,'Graphique indisponible : moins de deux achats datés dans une unité comparable.',true);return;}
 if(eligible.length>1||lines.length>series.length)statusLine(host,'Courbe limitée aux achats comparables ('+pair[0]+'). Les autres observations restent dans le tableau.',true);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 const ns=svg.namespaceURI;svg.setAttribute('viewBox','0 0 760 255');svg.setAttribute('role','img');svg.setAttribute('aria-label','Prix d’achat HT constatés dans le temps, en '+pair[0]);
 const nums=series.map(x=>Number(x.priceHT)),dates=series.map(x=>Date.parse(x.date+'T12:00:00Z'));
 let min=Math.min(...nums),max=Math.max(...nums);const margin=Math.max((max-min)*.16,Math.abs(max)*.05,.01);
 min=Math.max(0,min-margin);max+=margin;
 const first=Math.min(...dates),last=Math.max(...dates);
 const X=i=>52+(last===first?(i/(series.length-1))*665:((dates[i]-first)/(last-first))*665);
 const Y=v=>205-(v-min)/(max-min)*160;
 const shape=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;svg.appendChild(e);return e};
 for(let i=0;i<4;i++){
  const y=45+i*53.3;
  shape('line',{x1:52,y1:y,x2:720,y2:y,stroke:'currentColor','stroke-opacity':'.13'});
  shape('text',{x:46,y:y+4,'text-anchor':'end',fill:'currentColor','font-size':11},(max-(max-min)*i/3).toFixed(2));
 }
 const solid=series.every(r=>r.verified);
 if(solid)shape('polyline',{points:series.map((r,i)=>X(i)+','+Y(Number(r.priceHT))).join(' '),fill:'none',stroke:'currentColor','stroke-width':2,'stroke-linejoin':'round','stroke-opacity':'.5'});
 series.forEach((r,i)=>{
  const c=shape('circle',{cx:X(i),cy:Y(Number(r.priceHT)),r:r.verified?4:5,fill:r.verified?'currentColor':'none',stroke:'currentColor','stroke-width':r.verified?0:2});
  const title=document.createElementNS(ns,'title');title.textContent=showDate(r.date)+' · '+money(r.priceHT)+'/'+pair[0];c.appendChild(title);
 });
 shape('text',{x:52,y:242,fill:'currentColor','font-size':12},showDate(series[0].date));
 shape('text',{x:720,y:242,'text-anchor':'end',fill:'currentColor','font-size':12},showDate(series[series.length-1].date));
 svg.classList.add('pcu-chart');host.appendChild(svg);
 const certified=series.filter(r=>r.verified);
 if(certified.length>=2){const delta=(Number(certified[certified.length-1].priceHT)/Number(certified[0].priceHT)-1)*100;
  statusLine(host,certified.length+' achats fiables · variation '+(delta>=0?'+':'')+delta.toFixed(1).replace('.',',')+' % ('+pair[0]+')',false);
 }else statusLine(host,'Points cerclés : achats à vérifier. Variation non calculée faute de données suffisamment fiables.',true);
}
async function purchasesFor(item,slot){
 const stamp=++detailRequest;
 try{
  const index=await historicalIndex();
  if(stamp!==detailRequest||detailId!==item.id)return;
  const match=matchingHistory(item,index);
  if(!match){statusLine(slot,'Aucun historique relié avec certitude à cette référence. Les achats importés restent consultables dans Historique achats.',true);return;}
  const user=window.netlifyIdentity?.currentUser?.(),token=await user.jwt();
  const res=await fetch(historyApi+'?mode=product&key='+encodeURIComponent(match.key),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Historique non disponible');
  if(stamp!==detailRequest||detailId!==item.id)return;
  const lines=Array.isArray(data.rows)?data.rows:[];
  if(!lines.length){statusLine(slot,'Aucun achat disponible pour ce produit.',true);return;}
  const graph=make(slot,'div','pcu-graph');purchasesChart(graph,lines);
  make(slot,'h4','pcu-section-heading','Derniers achats');
  const wrap=make(slot,'div','pcu-scroll'),table=make(wrap,'table','pcu-table pcu-purchases');
  const thead=make(make(table,'thead'),'tr');
  ['Date','Prix HT','Quantité','Facture','Contrôle'].forEach(t=>make(thead,'th','',t));
  const body=make(table,'tbody');
  lines.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).forEach(r=>{
   const tr=make(body,'tr');
   make(tr,'td','',showDate(r.date));make(tr,'td','',r.priceHT==null?'—':money(r.priceHT)+' / '+(unitLabel(r.unit)||'unité ?'));
   make(tr,'td','',r.quantity??'—');make(tr,'td','',r.invoice||'—');
   make(tr,'td',r.verified?'':'pcu-issue',r.verified?'OK':'À vérifier');
  });
 }catch(e){if(stamp===detailRequest&&detailId===item.id)statusLine(slot,'Historique indisponible : '+e.message,true);}
}
function detail(item){
 const content=make(listHost,'section','pcu-detail');
 const head=make(content,'div','pcu-detail-head');
 const back=make(head,'button','pcu-back','← Produits');back.type='button';back.onclick=()=>{detailId='';detailRequest++;drawList();};
 const info=make(head,'button','pcu-info-button','i');info.type='button';info.title='Informations complètes';info.setAttribute('aria-label','Informations complètes sur le produit');info.onclick=()=>infoModal(item);
 make(content,'h3','pcu-product-name',item.name);
 make(content,'p','pcu-product-supplier',item.supplier);
 if(!item.price.valid){const edit=make(content,'button','pcu-unit-shortcut','Renseigner l’unité de prix');edit.type='button';edit.onclick=()=>confirmUnit(item);}
 const metrics=make(content,'div','pcu-metrics');
 const price=make(metrics,'div','pcu-metric');make(price,'small','','Dernier prix catalogue HT');make(price,'strong','',item.price.text);
 const when=make(metrics,'div','pcu-metric');make(when,'small','','Dernier prix renseigné');make(when,'strong','',showDate(item.date));
 make(content,'h4','pcu-section-heading','Historique des prix d’achat');
 const slot=make(content,'section','pcu-purchases-host');
 statusLine(slot,'Chargement de l’historique…',false);
 purchasesFor(item,slot);
}
function visibleRows(){
 const q=norm(search),filter=norm(supplierFilter);
 const list=rows.filter(p=>(!filter||norm(p.supplier)===filter)&&(groupFilter==='Tous'||(groupFilter==='À vérifier'?needsCheck(p):p.group===groupFilter))&&(!q||norm([p.name,p.display,p.supplier,p.supplierReference,p.category,p.group].join(' ')).includes(q)));
 const dir=sortDir==='desc'?-1:1,byName=(a,b)=>a.display.localeCompare(b.display,'fr',{sensitivity:'base'});
 return list.sort((a,b)=>{
  if(sort==='supplier')return dir*(a.supplierDisplay.localeCompare(b.supplierDisplay,'fr',{sensitivity:'base'})||byName(a,b));
  if(sort==='price'){const x=priceValue(a),y=priceValue(b);if(x===null&&y===null)return byName(a,b);if(x===null)return 1;if(y===null)return -1;return dir*(x-y)||byName(a,b);}
  return dir*byName(a,b)||a.supplier.localeCompare(b.supplier,'fr');
 });
}
function needsCheck(p){return !p.price.valid||p.warning;}
function priceValue(p){const v=p.price.valid?p.price.normal:number(p.catalog?.price??p.sheet?.prix_actuel_ht);return v===undefined?null:v;}
const GROUPS=['Bar','Cuisine','Hygiène'];
const GROUP_WORDS={
 Bar:/boisson|vin|biere|cidre|spiritueux|alcool|soft|eaux?\b|cafe|thes?\b|sirop|champagne|effervescent|liqueur|aperitif|bar\b/,
 Hygiene:/hygien|entretien|nettoy|droguerie|consommable|emballage|savon|lessive|detergent/,
 Cuisine:/viande|volaille|poisson|fruits? de mer|maree|fruit|legume|cremerie|fromage|epicerie|surgel|pain|boulang|alimenta|boucherie|charcut|oeuf|cuisine|frais\b/
};
function groupOf(p){
 const c=p.catalog?.category;if(GROUPS.includes(c))return c;
 const f=norm(p.catalog?.subcategory||p.sheet?.famille||'');
 if(!f)return 'À classer';
 if(GROUP_WORDS.Hygiene.test(f))return 'Hygiène';
 if(GROUP_WORDS.Bar.test(f))return 'Bar';
 if(GROUP_WORDS.Cuisine.test(f))return 'Cuisine';
 return 'À classer';
}
function drawPrice(cell,p){
 if(needsCheck(p)){const pill=make(cell,'span','pcu-check-pill','à vérifier');pill.title=p.warning?'Écart de prix entre les sources':'Unité ou prix à contrôler';}
 const raw=priceValue(p);
 if(raw===null){make(cell,'span','pcu-price-missing','à brancher');return;}
 make(cell,'span','pcu-price-amount',money(raw));
 if(p.price.valid)make(cell,'span','pcu-price-unit','/'+p.price.unit);
}
function sortHeader(tr,label,key,cls){
 const th=make(tr,'th',cls||'');
 if(!key){th.textContent=label;return;}
 const b=make(th,'button','pcu-sort',label+(sort===key?(sortDir==='asc'?' ↑':' ↓'):''));b.type='button';
 th.setAttribute('aria-sort',sort===key?(sortDir==='asc'?'ascending':'descending'):'none');
 b.onclick=()=>{if(sort===key)sortDir=sortDir==='asc'?'desc':'asc';else{sort=key;sortDir='asc';}pageIndex=0;drawList();};
}
function drawList(){
 if(!listHost)return;listHost.replaceChildren();
 const selected=rows.find(p=>p.id===detailId);
 if(selected){if(chipsHost)chipsHost.hidden=true;detail(selected);return;}
 if(chipsHost)chipsHost.hidden=false;
 detailRequest++;
 drawChips();
 const filtered=visibleRows(),fr=new Intl.NumberFormat('fr-FR');
 if(!filtered.length){make(listHost,'p','pcu-empty','Aucun produit pour ces filtres.');return;}
 const card=make(listHost,'div','pcu-card'),wrap=make(card,'div','pcu-scroll'),table=make(wrap,'table','pcu-table');
 const tr=make(make(table,'thead'),'tr');
 sortHeader(tr,'Produit','name');sortHeader(tr,'Catégorie','');sortHeader(tr,'Fournisseur','supplier');sortHeader(tr,'Prix HT','price','pcu-th-price');
 const body=make(table,'tbody');
 filtered.slice(pageIndex*PAGE_SIZE,(pageIndex+1)*PAGE_SIZE).forEach(p=>{
  const row=make(body,'tr');row.className='pcu-product-row';
  const name=make(row,'td','pcu-name-cell');
  const link=make(name,'button','pcu-product-link',p.display);link.type='button';link.title=p.name;link.dataset.prismPretty=p.display;
  link.onclick=()=>{detailId=p.id;drawList();};
  const sub=p.category&&p.category!=='À classer'&&p.category!==p.group?p.category:'';
  const meta=[sub,p.supplierReference?'réf. '+p.supplierReference:''].filter(Boolean).join(' · ');
  if(meta)make(name,'span','pcu-product-meta',meta);
  const cat=make(row,'td','pcu-cat-cell');make(cat,'span','pcu-cat pcu-cat-'+norm(p.group).replace(/[^a-z]/g,''),p.group);
  const sc=make(row,'td','pcu-supplier-cell',p.supplierDisplay||'—');sc.dataset.prismPretty=sc.textContent;sc.title=p.supplier||'';
  const priceCell=make(row,'td','pcu-price');priceCell.dataset.prismPretty='1';drawPrice(priceCell,p);
  row.tabIndex=0;row.setAttribute('aria-label','Ouvrir '+p.display);
  row.addEventListener('click',e=>{if(e.target.closest('button'))return;detailId=p.id;drawList();});
  row.addEventListener('keydown',e=>{if(e.key==='Enter'){detailId=p.id;drawList();}});
 });
 const foot=make(card,'div','pcu-foot');
 make(foot,'span','pcu-foot-note',fr.format(filtered.length)+' produit'+(filtered.length>1?'s':'')+' · clique sur une ligne pour voir l’historique');
 if(filtered.length>PAGE_SIZE){
  const bar=make(foot,'div','pcu-pages');
  const previous=make(bar,'button','pcu-link','←');previous.type='button';previous.setAttribute('aria-label','Page précédente');previous.disabled=pageIndex===0;previous.onclick=()=>{pageIndex--;drawList();listHost.scrollIntoView({block:'start',behavior:'smooth'});};
  make(bar,'span','',(pageIndex+1)+' / '+Math.ceil(filtered.length/PAGE_SIZE));
  const next=make(bar,'button','pcu-link','→');next.type='button';next.setAttribute('aria-label','Page suivante');next.disabled=(pageIndex+1)*PAGE_SIZE>=filtered.length;next.onclick=()=>{pageIndex++;drawList();listHost.scrollIntoView({block:'start',behavior:'smooth'});};
 }
}
function drawChips(){
 if(!chipsHost)return;chipsHost.replaceChildren();
 const q=norm(search),filter=norm(supplierFilter);
 const base=rows.filter(p=>(!filter||norm(p.supplier)===filter)&&(!q||norm([p.name,p.display,p.supplier,p.supplierReference,p.category,p.group].join(' ')).includes(q)));
 const fr=new Intl.NumberFormat('fr-FR');
 const chips=[['Tous',base.length],...GROUPS.map(g=>[g,base.filter(p=>p.group===g).length])];
 const other=base.filter(p=>p.group==='À classer').length;if(other)chips.push(['À classer',other]);
 chips.push(['À vérifier',base.filter(needsCheck).length]);
 chips.forEach(([label,count])=>{
  if(!count&&label!=='Tous'&&groupFilter!==label)return;
  const b=make(chipsHost,'button','pcu-chip'+(label==='À vérifier'?' pcu-chip-check':''));b.type='button';
  make(b,'span','',label);make(b,'span','pcu-chip-count',fr.format(count));
  b.setAttribute('aria-pressed',String(groupFilter===label));
  b.onclick=()=>{groupFilter=label;pageIndex=0;detailId='';drawList();};
 });
}
function render(){
 const root=document.getElementById('prismUnifiedCatalog');if(!root)return;
 root.replaceChildren();
 const header=make(root,'div','pcu-header');
 make(header,'h3','','Produits');
 const importBtn=make(header,'button','pcu-primary','Importer des factures');importBtn.type='button';
 importBtn.onclick=()=>{const b=document.querySelector('.app-nav-item[data-page="purchase-invoices"]');if(b)b.click();else if(typeof window.navigateApp==='function')window.navigateApp('purchase-invoices');};
 const tools=make(root,'div','pcu-tools');
 const q=make(tools,'input','pcu-search');q.type='search';q.placeholder='Rechercher un produit, un fournisseur…';q.value=search;q.setAttribute('aria-label','Rechercher un produit ou un fournisseur');
 q.oninput=()=>{search=q.value;pageIndex=0;detailId='';drawList();};
 chipsHost=make(tools,'div','pcu-chips');
 if(supplierFilter){const clear=make(root,'button','pcu-filter-tag','Fournisseur : '+prettySupplier(supplierFilter)+'  ×');clear.type='button';clear.title='Retirer le filtre fournisseur';clear.onclick=()=>{supplierFilter='';pageIndex=0;render();};}
 listHost=make(root,'div','pcu-list');drawList();
}
async function load(){
 if(loading)return;loading=true;
 const root=document.getElementById('prismUnifiedCatalog');if(root)root.textContent='Regroupement des produits en cours…';
 try{
  const u=window.netlifyIdentity?.currentUser?.();if(!u)throw Error('Connecte-toi à Prism pour consulter les produits.');
  const token=await u.jwt();
  const results=await Promise.allSettled([
   fetchJson('/.netlify/functions/purchases',token),
   fetchJson('/.netlify/functions/purchase-sheets?type=products',token)
  ]);
  const catalog=results[0].status==='fulfilled'?results[0].value:null;
  const sheets=results[1].status==='fulfilled'?results[1].value:null;
  if(!catalog&&!sheets)throw Error('Catalogue indisponible : '+[results[0],results[1]].map(x=>x.status==='rejected'?x.reason.message:'').filter(Boolean).join(' ; '));
  rows=joinSources(catalog?.products||[],sheets?.rows||[]).map(p=>Object.assign(p,{display:cleanName(p.name),supplierDisplay:prettySupplier(p.supplier),group:groupOf(p)}));
  loadedOnce=true;
  partialSources=!(catalog&&sheets);
  hideLegacy(true);
  render();
  if((!catalog||!sheets)&&root)make(root,'p','pcu-alert','Une source est indisponible : la liste est partielle. Aucun produit ni prix n’a été modifié.');
 }catch(err){
  hideLegacy(true);
  if(root){root.replaceChildren();make(root,'p','pcu-alert','Catalogue indisponible : '+err.message);const retry=make(root,'button','pcu-link','Réessayer');retry.type='button';retry.onclick=()=>load();}
 }finally{loading=false;}
}
function init(){
 const page=document.getElementById(PAGE);if(!page||initialized)return;initialized=true;
 const shell=page.querySelector('.module-shell');if(!shell)return;
 const root=document.createElement('section');root.id='prismUnifiedCatalog';root.className='pcu-root';root.textContent='Chargement des produits…';
 hideLegacy(true);
 const legacy=shell.querySelector('.purchases-root');
 if(legacy)legacy.insertAdjacentElement('beforebegin',root);
 else shell.appendChild(root);
 const observer=new MutationObserver(()=>{
  hideLegacy(true);
  if(page.classList.contains('open')&&!loadedOnce&&!loading)load();
 });
 observer.observe(page,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('prism-find-product',ev=>{
  search=String(ev.detail?.query||'');supplierFilter='';groupFilter='Tous';pageIndex=0;detailId='';
  if(loadedOnce)render();
 });
 window.addEventListener('prism-supplier-products',ev=>{
  pendingSupplier=String(ev.detail?.supplier||'');supplierFilter=pendingSupplier;detailId='';pageIndex=0;
  if(loadedOnce)render();
 });
 window.addEventListener('prism-catalog-updated',()=>{if(page.classList.contains('open'))load();});
 if(page.classList.contains('open'))load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
