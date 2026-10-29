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
 let rows=[],profiles={},selected=null;
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
 async function load(force){
  reload.disabled=true;content.textContent='Chargement des fournisseurs…';
  try{
   const results=await Promise.all([read('suppliers',force),supplierProfiles('GET')]);
   rows=results[0];profiles=results[1].profiles||{};list();
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
 add(root,'h3','','Historique comptable · Google Sheets');
 const toolbar=add(root,'div','ps-toolbar'),search=add(toolbar,'input','ps-search');search.placeholder='Fournisseur, numéro, catégorie…';search.type='search';
 const month=add(toolbar,'input','ps-search');month.type='month';
 const refresh=button(toolbar,'Actualiser',()=>load(true));
 const content=add(root,'div'),hint=add(root,'p','ps-note','Historique des achats issu du tableur. Les lignes sans PDF ne deviennent pas des documents scannés Prism ; les montants et leurs catégories restent ceux de la source.');
 let rows=[];
 function draw(){
  content.replaceChildren();
  const filtered=rows.filter(x=>(!month.value||String(x.mois||x.date).startsWith(month.value))&&(!search.value||norm([x.fournisseur,x.numero,x.categorie].join(' ')).includes(norm(search.value))));
  const sum=filtered.reduce((a,x)=>a+n(x.ht),0);
  const summary=add(content,'div','ps-summary');add(summary,'div','','Lignes : '+filtered.length);add(summary,'div','','Total HT des lignes filtrées : '+formatEuro.format(sum));
  table(content,['Date','Fournisseur','Catégorie','N° facture','HT','TTC'],filtered.slice(0,150).map(x=>[x.date,x.fournisseur,x.categorie,x.numero||'—',money(x.ht),money(x.ttc)]));
  if(filtered.length>150)note(content,'Affichage limité aux 150 premières lignes ; les totaux portent sur toutes les lignes filtrées.');
  note(content,'Les achats peuvent inclure des charges hors matières et des lignes sans numéro de facture : ne pas assimiler directement ce total à la comptabilité validée.');
 }
 search.oninput=draw;month.onchange=draw;
 async function load(force){refresh.disabled=true;content.textContent='Lecture des achats…';try{rows=await read('purchases',force);draw();}catch(err){content.textContent=err.message;}finally{refresh.disabled=false;}}
 await load(false);
}
async function mountProducts(){
 const page=document.getElementById('module-suppliers'),shell=page?.querySelector('.module-shell');if(!shell||shell.querySelector('.ps-products'))return;
 const root=e('section','ps-root ps-products');
 const catalog=shell.querySelector('.purchases-root');
 if(catalog)catalog.insertAdjacentElement('afterend',root);else shell.appendChild(root);
 add(root,'h3','','Références et évolution des achats · Google Sheets');
 const toolbar=add(root,'div','ps-toolbar'),search=add(toolbar,'input','ps-search');search.type='search';search.placeholder='Nom, code ou fournisseur';
 const reload=button(toolbar,'Actualiser depuis Sheets',()=>load(true)),content=add(root,'div');
 let rows=[],catalogNames=new Set(),catalogRefs=new Set();
 function draw(){
  content.replaceChildren();
  const filtered=rows.filter(x=>norm([x.designation,x.fournisseur,x.code,x.famille].join(' ')).includes(norm(search.value)));
  const unknown=filtered.filter(x=>!catalogRefs.has(norm(x.fournisseur)+'|'+norm(x.code))&&!catalogNames.has(norm(x.designation)));
  const summary=add(content,'div','ps-summary');
  add(summary,'div','','Références importées : '+rows.length);
  add(summary,'div','','Non rapprochées au catalogue Prism (estimation) : '+unknown.length+' / '+filtered.length);
  table(content,['Fournisseur','Code','Produit','Famille Sheets','Prix HT actuel','Premier prix HT','Évolution'],filtered.slice(0,150).map(x=>[x.fournisseur,x.code,x.designation,x.famille,money(x.prix_actuel_ht),money(x.prix_debut_ht),x.evolution||'—']));
  note(content,'Référentiel historique en lecture seule. Le rapprochement des nouveaux produits reste indicatif : aucune création de fiche ni modification de prix ou de stock sans validation. Limite de 150 lignes visibles.');
 }
 search.oninput=draw;
 async function load(force){
  reload.disabled=true;content.textContent='Lecture des références…';
  try{
   const [products,catalog]=await Promise.all([read('products',force),window.netlifyIdentity?.currentUser()?.jwt().then(jwt=>fetch('/.netlify/functions/purchases',{headers:{Authorization:'Bearer '+jwt},cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null))]);
   rows=products;catalogNames=new Set((catalog?.products||[]).map(x=>norm(x.name)));
   catalogRefs=new Set((catalog?.products||[]).map(x=>norm(x.supplier)+'|'+norm(x.supplierReference)));
   catalogRefs.delete('|');draw();
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
style.textContent='.ps-root{margin-top:16px;background:#fff;border:1px solid #e7e1d9;border-radius:12px;padding:16px;min-width:0}.ps-root h3{font-size:15px;margin:0 0 12px;color:#332823}.ps-toolbar{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.ps-button{background:#382b25;color:white;border:0;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer}.ps-button:disabled{opacity:.5}.ps-search{min-width:150px;flex:1;border:1px solid #ded9d3;border-radius:7px;padding:9px}.ps-summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;color:#3e332c;font-weight:700;font-size:12px}.ps-scroll{overflow:auto;max-height:510px;border:1px solid #eee8e1;border-radius:8px}.ps-table{border-collapse:collapse;width:100%;font-size:11px}.ps-table th,.ps-table td{padding:9px;text-align:left;border-bottom:1px solid #eee7e0;white-space:nowrap}.ps-table th{position:sticky;top:0;background:#f8f5f0;color:#61564f}.ps-note{font-size:11px;line-height:1.5;color:#80756e;margin-top:10px}';
document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
