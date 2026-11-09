/* PRISM — Analyse des achats & simulation de négociation.
 * Zéro vente simulée, chiffres issus exclusivement des lignes d'achats importées.
 * Lecture seule, calcul local et chargement progressif des lots historiques.
 * Visuel Sable & Or (prism-purchase-analysis.css) : 3 onglets — Achats, Négocier, Marge au verre.
 * Les calculs sont ceux de la version précédente, à l'identique.
 */
(function(){
'use strict';
const API='/.netlify/functions/purchase-analysis';
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const fmt=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const months=['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const monthsLong=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const norm=x=>String(x??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const num=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const v=Number(String(x).replace(',','.'));return Number.isFinite(v)?v:null;};
const el=(root,tag,text,cls)=>{const v=document.createElement(tag);if(text!==undefined)v.textContent=String(text);if(cls)v.className=cls;if(root)root.appendChild(v);return v;};
const btn=(root,text,cls,fn)=>{const b=el(root,'button',text,cls);b.type='button';if(fn)b.onclick=fn;return b;};
const money=x=>euro.format(x||0);
const qty=x=>fmt.format(x||0);
const key=p=>[norm(p.supplier),norm(p.reference),norm(p.unit)].join('|');
/* Nom lisible à l'affichage (« BIERE BLONDE FUT 30L » → « Biere blonde fut 30L ») ; l'original reste en info-bulle. */
function tidy(raw){const t=String(raw||'').trim(),l=t.replace(/[^A-Za-zÀ-ÿ]/g,'');if(l.length<3||l.replace(/[^A-ZÀ-Þ]/g,'').length/l.length<=.7)return t;return t.toLowerCase().replace(/(^|\s)([a-zà-ÿ])/,(_,a,b)=>a+b.toUpperCase()).replace(/(\d)l\b/g,'$1L');}
function tidySupplier(raw){const t=String(raw||'').trim(),l=t.replace(/[^A-Za-zÀ-ÿ]/g,'');if(l.length<3||l.replace(/[^A-ZÀ-Þ]/g,'').length/l.length<=.7)return t;return t.toLowerCase().replace(/(^|[\s-])([a-zà-ÿ])/g,(_,a,b)=>a+b.toUpperCase());}

let overlay=null,host=null,summary=null,tableHost=null,detailHost=null,loadingHost=null,lastFocus=null;
let entries=[],index=new Map(),loaded=false,loading=null,ignored={},importedAt='',lineCount=0,progress=0;
let year=2026,basisYear=2025,search='',supplier='',page=0,selection='',discount=0.03,mode='litre',litresPerUnit=null,scenarioType='target',targetPrice=null,salePriceTTC=null,servingCl=25,saleVat=20,servingLoss=0,salePackL=null;
let tab='achats';

function pane(){
 if(overlay)return;
 lastFocus=document.activeElement;
 overlay=el(document.body,'div',undefined,'ng-overlay');
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 host=el(overlay,'section',undefined,'ng-panel');
 host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Analyse des achats et négociation');
 const top=el(host,'header',undefined,'ng-top');
 el(top,'h2','Achats & négociation','ng-title');
 const closeBtn=btn(top,'Fermer','ng-close',close);closeBtn.setAttribute('aria-label','Fermer l’analyse des achats');
 loadingHost=el(host,'div',undefined,'ng-status');
 summary=el(host,'div',undefined,'ng-summary');tableHost=el(host,'div',undefined,'ng-body');
 document.documentElement.classList.add('ng-open');
 closeBtn.focus();
 if(loaded)render();else{drawLoading();fetchAll();}
}
function close(){overlay?.remove();overlay=null;host=null;summary=null;tableHost=null;detailHost=null;loadingHost=null;document.documentElement.classList.remove('ng-open');try{lastFocus?.focus?.();}catch(_){}}
function drawLoading(){
 if(!loadingHost)return;loadingHost.replaceChildren();
 const box=el(loadingHost,'div',undefined,'ng-loading');
 el(box,'span',progress?'Lecture des factures : '+progress+' %':'Lecture des historiques d’achats…');
 const bar=el(box,'div',undefined,'ng-progress');const fill=el(bar,'div');fill.style.width=Math.max(4,progress)+'%';
}
async function api(query){
 const user=window.netlifyIdentity?.currentUser?.();
 if(!user)throw Error('Connecte-toi à PRISM pour consulter les factures.');
 const result=await fetch(API+'?'+query,{headers:{Authorization:'Bearer '+await user.jwt()},cache:'no-store'});
 const data=await result.json();
 if(!result.ok)throw Error(data.error||'Analyse indisponible');return data;
}
async function fetchAll(){
 if(loading)return loading;
 loading=(async()=>{
  progress=0;drawLoading();
  const manifest=await api('mode=manifest');
  if(!manifest.ready){lineCount=0;entries=[];loaded=true;render();return;}
  lineCount=manifest.rowCount||0;importedAt=manifest.importedAt||'';
  const data=new Map(),loss={invalidDate:0,invalidQuantity:0,invalidPrice:0,missingBatch:0};
  const pages=manifest.totalBatches||0;
  for(let offset=0;offset<pages;offset+=36){
   const pagesRead=await Promise.all(Array.from({length:Math.min(3,Math.ceil((pages-offset)/12))},(_,j)=>api('offset='+(offset+j*12)+'&limit=12')));
   for(const result of pagesRead){
   for(const part of result.entries||[]){
    const id=part.key,old=data.get(id);
    if(!old)data.set(id,{...part});
    else{
     old.quantity+=part.quantity;old.amountHT+=part.amountHT;old.lines+=part.lines;old.flagged+=part.flagged;old.dutyMissing+=part.dutyMissing;
     for(const s of part.sourceNames||[])if(!old.sourceNames.includes(s))old.sourceNames.push(s);
    }
   }
   for(const k of Object.keys(loss))loss[k]+=result.ignored?.[k]||0;
   }
   progress=pages?Math.round(Math.min(offset+36,pages)/pages*100):100;drawLoading();
  }
  entries=[...data.values()];ignored=loss;index=new Map();
  for(const a of entries){
   const id=key(a),values=index.get(id)||[];
   values.push(a);index.set(id,values);
  }
  const years=[...new Set(entries.map(a=>a.year))].sort((a,b)=>b-a);
  if(years.length&&!years.includes(year))year=years[0];
  if(years.length)basisYear=years.includes(year-1)?year-1:year;
  loaded=true;render();
 })().catch(err=>{if(loadingHost){loadingHost.replaceChildren();el(loadingHost,'p','Analyse indisponible : '+err.message,'ng-alert');}});
 await loading;loading=null;
}
const yearList=()=>[...new Set(entries.map(a=>a.year))].sort((a,b)=>b-a);
function productsFor(yr){
 const grouped=new Map();
 for(const part of entries){
  if(part.year!==yr)continue;
  const id=key(part);
  let p=grouped.get(id);
  if(!p){p={...part,quantity:0,amountHT:0,lines:0,flagged:0,dutyMissing:0,months:Array(12).fill(null).map(()=>({qty:0,amount:0}))};grouped.set(id,p);}
  p.quantity+=part.quantity;p.amountHT+=part.amountHT;p.lines+=part.lines;p.flagged+=part.flagged;p.dutyMissing+=part.dutyMissing;
  const m=p.months[part.month-1];if(m){m.qty+=part.quantity;m.amount+=part.amountHT;}
 }
 return [...grouped.values()].sort((a,b)=>b.amountHT-a.amountHT);
}
function render(){
 if(!overlay||!loaded)return;
 loadingHost.replaceChildren();
 if(!entries.length){el(loadingHost,'p','Aucune ligne exploitable : importe d’abord un historique de factures datées avec quantités et prix HT.','ng-empty');summary.replaceChildren();tableHost.replaceChildren();return;}
 summary.replaceChildren();tableHost.replaceChildren();
 const filters=el(summary,'div',undefined,'ng-filters');
 const searchBox=el(filters,'label',undefined,'ng-search');
 const q=el(searchBox,'input');q.type='search';q.placeholder='Produit, code ou fournisseur…';q.value=search;q.setAttribute('aria-label','Rechercher un produit acheté');
 q.oninput=()=>{search=q.value;page=0;drawContent();};
 const years=yearList(),yearGroup=el(filters,'div',undefined,'ng-seg');yearGroup.setAttribute('role','group');yearGroup.setAttribute('aria-label','Année des achats');
 years.slice(0,4).forEach(y=>{const b=btn(yearGroup,String(y),'ng-seg-btn',()=>{year=y;basisYear=years.includes(year-1)?year-1:year;page=0;selection='';render();});b.setAttribute('aria-pressed',String(y===year));});
 const suppliers=[...new Set(entries.map(e=>e.supplier))].sort((a,b)=>a.localeCompare(b,'fr'));
 const select=el(filters,'select',undefined,'ng-select');select.setAttribute('aria-label','Fournisseur');
 let all=el(select,'option','Tous les fournisseurs');all.value='';
 suppliers.forEach(s=>{const o=el(select,'option',tidySupplier(s));o.value=s;});select.value=supplier;select.onchange=()=>{supplier=select.value;page=0;drawContent();};
 const metrics=el(summary,'div',undefined,'ng-kpis');metrics.id='paMetrics';
 const layout=el(tableHost,'div',undefined,'ng-layout');
 const left=el(layout,'section',undefined,'ng-list-card');left.setAttribute('aria-label','Produits achetés');
 const head=el(left,'div',undefined,'ng-list-head');el(head,'span','Produit');el(head,'span','Achats HT');
 const results=el(left,'div',undefined,'ng-list');results.id='paResults';
 const pager=el(left,'div',undefined,'ng-pagination');pager.id='paPager';
 detailHost=el(layout,'section',undefined,'ng-detail');
 const foot=el(tableHost,'details',undefined,'ng-method');
 el(foot,'summary','Comment ces chiffres sont calculés');
 el(foot,'p','Achats positifs uniquement. Montant = quantité facturée × prix unitaire HT importé. Les avoirs, remises de pied de facture, conditionnements inconnus et factures manquantes peuvent modifier le total réel.');
 el(foot,'p','Ventes KSD non connectées : les volumes affichés sont des volumes achetés, jamais des ventes.');
 el(foot,'p','Historique importé : '+lineCount.toLocaleString('fr-FR')+' lignes · '+index.size.toLocaleString('fr-FR')+' références / conditionnements'+(importedAt?' · import du '+new Date(importedAt).toLocaleDateString('fr-FR'):'')+'.');
 drawContent();
}
function drawContent(){
 if(!overlay||!loaded)return;
 const f=productsFor(year).filter(p=>(!supplier||p.supplier===supplier)&&(!search||norm([p.description,p.supplier,p.reference,p.unit,...(p.sourceNames||[])].join(' ')).includes(norm(search))));
 const amount=f.reduce((n,p)=>n+p.amountHT,0),lines=f.reduce((n,p)=>n+p.lines,0),flaggedRefs=f.filter(p=>p.flagged).length;
 const met=document.getElementById('paMetrics');if(met){met.replaceChildren();
  const hero=el(met,'div',undefined,'ng-kpi ng-kpi-hero');el(hero,'span','Achats HT '+year+(supplier?' · '+tidySupplier(supplier):''),'ng-kpi-label');el(hero,'strong',money(amount),'ng-kpi-value');
  const a=el(met,'div',undefined,'ng-kpi');el(a,'span','Références achetées','ng-kpi-label');el(a,'strong',qty(f.length),'ng-kpi-value');
  const b=el(met,'div',undefined,'ng-kpi');el(b,'span','Lignes de factures','ng-kpi-label');el(b,'strong',qty(lines),'ng-kpi-value');
  const c=el(met,'div',undefined,'ng-kpi');el(c,'span','Références à vérifier','ng-kpi-label');el(c,'strong',qty(flaggedRefs),'ng-kpi-value'+(flaggedRefs?' ng-down':''));
 }
 const list=document.getElementById('paResults'),pager=document.getElementById('paPager');
 if(!list||!pager)return;list.replaceChildren();pager.replaceChildren();
 if(!f.length){el(list,'p','Aucun produit pour ces filtres.','ng-empty');detailHost.replaceChildren();return;}
 if(!selection||!f.some(p=>key(p)===selection))selection=key(f[0]);
 const max=f[0]?.amountHT||1;
 f.slice(page*50,(page+1)*50).forEach(p=>{
  const active=key(p)===selection;
  const row=btn(list,undefined,'ng-row'+(active?' is-active':''),()=>{selection=key(p);litresPerUnit=null;targetPrice=null;salePriceTTC=null;salePackL=null;servingCl=/vin|bouteille/i.test(p.description+' '+p.unit)?12.5:25;drawContent();detailHost.scrollTop=0;});
  if(active)row.setAttribute('aria-current','true');
  row.title=p.description;
  const t=el(row,'span',undefined,'ng-row-text');
  const name=el(t,'span',tidy(p.description),'ng-row-name');
  if(p.flagged)el(name,'span',p.flagged+' à vérifier','ng-pill ng-pill-warn');
  el(t,'span',tidySupplier(p.supplier)+' · '+qty(p.quantity)+' '+p.unit,'ng-row-sub');
  const v=el(row,'span',undefined,'ng-row-value');el(v,'span',money(p.amountHT),'ng-row-amount');
  const bar=el(v,'span',undefined,'ng-row-bar');el(bar,'span').style.width=Math.max(2,p.amountHT/max*100)+'%';
 });
 if(f.length>50){
  const prev=btn(pager,'←','ng-icon-btn',()=>{page--;drawContent();list.scrollTop=0;});prev.disabled=page===0;prev.setAttribute('aria-label','Page précédente');
  el(pager,'span',(page+1)+' / '+Math.ceil(f.length/50),'ng-muted');
  const next=btn(pager,'→','ng-icon-btn',()=>{page++;drawContent();list.scrollTop=0;});next.disabled=(page+1)*50>=f.length;next.setAttribute('aria-label','Page suivante');
 }
 const p=f.find(x=>key(x)===selection)||f[0];drawDetail(p);
}

/* ---------- Calculs (identiques à la version précédente) ---------- */
function directLitres(p){return p.unit==='L'?1:p.unit==='cl'?0.01:p.unit==='ml'?0.001:null;}
function negotiation(p){
 const records=(index.get(selection)||[]).filter(x=>x.year===basisYear);
 const q=records.reduce((n,x)=>n+x.quantity,0);
 const monthsKnown=new Set(records.map(x=>x.month)).size;
 const direct=directLitres(p);
 const liters=mode==='litre'?(direct===null?litresPerUnit:direct):null;
 const validUnit=mode==='unite'||(liters!==null&&liters>0);
 const volume=mode==='unite'?q:validUnit?q*liters:0;
 const totalHT=records.reduce((n,x)=>n+x.amountHT,0);
 const avgPrice=volume>0?totalHT/volume:null;
 const validTarget=scenarioType==='discount'||(targetPrice!==null&&targetPrice>=0);
 const valid=validUnit&&volume>0&&avgPrice!==null&&validTarget;
 const newPrice=scenarioType==='target'?targetPrice:avgPrice-discount;
 const gain=valid?totalHT-volume*newPrice:null;
 const negative=valid&&newPrice<0;
 const flagged=records.reduce((n,x)=>n+x.flagged,0),missing=records.reduce((n,x)=>n+x.dutyMissing,0);
 return {records,q,monthsKnown,direct,liters,validUnit,volume,totalHT,avgPrice,validTarget,valid,newPrice,gain,negative,flagged,missing,unitLabel:mode==='litre'?'litre':p.unit};
}
function glassMargin(p,n){
 const directPack=directLitres(p);
 const pack=directPack!==null?directPack:(salePackL!==null?salePackL:litresPerUnit),sz=servingCl,saleTTC=salePriceTTC,loss=servingLoss;
 const ok=n.valid&&!n.negative&&pack!==null&&pack>0&&sz!==null&&sz>0&&saleTTC!==null&&saleTTC>=0&&loss!==null&&loss>=0&&loss<100;
 if(!ok)return {ok:false,pack};
 const oldPerLiter=mode==='litre'?n.avgPrice:n.avgPrice/pack;
 const newPerLiter=mode==='litre'?n.newPrice:n.newPrice/pack;
 const consumedLiters=(sz/100)/(1-loss/100),oldCost=oldPerLiter*consumedLiters,newCost=newPerLiter*consumedLiters;
 const saleHT=saleTTC/(1+saleVat/100),oldMargin=saleHT-oldCost,newMargin=saleHT-newCost,delta=oldCost-newCost;
 const yieldGlasses=pack*(1-loss/100)/(sz/100);
 return {ok:true,pack,saleHT,oldCost,newCost,oldMargin,newMargin,delta,yieldGlasses,rate:saleHT>0?newMargin/saleHT*100:null,oldRate:saleHT>0?oldMargin/saleHT*100:null};
}

/* ---------- Fiche produit ---------- */
function drawDetail(p){
 detailHost.replaceChildren();
 const head=el(detailHost,'div',undefined,'ng-detail-head');
 el(head,'h3',tidy(p.description),'ng-detail-title').title=p.description;
 el(head,'p',tidySupplier(p.supplier)+' · réf. '+p.reference+' · prix par '+p.unit,'ng-muted');
 const tabs=el(detailHost,'div',undefined,'ng-tabs');tabs.setAttribute('role','tablist');
 [['achats','Achats'],['negocier','Négocier'],['marge','Marge au verre']].forEach(([id,label],i)=>{
  const b=btn(tabs,undefined,'ng-tab',()=>{tab=id;drawDetail(p);});
  el(b,'span',String(i+1),'ng-tab-num');el(b,'span',label);
  b.setAttribute('role','tab');b.setAttribute('aria-selected',String(tab===id));
 });
 const body=el(detailHost,'div',undefined,'ng-tab-body');
 if(tab==='achats')drawPurchases(body,p);
 else if(tab==='negocier')drawNegotiation(body,p);
 else drawGlass(body,p);
}
function drawPurchases(body,p){
 const hero=el(body,'div',undefined,'ng-hero');
 el(hero,'span','Achats '+year,'ng-hero-label');
 el(hero,'strong',money(p.amountHT)+' HT','ng-hero-value');
 const facts=el(hero,'div',undefined,'ng-hero-facts');
 [[qty(p.quantity)+' '+p.unit,'achetés'],[money(p.amountHT/p.quantity),'prix moyen / '+p.unit],[String(p.lines),'lignes de factures']].forEach(([v,l])=>{const f=el(facts,'span');el(f,'b',v);el(f,'span',' '+l);});
 const prior=(index.get(selection)||[]).filter(x=>x.year===year-1);
 if(prior.length){
  const pq=prior.reduce((n,x)=>n+x.quantity,0),pa=prior.reduce((n,x)=>n+x.amountHT,0);
  const n1=el(body,'div',undefined,'ng-n1');
  el(n1,'span',(year-1)+' (N-1)','ng-muted');
  el(n1,'strong',qty(pq)+' '+p.unit+' · '+money(pa)+' HT');
  el(n1,'span','Comparaison brute : périodes et factures pas forcément complètes.','ng-muted');
 }
 if(p.flagged||p.dutyMissing||p.unitAssumed)el(body,'p','Chiffres indicatifs : '+p.flagged+' ligne(s) avec alerte'+(p.dutyMissing?', '+p.dutyMissing+' sans prix avec droits':'')+(p.unitAssumed?', unité supposée':'')+'. Vérifier conditionnements et factures avant de négocier.','ng-alert');
 const chartCard=el(body,'div',undefined,'ng-card');
 el(chartCard,'p','Quantités achetées par mois · '+year,'ng-card-title');
 const bars=el(chartCard,'div',undefined,'ng-chart'),max=Math.max(...p.months.map(x=>x.qty),1);
 bars.setAttribute('role','img');bars.setAttribute('aria-label','Quantités achetées par mois en '+year);
 p.months.forEach((m,i)=>{
  const c=el(bars,'div',undefined,'ng-column');
  el(c,'span',m.qty?qty(m.qty):'','ng-data');
  const bar=el(c,'div',undefined,'ng-bar'+(m.qty?'':' is-empty'));bar.style.height=(m.qty?Math.max(4,m.qty/max*100):2)+'%';
  bar.title=monthsLong[i]+' : '+qty(m.qty)+' '+p.unit+' · '+money(m.amount)+' HT';
  el(c,'span',months[i],'ng-month');
 });
 const more=el(chartCard,'details',undefined,'ng-months');el(more,'summary','Voir le détail par mois');
 const mt=el(more,'table',undefined,'ng-table'),mh=el(el(mt,'thead'),'tr');['Mois','Quantité','Montant HT'].forEach(t=>el(mh,'th',t));
 const mtBody=el(mt,'tbody');
 p.months.forEach((m,i)=>{if(!m.qty&&!m.amount)return;const row=el(mtBody,'tr');el(row,'td',monthsLong[i]);el(row,'td',qty(m.qty)+' '+p.unit,'num');el(row,'td',money(m.amount),'num');});
 const go=btn(body,'Simuler une négociation sur ce produit →','ng-primary',()=>{tab='negocier';drawDetail(p);});
 go.setAttribute('aria-label','Passer à l’onglet Négocier');
}
function field(root,label,hint){const f=el(root,'label',undefined,'ng-field');el(f,'span',label,'ng-field-label');const box=el(f,'span',undefined,'ng-input');if(hint)el(f,'span',hint,'ng-field-hint');return box;}
function numberInput(box,value,step,placeholder,suffix,onInput){
 const i=el(box,'input');i.type='text';i.inputMode='decimal';i.value=value===null||value===undefined?'':String(value).replace('.',',');if(placeholder)i.placeholder=placeholder;i.dataset.step=step;
 i.oninput=()=>onInput(num(i.value));
 if(suffix)el(box,'span',suffix,'ng-suffix');
 return i;
}
function seg(root,label,options,value,onPick){
 const f=el(root,'div',undefined,'ng-field');el(f,'span',label,'ng-field-label');
 const g=el(f,'div',undefined,'ng-seg');g.setAttribute('role','group');g.setAttribute('aria-label',label);
 options.forEach(([v,t])=>{const b=btn(g,t,'ng-seg-btn',()=>onPick(v));b.setAttribute('aria-pressed',String(v===value));});
 return f;
}
function drawNegotiation(body,p){
 const form=el(body,'div',undefined,'ng-form');
 const yrs=yearList().filter(y=>(index.get(selection)||[]).some(x=>x.year===y));if(!yrs.includes(basisYear))basisYear=yrs.includes(year-1)?year-1:year;
 seg(form,'Volumes de référence',yrs.slice(0,4).map(y=>[y,String(y)]),basisYear,v=>{basisYear=v;drawDetail(p);});
 seg(form,'Je simule',[['target','Un nouveau prix'],['discount','Une baisse']],scenarioType,v=>{scenarioType=v;drawDetail(p);});
 if(p.unit!=='L')seg(form,'Négocier le prix',[['litre','au litre'],['unite','par '+p.unit]],mode,v=>{mode=v;drawDetail(p);});
 const unitTxt='€ HT '+(mode==='litre'?'le litre':'par '+p.unit);
 if(scenarioType==='discount')numberInput(field(form,'Baisse obtenue'),discount,'0.01','0,05',unitTxt,v=>{discount=v!==null&&v>=0?v:0;update();});
 else numberInput(field(form,'Prix proposé par le fournisseur'),targetPrice,'0.0001','Prix négocié',unitTxt,v=>{targetPrice=v;update();});
 const direct=directLitres(p);
 if(mode==='litre'){
  const box=field(form,'Litres par '+p.unit,direct!==null?'Conversion automatique':'Ex. : 20 pour un fût de 20 L, 0,75 pour une bouteille');
  const i=numberInput(box,direct!==null?direct:litresPerUnit,'0.01','—','litres',v=>{litresPerUnit=v;update();});
  if(direct!==null){i.readOnly=true;box.classList.add('is-readonly');}
 }
 const result=el(body,'div',undefined,'ng-hero ng-result');
 const rLabel=el(result,'span','','ng-hero-label'),rValue=el(result,'strong','—','ng-hero-value'),rSub=el(result,'span','','ng-hero-sub');
 const compare=el(body,'div',undefined,'ng-compare');
 const note=el(body,'p','','ng-alert');
 const method=el(body,'details',undefined,'ng-method');el(method,'summary','Hypothèses de la simulation');const caveat=el(method,'p');
 function update(){
  const n=negotiation(p);
  rLabel.textContent='Économie sur les achats '+basisYear;
  compare.replaceChildren();note.hidden=true;result.dataset.tone='';
  if(!n.validUnit){rValue.textContent='—';rSub.textContent='Indique le nombre de litres par '+p.unit+' pour négocier au litre.';}
  else if(!n.volume){rValue.textContent='—';rSub.textContent='Aucune quantité exploitable sur '+basisYear+'.';}
  else if(!n.validTarget){rValue.textContent='—';rSub.textContent='Prix moyen payé : '+money(n.avgPrice)+' HT '+(mode==='litre'?'le litre':'par '+p.unit)+'. Saisis le prix proposé pour voir le gain.';}
  else if(n.negative){rValue.textContent='—';rSub.textContent='';note.hidden=false;note.textContent='La baisse dépasse le prix moyen payé : un prix négatif est impossible.';}
  else{
   const up=n.gain>=0;result.dataset.tone=up?'up':'down';
   rValue.textContent=(up?'▲ ':'▼ ')+(up?'':'−')+money(Math.abs(n.gain))+' HT';
   rSub.textContent=(up?'d’économie':'de surcoût')+' · '+fmt.format(n.totalHT?Math.abs(n.gain)/n.totalHT*100:0)+' % du coût d’achat · à volumes '+basisYear+' identiques';
   const col=(title,price,total,cls)=>{const c=el(compare,'div',undefined,'ng-compare-col '+cls);el(c,'span',title,'ng-muted');el(c,'strong',money(price),'ng-compare-price');el(c,'span','HT '+(mode==='litre'?'le litre':'par '+p.unit),'ng-muted');el(c,'span',money(total)+' HT sur '+qty(n.volume)+' '+(mode==='litre'?'litres':p.unit),'ng-compare-total');};
   col('Aujourd’hui (prix moyen payé)',n.avgPrice,n.totalHT,'');
   el(compare,'span','→','ng-arrow').setAttribute('aria-hidden','true');
   col('Après négociation',n.newPrice,n.volume*n.newPrice,'is-new');
  }
  caveat.textContent='Simulation non enregistrée, le tarif réel ne change pas. '+n.monthsKnown+' mois avec achats en '+basisYear+'. '+(n.flagged?n.flagged+' ligne(s) incertaine(s). ':'')+(n.missing?'Prix avec droits manquant sur '+n.missing+' ligne(s). ':'')+'Gain théorique à quantités achetées et prix de vente constants : ce n’est ni un gain de chiffre d’affaires, ni une prévision de ventes. Factures manquantes, avoirs et conditionnements non rapprochés exclus.';
 }
 update();
 btn(body,'Voir l’effet sur la marge au verre →','ng-ghost',()=>{tab='marge';drawDetail(p);});
}
function drawGlass(body,p){
 const n=negotiation(p);
 if(!(n.valid&&!n.negative)){
  const box=el(body,'div',undefined,'ng-card ng-empty-card');
  el(box,'p','Renseigne d’abord le prix négocié dans l’onglet « Négocier ».','ng-card-title');
  el(box,'p','La marge au verre compare le coût matière actuel et le coût négocié pour un verre servi.','ng-muted');
  btn(box,'Aller à Négocier','ng-primary',()=>{tab='negocier';drawDetail(p);});
  return;
 }
 el(body,'p','Repères : une bouteille de 75 cl = 6 verres de 12,5 cl ; un litre de bière = 4 demis de 25 cl.','ng-muted');
 const form=el(body,'div',undefined,'ng-form');
 const directPack=directLitres(p);
 const packBox=field(form,'Litres par '+p.unit,directPack!==null?'Conversion automatique':'Vin : 0,75 · fût : 30 · litre : 1');
 const packI=numberInput(packBox,directPack!==null?directPack:(salePackL!==null?salePackL:litresPerUnit),'0.01','—','litres',v=>{salePackL=v;update();});
 if(directPack!==null){packI.readOnly=true;packBox.classList.add('is-readonly');}
 numberInput(field(form,'Verre servi'),servingCl,'0.5','25','cl',v=>{servingCl=v;update();});
 numberInput(field(form,'Prix du verre à la carte'),salePriceTTC,'0.01','Prix carte','€ TTC',v=>{salePriceTTC=v;update();});
 const vat=el(form,'label',undefined,'ng-field');el(vat,'span','TVA de vente','ng-field-label');
 const vs=el(el(vat,'span',undefined,'ng-input'),'select');[['20','20 % · alcool'],['10','10 %'],['5.5','5,5 %']].forEach(([v,t])=>{const o=el(vs,'option',t);o.value=v;});vs.value=String(saleVat);vs.onchange=()=>{saleVat=Number(vs.value);update();};
 numberInput(field(form,'Pertes (mousse, fonds)'),servingLoss,'1','0','%',v=>{servingLoss=v;update();});
 const result=el(body,'div',undefined,'ng-hero ng-result');
 const rLabel=el(result,'span','Gain par verre servi','ng-hero-label'),rValue=el(result,'strong','—','ng-hero-value'),rSub=el(result,'span','','ng-hero-sub');
 const table=el(body,'div',undefined,'ng-glass');
 const hint=el(body,'p','','ng-muted');
 function update(){
  const g=glassMargin(p,negotiation(p));
  table.replaceChildren();result.dataset.tone='';
  if(!g.ok){rValue.textContent='—';rSub.textContent=!g.pack?'Renseigne les litres par '+p.unit+'.':'Complète le prix du verre, sa taille et les pertes (moins de 100 %).';hint.textContent='';return;}
  const up=g.delta>=0;result.dataset.tone=up?'up':'down';
  rValue.textContent=(up?'▲ ':'▼ ')+(up?'+':'−')+money(Math.abs(g.delta));
  rSub.textContent='Prix du verre : '+money(g.saleHT)+' HT · '+qty(g.yieldGlasses)+' verres par '+p.unit;
  const head=el(table,'div',undefined,'ng-glass-row ng-glass-head');el(head,'span','');el(head,'span','Aujourd’hui');el(head,'span','Après négociation');
  const row=(label,a,b,strong)=>{const r=el(table,'div',undefined,'ng-glass-row'+(strong?' is-strong':''));el(r,'span',label);el(r,'span',a);el(r,'span',b,'is-new');};
  row('Coût matière du verre',money(g.oldCost),money(g.newCost));
  row('Marge brute du verre',money(g.oldMargin),money(g.newMargin),true);
  row('Taux de marge brute',g.oldRate===null?'—':fmt.format(g.oldRate)+' %',g.rate===null?'—':fmt.format(g.rate)+' %');
  hint.textContent='Prix TTC saisi, TVA '+saleVat+' %, pertes '+servingLoss+' %. Hors personnel, frais fixes et autres consommables. Volumes vendus non connus : les achats ne sont pas des ventes.';
 }
 update();
}
function open(event){
 const d=event?.detail||{};
 if(d.reference)search=d.reference;else if(d.name)search=d.name;else if(d.supplier)search=d.supplier;
 page=0;selection='';tab='achats';pane();if(loaded)render();
}
window.addEventListener('prism-open-purchase-analysis',open);
window.PrismPurchaseAnalysis={open:()=>open()};
})();
