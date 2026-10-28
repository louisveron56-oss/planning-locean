/* Prism Inventaires : comptage par zone, jauges et ratios. */
(function(){
'use strict';
let root,products=[],sessions=[],current=null,rows=[],busy=false;
const money=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
const add=(p,t,c,text)=>{const x=el(t,c,text);p.appendChild(x);return x;};
const n=v=>Number(v)||0;
const today=()=>new Date().toLocaleDateString('sv-SE');
function btn(p,label,click,cls){let b=add(p,'button',cls||'pi-btn',label);b.type='button';b.onclick=click;return b;}
function status(text,bad){let s=root?.querySelector('.pi-status');if(s){s.textContent=text;s.style.color=bad?'#aa4236':'#746658';}}
async function request(endpoint,body){
 let user=window.netlifyIdentity?.currentUser();if(!user)throw Error('Connexion requise.');
 let response=await fetch('/.netlify/functions/'+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+await user.jwt(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({...body,establishment:'LOCEAN'}):undefined,cache:'no-store'});
 let data=await response.json();if(!response.ok)throw Error(data.error||'Service indisponible');return data;
}
function field(p,label,type,value){
 let wrap=add(p,'label','pi-field');add(wrap,'span','',label);
 let input=add(wrap,type==='select'?'select':'input','pi-input');if(type!=='select')input.type=type;input.value=value??'';return input;
}
function exportCsv(session){
 let cols=['Date','Zone','Produit','Pôle','Unité','Unités entières','Bouteilles ouvertes','Remplissage %','Équivalent unités','Prix HT / unité','Valeur HT','Unité vérifiée','Note'];
 let values=[cols,...session.lines.map(x=>[session.date,session.zone,x.name,x.category,x.unit,x.sealed,x.open,x.openPct,x.quantity,x.unitPriceHT,x.valueHT,x.unitConfirmed?'oui':'non',x.note])];
 let escape=v=>'"'+String(v??'').replace(/"/g,'""').replace(/[\r\n]/g,' ')+'"';
 let blob=new Blob(['\ufeff'+values.map(line=>line.map(escape).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 let uri=URL.createObjectURL(blob),a=el('a');a.href=uri;a.download='Prism_inventaire_'+session.date+'_'+session.zone.replace(/\s+/g,'-')+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),30000);
}
async function exportAll(){
 let valid=sessions.filter(x=>x.status==='validated');if(!valid.length){status('Aucun inventaire validé à exporter.',true);return;}
 status('Préparation des inventaires validés…');
 try{
  const records=await Promise.all(valid.map(x=>request('inventory?id='+encodeURIComponent(x.id))));
  const columns=['Établissement','Date','Zone','Inventaire','Produit','Famille','Unité','Quantité équivalente','Prix HT / unité','Valeur HT','Validation'];
  const table=[columns];
  records.forEach(({session:s})=>s.lines.forEach(l=>table.push(['L’OCÉAN',s.date,s.zone,s.id,l.name,l.category,l.unit,l.quantity,l.unitPriceHT,l.valueHT,s.validatedAt||''])));
  const escape=v=>'"'+String(v??'').replace(/"/g,'""').replace(/[\r\n]/g,' ')+'"';
  const blob=new Blob(['\uFEFF'+table.map(x=>x.map(escape).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='Prism_inventaires_valides_LOCEAN.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  status(valid.length+' inventaire(s) validé(s) exporté(s).');
 }catch(err){status(err.message,true);}
}
function home(){
 root.replaceChildren();
 let h=add(root,'div','pi-title');add(h,'h3','','Inventaires de L’Océan');add(h,'p','','Comptage mobile par zone · jauge des bouteilles entamées · valorisation HT');
 let actions=add(root,'div','pi-actions');btn(actions,'+ Nouvel inventaire',()=>{current={zone:'Bar',date:today(),label:'',notes:'',status:'draft',version:0,lines:[]};rows=[];edit();},'pi-main');btn(actions,'Actualiser',load);
 btn(actions,'Exporter tous les inventaires validés (CSV)',exportAll);
 add(root,'p','pi-status','Comptage assisté et contrôlé. La reconnaissance photographique reste une étape expérimentale.');
 let list=add(root,'section','pi-section');add(list,'h4','','Historique des comptages');
 if(!sessions.length)add(list,'p','pi-hint','Aucun inventaire. Commence par une zone de stockage.');
 sessions.forEach(item=>{
  let box=add(list,'div','pi-session'),info=add(box,'div','pi-session-info');
  add(info,'strong','',item.zone+' — '+item.date);
  add(info,'small','',(item.status==='validated'?'Validé':'Brouillon')+' · '+item.lines+' référence(s) · '+money.format(item.valueHT));
  btn(box,item.status==='validated'?'Consulter':'Reprendre',async()=>{try{let r=await request('inventory?id='+encodeURIComponent(item.id));current=r.session;rows=current.lines.map(x=>({...x}));edit();}catch(err){status(err.message,true);}});
 });
 ratio();
}
function ratio(){
 let section=add(root,'section','pi-section pi-ratio');add(section,'h4','','Estimation du ratio matière');
 add(section,'p','pi-hint','Stock initial HT + achats HT − stock final HT = consommation matière. Le ratio est cette consommation divisée par le CA HT du même périmètre.');
 const valid=sessions.filter(x=>x.status==='validated').sort((a,b)=>a.date.localeCompare(b.date));
 let grid=add(section,'div','pi-grid');
 let start=field(grid,'Inventaire initial','select'),end=field(grid,'Inventaire final','select');
 for(let sel of [start,end]){add(sel,'option','','Choisir une date et une zone').value='';valid.forEach(x=>{let opt=add(sel,'option','',x.date+' · '+x.zone+' · '+money.format(x.valueHT));opt.value=x.id;});}
 let buying=field(grid,'Achats HT sur la période','number'),revenue=field(grid,'CA HT du même périmètre','number');for(let x of [buying,revenue]){x.min='0';x.step='.01';}
 let answer=add(section,'div','pi-result','Sélectionne deux inventaires validés, puis saisis tes achats et le CA HT.');
 function calc(){
  let a=valid.find(x=>x.id===start.value),b=valid.find(x=>x.id===end.value);
  if(!a||!b){answer.textContent='Sélectionne deux inventaires validés.';return;}
  if(a.zone!==b.zone||a.date>=b.date){answer.textContent='Choisis la même zone, avec deux dates dans le bon ordre.';return;}
  if(buying.value===''||revenue.value===''||n(revenue.value)<=0){answer.textContent='Indique les achats HT et un CA HT positif couvrant le même périmètre.';return;}
  let consumption=n(a.valueHT)+n(buying.value)-n(b.valueHT);
  answer.textContent='Consommation estimée : '+money.format(consumption)+' · Ratio indicatif : '+(100*consumption/n(revenue.value)).toLocaleString('fr-FR',{maximumFractionDigits:2})+' %. À vérifier : périmètre identique, achats exhaustifs et prix HT unitaires exacts.';
 }
 [start,end,buying,revenue].forEach(x=>{x.onchange=calc;x.oninput=calc;});
}
function edit(){
 root.replaceChildren();let locked=current.status==='validated';
 let h=add(root,'div','pi-title');add(h,'h3','',locked?'Inventaire validé':'Saisie de l’inventaire');add(h,'p','','Les bouteilles ouvertes sont comptées par nombre et pourcentage moyen de remplissage.');
 let actions=add(root,'div','pi-actions');btn(actions,'← Retour à l’historique',()=>{current=null;rows=[];home();});
 let info=add(root,'div','pi-grid'),zone=field(info,'Zone','select');
 ['Bar','Cave','Réserve','Cuisine','Chambre froide','Autre'].forEach(v=>add(zone,'option','',v).value=v);zone.value=current.zone;
 let date=field(info,'Date','date',current.date),label=field(info,'Libellé','text',current.label),notes=field(info,'Notes','text',current.notes);
 [zone,date,label,notes].forEach(x=>x.disabled=locked);
 let searchbox=add(root,'section','pi-section');
 if(!locked){
  let search=field(searchbox,'Rechercher et ajouter un produit du catalogue','search',''),suggestions=add(searchbox,'div','pi-suggestions');
  search.placeholder='Au moins 2 caractères';
  search.oninput=()=>{
   suggestions.replaceChildren();let q=search.value.trim().toLocaleLowerCase('fr');if(q.length<2)return;
   products.filter(p=>p.name.toLocaleLowerCase('fr').includes(q)&&!rows.some(x=>x.productId===p.id)).slice(0,12).forEach(p=>{
    btn(suggestions,p.name+' · '+(p.unit||'unité non précisée'),()=>{
     collect();rows.push({productId:p.id,name:p.name,unit:p.unit,category:p.category,sealed:0,open:0,openPct:0,unitPriceHT:n(p.price),unitConfirmed:false,note:''});
     search.value='';suggestions.replaceChildren();drawRows();
    },'pi-suggestion');
   });
  };
 }
 let listing=add(root,'section','pi-section');add(listing,'h4','','Produits de cette zone');
 let holder=add(listing,'div','pi-list'),total=add(root,'div','pi-total','');
 let message=add(root,'p','pi-status','');
 let controls=add(root,'div','pi-actions'),save,validate;
 if(!locked){save=btn(controls,'Enregistrer le brouillon',saveDraft,'pi-main');validate=btn(controls,'Valider et verrouiller',validateDraft);}
 if(current.id)btn(controls,'Exporter en CSV pour la comptabilité',()=>{collect();let data=rows.map(l=>({...l,quantity:n(l.sealed)+n(l.open)*n(l.openPct)/100,valueHT:(n(l.sealed)+n(l.open)*n(l.openPct)/100)*n(l.unitPriceHT)}));exportCsv({...current,lines:data});});
 function collect(){
  current.zone=zone.value;current.date=date.value;current.label=label.value;current.notes=notes.value;
  holder.querySelectorAll('[data-product-id]').forEach(block=>{
   let row=rows.find(x=>x.productId===block.dataset.productId);if(!row)return;
   block.querySelectorAll('[data-key]').forEach(input=>{let key=input.dataset.key;row[key]=key==='unitConfirmed'?input.checked:key==='note'?input.value:n(input.value);});
  });
 }
 function drawRows(){
  holder.replaceChildren();
  if(!rows.length)add(holder,'p','pi-hint','Aucun produit compté : ajoute une référence ci-dessus.');
  rows.forEach(row=>{
   let article=add(holder,'article','pi-product');article.dataset.productId=row.productId;
   let header=add(article,'div','pi-product-header');add(header,'strong','',row.name);add(header,'small','',row.unit||'Conditionnement absent');
   if(!locked)btn(header,'Retirer',()=>{collect();rows=rows.filter(x=>x.productId!==row.productId);drawRows();});
   let grid=add(article,'div','pi-grid');
   function count(label,key,step){let x=field(grid,label,'number',row[key]);x.dataset.key=key;x.min='0';x.step=step;x.disabled=locked;x.oninput=refreshTotal;}
   count('Unités entières / fermées','sealed','1');count('Bouteilles entamées','open','1');
   let percent=add(grid,'label','pi-field');add(percent,'span','','Remplissage moyen des bouteilles ouvertes');
   let slider=add(percent,'input','pi-range');slider.type='range';slider.min='0';slider.max='100';slider.step='5';slider.value=row.openPct;slider.dataset.key='openPct';slider.disabled=locked;
   let output=add(percent,'output','',slider.value+' %');slider.oninput=()=>{output.textContent=slider.value+' %';refreshTotal();};
   count('Prix HT / unité inventoriée','unitPriceHT','0.0001');
   let checkbox=add(article,'label','pi-confirm'),check=add(checkbox,'input');check.type='checkbox';check.dataset.key='unitConfirmed';check.checked=row.unitConfirmed;check.disabled=locked;
   add(checkbox,'span','','J’ai vérifié le prix HT par unité : attention aux cartons et conditionnements.');
   let note=field(article,'Commentaire','text',row.note);note.dataset.key='note';note.disabled=locked;
  });refreshTotal();
 }
 function refreshTotal(){
  let sum=0,uncertain=0;
  holder.querySelectorAll('[data-product-id]').forEach(block=>{
   let get=k=>n(block.querySelector('[data-key="'+k+'"]')?.value);
   sum+=(get('sealed')+get('open')*get('openPct')/100)*get('unitPriceHT');
   if(!block.querySelector('[data-key="unitConfirmed"]')?.checked)uncertain++;
  });
  total.textContent='Valorisation HT : '+money.format(sum)+' · '+uncertain+' prix ou unité(s) à confirmer';
 }
 async function saveDraft(){
  if(busy)return;collect();busy=true;save.disabled=true;validate.disabled=true;status('Enregistrement du brouillon…');
  try{let r=await request('inventory',{action:'save',id:current.id,version:current.version,zone:current.zone,date:current.date,label:current.label,notes:current.notes,lines:rows});current=r.session;rows=current.lines.map(x=>({...x}));sessions=r.summary;edit();status('Brouillon enregistré.');}
  catch(err){status(err.message,true);busy=false;save.disabled=false;validate.disabled=false;return;}busy=false;
 }
 async function validateDraft(){
  if(busy)return;
  collect();
  if(!current.id){status('Enregistre le brouillon avant validation.',true);return;}
  if(rows.some(x=>!x.unitConfirmed)){status('Confirme toutes les unités et prix.',true);return;}
  if(!confirm('Valider définitivement cet inventaire ?'))return;
  busy=true;validate.disabled=true;if(save)save.disabled=true;
  try{
   // Toujours enregistrer les derniers changements avant verrouillage définitif.
   let draft=await request('inventory',{action:'save',id:current.id,version:current.version,zone:current.zone,date:current.date,label:current.label,notes:current.notes,lines:rows});
   current=draft.session;sessions=draft.summary;rows=current.lines.map(x=>({...x}));
   let r=await request('inventory',{action:'validate',id:current.id,version:current.version});
   current=r.session;sessions=r.summary;rows=current.lines.map(x=>({...x}));edit();
  }catch(err){status(err.message,true);validate.disabled=false;if(save)save.disabled=false;}busy=false;
 }
 drawRows();
}
async function load(){
 try{let [all,cat]=await Promise.all([request('inventory'),request('purchases')]);sessions=all.sessions||[];products=cat.products||[];home();}
 catch(err){home();status(err.message,true);}
}
function init(){
 let page=document.getElementById('module-inventory');if(!page)return;
 root=page.querySelector('.module-placeholder');if(!root)return;root.classList.add('pi-root');root.style.display='block';root.style.textAlign='left';home();
 let obs=new MutationObserver(()=>{if(page.classList.contains('open')){obs.disconnect();load();}});obs.observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('open'))load();
}
let style=el('style');style.textContent=
'.pi-root{padding:0!important;max-width:100%!important;text-align:left!important;display:block!important;min-height:0!important}.pi-title h3{color:#332823;font-size:20px;margin:0 0 7px}.pi-title p,.pi-hint{font-size:12px;color:#76695e;line-height:1.55}.pi-section{border:1px solid #e1d4c7;border-radius:12px;padding:17px;background:#fffdfa;margin:15px 0}.pi-section h4{font-size:14px;margin:0 0 13px;color:#332823}.pi-actions{display:flex;gap:9px;flex-wrap:wrap;margin:15px 0}.pi-btn,.pi-main,.pi-suggestion{background:#fff;border:1px solid #d6c8ba;border-radius:8px;color:#44352b;padding:10px 13px;font-size:12px;cursor:pointer}.pi-main{background:#332823;color:#fff;font-weight:750}.pi-session{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #eaded1;padding:13px 0}.pi-session-info{display:flex;flex-direction:column;gap:6px}.pi-session-info strong{font-size:13px}.pi-session-info small{font-size:11px;color:#847367}.pi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.pi-field{display:flex;flex-direction:column;gap:6px;min-width:0}.pi-field span{font-size:11px;color:#645346;font-weight:700}.pi-input{width:100%;min-width:0;box-sizing:border-box;background:#fff;color:#332823;border:1px solid #d8c7b5;border-radius:7px;padding:10px;font-size:12px}.pi-suggestions{display:flex;flex-direction:column;gap:3px;margin-top:6px}.pi-suggestion{text-align:left}.pi-product{padding:14px;margin:11px 0;border-radius:10px;border:1px solid #e5d8cc;background:#fff}.pi-product-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}.pi-product-header small{color:#796c61}.pi-product-header .pi-btn{margin-left:auto}.pi-range{accent-color:#825840;width:100%}.pi-confirm{display:flex;align-items:center;gap:9px;font-size:12px;color:#625347;margin:11px 0}.pi-total,.pi-result{padding:14px;background:#f4e9dc;color:#332823;border-radius:9px;font-size:13px;line-height:1.5}.pi-total{font-weight:800}.pi-status{font-size:12px;color:#76695e}.pi-ratio{margin-top:25px}@media(max-width:600px){.pi-grid{grid-template-columns:1fr}.pi-section{padding:13px}.pi-session{flex-wrap:wrap}}';
document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();