/* Lecture seule de l'historique Pennylane chargé dans LOCEAN_DATA_API.
   Aucun PDF inventé, aucun stock, tarif ni produit modifié automatiquement. */
(function(){
'use strict';
const cache={};
const formatEuro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const n=v=>{let s=String(v??'').replace(/[\u00a0\u202f\s]/g,'').replace('€','').replace('%','').replace(',','.');let x=Number(s);return Number.isFinite(x)?x:0;};
const e=(tag,cls,txt)=>{let x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;};
const add=(parent,tag,cls,txt)=>{let x=e(tag,cls,txt);parent.appendChild(x);return x;};
function money(value){return formatEuro.format(n(value));}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
async function read(type,force){
 if(!force&&cache[type])return cache[type];
 const u=window.netlifyIdentity?.currentUser();if(!u)throw Error('Connecte-toi à Prism pour consulter les données.');
 const res=await fetch('/.netlify/functions/purchase-sheets?type='+encodeURIComponent(type),{headers:{Authorization:'Bearer '+await u.jwt()},cache:'no-store'});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Google Sheets inaccessible');
 cache[type]=data.rows;return data.rows;
}
function table(root,head,rows){
 const wrap=add(root,'div','ps-scroll'),t=add(wrap,'table','ps-table'),tr=add(add(t,'thead'),'tr');
 head.forEach(h=>add(tr,'th','',h));
 const body=add(t,'tbody');
 rows.forEach(cols=>{let tr=add(body,'tr');cols.forEach(v=>add(tr,'td','',String(v??'')));});
}
function note(root,txt){add(root,'p','ps-note',txt);}
function button(root,title,fn){let b=add(root,'button','ps-button',title);b.type='button';b.onclick=fn;return b;}
let supplierFocus='';
function supplierKey(v){return norm(v);}
async function supplierProfiles(method,payload){
 const u=window.netlifyIdentity?.currentUser();if(!u)throw Error('Connexion requise');
 const res=await fetch('/.netlify/functions/supplier-profiles',{method,headers:{Authorization:'Bearer '+await u.jwt(),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
 const obj=await res.json();if(!res.ok)throw Error(obj.error||'Erreur fournisseur');return obj;
}
function navigateToPurchases(supplier){
 supplierFocus=supplier;
 const button=document.querySelector('.app-nav-item[data-page="purchase-invoices"]');
 if(button)button.click();
 else if(typeof window.navigateApp==='function')window.navigateApp('purchase-invoices');
 window.dispatchEvent(new CustomEvent('prism-supplier-invoices',{detail:{supplier}}));
}
function navigateToProducts(supplier){
 const button=document.querySelector('.app-nav-item[data-page="suppliers"]');
 if(button)button.click();
 else if(typeof window.navigateApp==='function')window.navigateApp('suppliers');
 window.dispatchEvent(new CustomEvent('prism-supplier-products',{detail:{supplier}}));
}
async function mountSuppliers(){
 const page=document.getElementById('module-supplier-directory'),shell=page?.querySelector('.module-shell');
 if(!shell||shell.querySelector('.ps-root'))return;
 shell.querySelector('.module-placeholder')?.remove();
 const root=add(shell,'section','ps-root');
 const toolbar=add(root,'div','ps-toolbar'),reload=button(toolbar,'Actualiser depuis Google Sheets',()=>load(true));
 const query=add(toolbar,'input','ps-search');query.type='search';query.placeholder='Rechercher un fournisseur';
 const content=add(root,'div','ps-content');
 let rows=[],profiles={},selected=null,selectedIncoming='';
 function nameOf(row){const override=profiles[supplierKey(row.fournisseur)];return override?.displayName||row.fournisseur;}
 function list(){
  selected=null;content.replaceChildren();
  const filtered=rows.filter(x=>norm(nameOf(x)+' '+x.fournisseur).includes(norm(query.value)));
  const title=add(content,'div','ps-summary');
  add(title,'div','','Fournisseurs : '+filtered.length);
  add(title,'div','','Clique sur un fournisseur pour ouvrir sa fiche');
  const wrap=add(content,'div','ps-scroll'),table=add(wrap,'table','ps-table'),th=add(add(table,'thead'),'tr');
  ['Fournisseur','Factures','2024 HT','2025 HT','2026 HT','Dernière facture'].forEach(x=>add(th,'th','',x));
  const tb=add(table,'tbody');
  filtered.forEach(row=>{
   const tr=add(tb,'tr'),td=add(tr,'td');
   const link=add(td,'button','ps-text-link',nameOf(row));link.type='button';link.onclick=()=>detail(row);
   [row.nb_factures,money(row.achats_ht_2024),money(row.achats_ht_2025),money(row.achats_ht_2026),row.derniere_facture||'—'].forEach(v=>add(tr,'td','',String(v??'')));
  });
  note(content,'Les montants proviennent de l’export Pennylane ; les éventuelles corrections du nom affiché sont conservées dans Prism, sans modifier Google Sheets.');
 }
 function detail(row){
  selected=row;content.replaceChildren();
  const head=add(content,'div','ps-toolbar');
  button(head,'← Tous les fournisseurs',list);
  add(content,'h3','',nameOf(row));
  const summary=add(content,'div','ps-summary');
  add(summary,'div','','Factures · '+(row.nb_factures||'—'));
  add(summary,'div','','2026 HT · '+money(row.achats_ht_2026));
  add(summary,'div','','Dernière facture · '+(row.derniere_facture||'—'));
  const actions=add(content,'div','ps-toolbar');
  button(actions,'Voir les factures du fournisseur',()=>navigateToPurchases(row.fournisseur));
  button(actions,'Voir ses produits et prix',()=>navigateToProducts(row.fournisseur));
  const form=add(content,'div','ps-profile-editor');
  const label=add(form,'label','');add(label,'span','','Nom affiché dans Prism');
  const input=add(label,'input','ps-search');input.value=nameOf(row);
  const noteLabel=add(form,'label','');add(noteLabel,'span','','Notes internes');
  const notes=add(noteLabel,'textarea','ps-search');notes.rows=3;notes.value=profiles[supplierKey(row.fournisseur)]?.note||'';
  const status=add(form,'small','ps-note','Nom d’origine : '+row.fournisseur+' · La référence d’origine reste inchangée.');
  const save=button(form,'Enregistrer la fiche',async()=>{
   save.disabled=true;status.textContent='Enregistrement…';
   try{
    const result=await supplierProfiles('PATCH',{establishment:'LOCEAN',supplier:row.fournisseur,displayName:input.value,note:notes.value});
    profiles[supplierKey(row.fournisseur)]=result.profile;status.textContent='Fiche enregistrée dans Prism.';content.querySelector('h3').textContent=nameOf(row);
   }catch(err){status.textContent=err.message;}finally{save.disabled=false;}
  });
 }
 query.oninput=list;
 window.addEventListener('prism-show-supplier',event=>{
  selectedIncoming=event.detail?.supplier||'';
  if(rows.length){const row=rows.find(x=>supplierKey(x.fournisseur)===supplierKey(selectedIncoming));if(row)detail(row);selectedIncoming='';}
 });
 async function load(force){
  reload.disabled=true;content.textContent='Chargement des fournisseurs…';
  try{
   const results=await Promise.all([read('suppliers',force),supplierProfiles('GET')]);
   rows=results[0];profiles=results[1].profiles||{};list();
   if(selectedIncoming){const row=rows.find(x=>supplierKey(x.fournisseur)===supplierKey(selectedIncoming));if(row)detail(row);selectedIncoming='';}
  }catch(err){content.textContent=err.message;}finally{reload.disabled=false;}
 }
 await load(false);
}
async function mountPurchases(){
 const page=document.getElementById('module-purchase-invoices'),shell=page?.querySelector('.module-shell');
 if(!shell||shell.querySelector('.ps-invoices'))return;
 const root=e('section','ps-root ps-invoices');
 const docUi=shell.querySelector('.pd-root');
 if(docUi)shell.insertBefore(root,docUi);else shell.appendChild(root);
 add(root,'h3','','Historique des achats · Google Sheets');
 const toolbar=add(root,'div','ps-toolbar');
 const supplierSelect=add(toolbar,'select','ps-search ps-select');
 const search=add(toolbar,'input','ps-search');search.placeholder='N° de facture, catégorie, fournisseur…';search.type='search';
 const month=add(toolbar,'input','ps-search');month.type='month';
 const refresh=button(toolbar,'Actualiser les factures',()=>load(true));
 const content=add(root,'div');
 note(root,'Les lignes proviennent de l’onglet Achats et ne contiennent pas nécessairement le PDF original. Les archives de documents scannés restent dans la section ci-dessous.');
 let rows=[];
 function populateSuppliers(){
  const old=supplierFocus||supplierSelect.value;
  supplierSelect.replaceChildren();
  const empty=add(supplierSelect,'option','','Tous les fournisseurs');empty.value='';
  [...new Set(rows.map(x=>String(x.fournisseur||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(name=>{const op=add(supplierSelect,'option','',name);op.value=name;});
  supplierSelect.value=old||'';
  if(supplierSelect.selectedIndex<0)supplierSelect.value='';
  supplierFocus='';draw();
 }
 function draw(){
  content.replaceChildren();
  const filtered=rows.filter(x=>
   (!supplierSelect.value||supplierKey(x.fournisseur)===supplierKey(supplierSelect.value))&&
   (!month.value||String(x.mois||x.date).startsWith(month.value))&&
   (!search.value||norm([x.fournisseur,x.numero,x.categorie].join(' ')).includes(norm(search.value)))
  );
  const total=filtered.reduce((a,x)=>a+n(x.ht),0),summary=add(content,'div','ps-summary');
  add(summary,'div','','Lignes d’achats : '+filtered.length);
  add(summary,'div','','Total HT : '+formatEuro.format(total));
  if(supplierSelect.value){
   const bar=add(content,'div','ps-toolbar');
   button(bar,'← Tous les fournisseurs',()=>{supplierSelect.value='';draw();});
   button(bar,'Fiche fournisseur',()=>{const nav=document.querySelector('.app-nav-item[data-page="supplier-directory"]');nav?.click();window.dispatchEvent(new CustomEvent('prism-show-supplier',{detail:{supplier:supplierSelect.value}}));});
  }
  table(content,['Date','Fournisseur','Catégorie','N° facture','HT','TTC'],filtered.slice(0,200).map(x=>[x.date,x.fournisseur,x.categorie,x.numero||'—',money(x.ht),money(x.ttc)]));
  if(filtered.length>200)note(content,'Affichage limité à 200 lignes ; le total porte sur toutes les lignes filtrées.');
  note(content,'Les lignes peuvent inclure des charges hors matières, des avoirs et des documents sans numéro : le total doit être rapproché de la comptabilité avant validation.');
 }
 supplierSelect.onchange=draw;search.oninput=draw;month.onchange=draw;
 window.addEventListener('prism-supplier-invoices',event=>{
  supplierFocus=event.detail?.supplier||'';
  if(rows.length){supplierSelect.value=supplierFocus;if(supplierSelect.selectedIndex<0)supplierSelect.value='';supplierFocus='';draw();}
 });
 async function load(force){
  refresh.disabled=true;content.textContent='Lecture des achats…';
  try{rows=await read('purchases',force);populateSuppliers();}
  catch(err){content.textContent=err.message;}
  finally{refresh.disabled=false;}
 }
 await load(false);
}
let productSupplierFocus='';
async function catalogSync(method,confirm){
 const user=window.netlifyIdentity?.currentUser();
 if(!user)throw Error('Connexion requise');
 const res=await fetch('/.netlify/functions/purchase-catalog-sync',{method,headers:{Authorization:'Bearer '+await user.jwt(),...(method==='POST'?{'Content-Type':'application/json'}:{})},body:method==='POST'?JSON.stringify({establishment:'LOCEAN',confirm:true}):undefined,cache:'no-store'});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Erreur de synchronisation');
 return data;
}
async function mountProducts(){
 const page=document.getElementById('module-suppliers'),shell=page?.querySelector('.module-shell');
 if(!shell||shell.querySelector('.ps-products'))return;
 const root=e('section','ps-root ps-products');
 const catalog=shell.querySelector('.purchases-root');
 if(catalog)catalog.insertAdjacentElement('afterend',root);else shell.appendChild(root);
 add(root,'h3','','Produits Pennylane · prix d’achat et historique');
 const toolbar=add(root,'div','ps-toolbar');
 const supplier=add(toolbar,'select','ps-search ps-select');
 const family=add(toolbar,'select','ps-search ps-select');
 const search=add(toolbar,'input','ps-search');search.type='search';search.placeholder='Produit, code ou fournisseur';
 const reload=button(toolbar,'Actualiser les données',()=>load(true));
 const sync=button(toolbar,'Synchroniser avec le catalogue d’inventaire',syncCatalog);
 const content=add(root,'div');
 const state=add(root,'p','ps-note','');
 let rows=[],catalogNames=new Set(),catalogRefs=new Set();
 function populate(){
  const prevSupplier=productSupplierFocus||supplier.value;
  supplier.replaceChildren();let none=add(supplier,'option','','Tous les fournisseurs');none.value='';
  [...new Set(rows.map(r=>String(r.fournisseur||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(v=>{let o=add(supplier,'option','',v);o.value=v;});
  supplier.value=prevSupplier||'';if(supplier.selectedIndex<0)supplier.value='';
  productSupplierFocus='';
  const previousFamily=family.value;
  family.replaceChildren();none=add(family,'option','','Toutes les familles');none.value='';
  [...new Set(rows.map(r=>String(r.famille||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr')).forEach(v=>{let o=add(family,'option','',v);o.value=v;});
  family.value=previousFamily||'';if(family.selectedIndex<0)family.value='';
 }
 function draw(){
  content.replaceChildren();
  const filtered=rows.filter(x=>
   (!supplier.value||supplierKey(x.fournisseur)===supplierKey(supplier.value))&&
   (!family.value||x.famille===family.value)&&
   norm([x.designation,x.fournisseur,x.code,x.famille].join(' ')).includes(norm(search.value))
  );
  const unmatched=filtered.filter(x=>!catalogRefs.has(norm(x.fournisseur)+'|'+norm(x.code))&&!catalogNames.has(norm(x.designation)));
  const summary=add(content,'div','ps-summary');
  add(summary,'div','','Références Sheets : '+rows.length);
  add(summary,'div','','Résultats filtrés : '+filtered.length);
  add(summary,'div','','Non rapprochées (indicatif) : '+unmatched.length);
  table(content,['Fournisseur','Référence','Désignation','Famille','Prix actuel HT','Prix initial HT','Évolution'],filtered.slice(0,200).map(x=>[x.fournisseur,x.code,x.designation,x.famille,money(x.prix_actuel_ht),money(x.prix_debut_ht),x.evolution||'—']));
  if(filtered.length>200)note(content,'200 lignes affichées au maximum ; affine les filtres pour retrouver une référence.');
  note(content,'Le tableur est la source d’import. Le catalogue privé Prism reste la base des inventaires : il est mis à jour seulement après confirmation.');
 }
 async function syncCatalog(){
  sync.disabled=true;state.textContent='Analyse des produits et des prix depuis Google Sheets…';
  try{
   const preview=await catalogSync('GET');
   const summary=preview.newProducts+' nouvelle(s) référence(s), '+preview.pricesUpdated+' prix à actualiser, '+preview.ambiguous+' ambiguïté(s) et '+preview.unclassified+' produit(s) à classer.';
   state.textContent=summary;
   if(!preview.newProducts&&!preview.pricesUpdated)return;
   if(!confirm(summary+'\\n\\nConfirmer la création des nouvelles fiches et la mise à jour des prix dans le catalogue de tes inventaires ? Les quantités et inventaires existants ne seront pas modifiés.'))return;
   const outcome=await catalogSync('POST',true);
   state.textContent='Synchronisation enregistrée : '+outcome.newProducts+' produit(s) créé(s) et '+outcome.pricesUpdated+' prix modifié(s). Les catégories inconnues restent « À classer ».';
   const u=window.netlifyIdentity?.currentUser();
   if(u){
    const response=await fetch('/.netlify/functions/purchases',{headers:{Authorization:'Bearer '+await u.jwt()},cache:'no-store'});
    if(response.ok){const d=await response.json();catalogNames=new Set((d.products||[]).map(x=>norm(x.name)));catalogRefs=new Set((d.products||[]).map(x=>norm(x.supplier)+'|'+norm(x.supplierReference)));draw();}
   }
   window.dispatchEvent(new CustomEvent('prism-catalog-updated'));
  }catch(err){state.textContent=err.message;}finally{sync.disabled=false;}
 }
 search.oninput=draw;supplier.onchange=draw;family.onchange=draw;
 window.addEventListener('prism-supplier-products',event=>{
  productSupplierFocus=event.detail?.supplier||'';
  if(rows.length){supplier.value=productSupplierFocus;if(supplier.selectedIndex<0)supplier.value='';productSupplierFocus='';draw();}
 });
 async function load(force){
  reload.disabled=true;content.textContent='Lecture des références et du catalogue…';
  try{
   const u=window.netlifyIdentity?.currentUser();
   const token=u?await u.jwt():null;
   const [products,catalog]=await Promise.all([
    read('products',force),
    token?fetch('/.netlify/functions/purchases',{headers:{Authorization:'Bearer '+token},cache:'no-store'}).then(r=>r.ok?r.json():null):null
   ]);
   rows=products;catalogNames=new Set((catalog?.products||[]).map(x=>norm(x.name)));
   catalogRefs=new Set((catalog?.products||[]).map(x=>norm(x.supplier)+'|'+norm(x.supplierReference)));
   catalogRefs.delete('|');populate();draw();
  }catch(err){content.textContent=err.message;}finally{reload.disabled=false;}
 }
 await load(false);
}
function initialize(){
 // Les pages fournisseurs et factures sont créées dynamiquement au démarrage.
 const obs=new MutationObserver(function(){mountIfVisible();});
 obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
 function mountIfVisible(){
  const map=[['module-supplier-directory',mountSuppliers],['module-purchase-invoices',mountPurchases],['module-suppliers',mountProducts]];
  for(const [id,fn] of map){
   const page=document.getElementById(id);
   if(page?.classList.contains('open')&&!page.querySelector('.ps-root'))fn().catch(console.error);
  }
 }
 mountIfVisible();
}
const style=e('style');
style.textContent='.ps-text-link{border:0;background:none;color:#795139;font-weight:750;text-align:left;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.ps-profile-editor{display:grid;gap:10px;max-width:660px;margin:15px 0;padding:16px;background:#faf8f5;border:1px solid #e7e0d8;border-radius:10px}.ps-profile-editor label{display:grid;gap:5px;font-size:11px;font-weight:650}.ps-profile-editor textarea{width:100%;font:inherit;resize:vertical}.ps-profile-editor .ps-button{justify-self:start}.ps-select{max-width:250px}.ps-root{margin-top:16px;background:#fff;border:1px solid #e7e1d9;border-radius:12px;padding:16px;min-width:0}.ps-root h3{font-size:15px;margin:0 0 12px;color:#332823}.ps-toolbar{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.ps-button{background:#382b25;color:white;border:0;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer}.ps-button:disabled{opacity:.5}.ps-search{min-width:150px;flex:1;border:1px solid #ded9d3;border-radius:7px;padding:9px}.ps-summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;color:#3e332c;font-weight:700;font-size:12px}.ps-scroll{overflow:auto;max-height:510px;border:1px solid #eee8e1;border-radius:8px}.ps-table{border-collapse:collapse;width:100%;font-size:11px}.ps-table th,.ps-table td{padding:9px;text-align:left;border-bottom:1px solid #eee7e0;white-space:nowrap}.ps-table th{position:sticky;top:0;background:#f8f5f0;color:#61564f}.ps-note{font-size:11px;line-height:1.5;color:#80756e;margin-top:10px}';
document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
