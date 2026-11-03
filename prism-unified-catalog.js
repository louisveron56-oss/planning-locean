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
function supplierKey(supplier,ref){return norm(supplier)+'|'+norm(ref);}
function joinSources(catalog,sheets){
 const items=[],matched=new Set(),sheetsByRef=new Map(),catalogRefCounts=new Map();
 (catalog||[]).filter(p=>!p.archivedAt).forEach(p=>{if(norm(p.supplier)&&norm(p.supplierReference)){const k=supplierKey(p.supplier,p.supplierReference);catalogRefCounts.set(k,(catalogRefCounts.get(k)||0)+1);}});
 sheets.forEach((x,i)=>{
  const key=supplierKey(x.fournisseur,x.code);
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
let rows=[],loading=false,loadedOnce=false,partialSources=false,initialized=false,search='',supplierFilter='',sort='name',pageIndex=0,detailId='',pendingSupplier='',listHost=null,stateHost=null;
const fetchJson=async(url,token)=>{
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 const json=await r.json();if(!r.ok)throw Error(json.error||'Données indisponibles');
 return json;
};
function hideLegacy(hidden){
 const page=document.getElementById(PAGE);if(!page)return;
 const legacy=page.querySelector('.purchases-root'),sheet=page.querySelector('.ps-products');
 if(legacy){legacy.hidden=hidden;legacy.style.setProperty('display',hidden?'none':'block','important');}
 if(sheet){sheet.hidden=hidden;sheet.style.setProperty('display',hidden?'none':'block','important');}
 // A late-mounted old view must also be suppressed once the unified data has loaded.
}
function backToSupplier(supplier){
 const nav=document.querySelector('.app-nav-item[data-page="supplier-directory"]');
 if(nav)nav.click();else if(typeof window.navigateApp==='function')window.navigateApp('supplier-directory');
 window.dispatchEvent(new CustomEvent('prism-show-supplier',{detail:{supplier}}));
}
function detail(item){
 const content=make(listHost,'div','pcu-detail');
 const h=make(content,'div','pcu-detail-head');
 const back=make(h,'button','pcu-back','← Tous les produits');back.type='button';back.onclick=()=>{detailId='';drawList();};
 make(content,'h3','',item.name);
 const fields=make(content,'dl','pcu-details');
 const attr=(label,value)=>{make(fields,'dt','',label);make(fields,'dd','',value||'Non renseigné');};
 attr('Fournisseur',item.supplier);attr('Référence fournisseur',item.supplierReference);
 attr('Catégorie',item.category);attr('Prix HT',item.price.text);
 attr('Date du dernier prix',showDate(item.date));
 attr('Date d’ajout au catalogue',showDate(item.added));
 attr('Source principale',item.source);
 attr('Correspondance des sources',item.confirmed?'Catalogue Prism + Sheets liés par fournisseur et référence':'Référence non rapprochée automatiquement');
 if(item.catalog){
  const p=item.catalog,pack=p.packaging;
  attr('Conditionnement',pack&&pack.quantity?pack.quantity+' '+(pack.unit||p.unit||'')+' · '+money(pack.purchasePrice):p.unit||'Non renseigné');
  attr('Origine du prix',p.sourcePrice||p.source||'Non renseignée');
  attr('Statut du prix',p.priceStatus==='indicatif_a_rapprocher_facture'?'Indicatif · facture à rapprocher':'Non signalé comme indicatif');
  const history=Array.isArray(p.priceHistory)?p.priceHistory.filter(h=>!h.invalidatedAt):[];
  if(history.length){
   const wrapper=make(content,'div','pcu-history');
   make(wrapper,'h4','','Historique des prix');
   history.slice(-8).reverse().forEach(h=>make(wrapper,'p','',showDate(h.at)+' · '+money(h.price)+' / '+(h.unit||p.unit||'unité non renseignée')));
  }
 }
 if(item.sheet){
  const p=item.sheet;
  attr('Prix Sheets',money(p.prix_actuel_ht)+' · '+(p.unite||'unité non vérifiée'));
  attr('Prix initial Sheets',money(p.prix_debut_ht));
  attr('Date du dernier achat Sheets',showDate(p.date_dernier_achat));
  if(item.warning)make(content,'p','pcu-alert','Écart de tarif entre les sources : aucun prix n’a été écrasé.');
 }
 const actions=make(content,'div','pcu-actions');
 if(item.supplier&&item.supplier!=='Non renseigné'){
  const go=make(actions,'button','pcu-link','Ouvrir la fiche fournisseur');go.type='button';go.onclick=()=>backToSupplier(item.supplier);
  const only=make(actions,'button','pcu-link','Voir ses produits');only.type='button';only.onclick=()=>{supplierFilter=item.supplier;detailId='';pageIndex=0;render();};
 }
 if(item.catalog){
  const action=make(actions,'button','pcu-link','Modifier la fiche produit');action.type='button';
  action.onclick=()=>{
   const page=document.getElementById(PAGE),legacy=page?.querySelector('.purchases-root');
   if(legacy){window.dispatchEvent(new CustomEvent('prism-catalog-edit-request',{detail:{productId:item.catalog.id}}));}
  };
 }
}
function visibleRows(){
 const q=norm(search),filter=norm(supplierFilter);
 return rows.filter(p=>(!filter||norm(p.supplier)===filter)&&(!q||norm([p.name,p.supplier,p.supplierReference,p.category].join(' ')).includes(q)))
 .sort((a,b)=>{
  if(sort==='supplier')return a.supplier.localeCompare(b.supplier,'fr')||a.name.localeCompare(b.name,'fr');
  if(sort==='newest')return String(b.added||'').localeCompare(String(a.added||''))||a.name.localeCompare(b.name,'fr');
  return a.name.localeCompare(b.name,'fr')||a.supplier.localeCompare(b.supplier,'fr');
 });
}
function drawList(){
 if(!listHost)return;listHost.replaceChildren();
 const selected=rows.find(p=>p.id===detailId);
 if(selected){detail(selected);return;}
 const filtered=visibleRows(),count=make(listHost,'p','pcu-count',filtered.length+' référence(s) affichable(s) · '+rows.length+' sources consolidées en lecture');
 if(!filtered.length){make(listHost,'p','pcu-empty','Aucun produit pour ces filtres.');return;}
 const wrap=make(listHost,'div','pcu-scroll'),table=make(wrap,'table','pcu-table');
 const tr=make(make(table,'thead'),'tr');
 ['Produit','Fournisseur','Prix HT'].forEach(x=>make(tr,'th','',x));
 const body=make(table,'tbody');
 filtered.slice(pageIndex*PAGE_SIZE,(pageIndex+1)*PAGE_SIZE).forEach(p=>{
  const row=make(body,'tr');
  const name=make(row,'td'),link=make(name,'button','pcu-link',p.name);
  link.type='button';link.onclick=()=>{detailId=p.id;drawList();};
  const sup=make(row,'td');
  if(p.supplier&&p.supplier!=='Non renseigné'){
   const b=make(sup,'button','pcu-link',p.supplier);b.type='button';b.onclick=()=>{supplierFilter=p.supplier;pageIndex=0;render();};
  }else sup.textContent='—';
  const price=make(row,'td','pcu-price',p.price.text);
  price.title='Origine : '+p.source+(p.price.valid?'':' · Unité à confirmer');
 });
 if(filtered.length>PAGE_SIZE){
  const bar=make(listHost,'div','pcu-pages');
  const previous=make(bar,'button','pcu-link','← Précédent');previous.disabled=pageIndex===0;previous.onclick=()=>{pageIndex--;drawList();};
  make(bar,'span','',(pageIndex+1)+' / '+Math.ceil(filtered.length/PAGE_SIZE));
  const next=make(bar,'button','pcu-link','Suivant →');next.disabled=(pageIndex+1)*PAGE_SIZE>=filtered.length;next.onclick=()=>{pageIndex++;drawList();};
 }
 make(listHost,'p','pcu-note','Les prix sont en HT. Si l’unité est inconnue, elle reste à confirmer. Deux produits ne sont rapprochés automatiquement que si le fournisseur et sa référence correspondent exactement.');
}
function render(){
 const root=document.getElementById('prismUnifiedCatalog');if(!root)return;
 root.replaceChildren();
 const header=make(root,'div','pcu-header');
 make(header,'h3','','Tous les produits');
 make(header,'p','','Catalogue Prism et références fournisseurs · consultation centralisée');
 const tools=make(root,'div','pcu-tools');
 const q=make(tools,'input','pcu-search');q.type='search';q.placeholder='Rechercher un produit, une référence…';q.value=search;
 q.oninput=()=>{search=q.value;pageIndex=0;detailId='';drawList();};
 const sup=make(tools,'select','pcu-select');
 let option=make(sup,'option','','Tous les fournisseurs');option.value='';
 [...new Set(rows.map(x=>x.supplier).filter(x=>x&&x!=='Non renseigné'))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(x=>{let o=make(sup,'option','',x);o.value=x;});
 sup.value=supplierFilter;if(sup.selectedIndex<0){sup.value='';supplierFilter='';}
 sup.onchange=()=>{supplierFilter=sup.value;pageIndex=0;detailId='';render();};
 const ordering=make(tools,'select','pcu-select');
 [['name','Nom A → Z'],['supplier','Fournisseur'],['newest','Ajout récent (si connu)']].forEach(([value,label])=>{const o=make(ordering,'option','',label);o.value=value;});
 ordering.value=sort;ordering.onchange=()=>{sort=ordering.value;pageIndex=0;detailId='';drawList();};
 const refresh=make(tools,'button','pcu-link','Actualiser');refresh.type='button';refresh.disabled=loading;refresh.onclick=()=>load();
 if(supplierFilter){const clear=make(root,'button','pcu-link','× Effacer le filtre fournisseur : '+supplierFilter);clear.onclick=()=>{supplierFilter='';pageIndex=0;render();};}
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
  rows=joinSources(catalog?.products||[],sheets?.rows||[]);
  loadedOnce=true;
  partialSources=!(catalog&&sheets);
  hideLegacy(!partialSources);
  render();
  if((!catalog||!sheets)&&root)make(root,'p','pcu-alert','Une source est indisponible : la liste est partielle. Aucun produit ni prix n’a été modifié.');
 }catch(err){
  hideLegacy(false);
  if(root){root.replaceChildren();make(root,'p','pcu-alert','Vue unifiée indisponible : '+err.message+' · Le catalogue historique reste accessible ci-dessous.');}
 }finally{loading=false;}
}
function init(){
 const page=document.getElementById(PAGE);if(!page||initialized)return;initialized=true;
 const shell=page.querySelector('.module-shell');if(!shell)return;
 const root=document.createElement('section');root.id='prismUnifiedCatalog';root.className='pcu-root';
 const legacy=shell.querySelector('.purchases-root');
 if(legacy)legacy.insertAdjacentElement('beforebegin',root);
 else shell.appendChild(root);
 const observer=new MutationObserver(()=>{
  if(loadedOnce)hideLegacy(!partialSources);
  if(page.classList.contains('open')&&!loadedOnce&&!loading)load();
 });
 observer.observe(page,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('prism-supplier-products',ev=>{
  pendingSupplier=String(ev.detail?.supplier||'');supplierFilter=pendingSupplier;detailId='';pageIndex=0;
  if(loadedOnce)render();
 });
 window.addEventListener('prism-catalog-updated',()=>{if(page.classList.contains('open'))load();});
 if(page.classList.contains('open'))load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
