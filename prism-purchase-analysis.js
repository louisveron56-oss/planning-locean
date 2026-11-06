/* PRISM — Analyse des achats & simulation de négociation.
 * Zéro vente simulée, chiffres issus exclusivement des lignes d'achats importées.
 * Lecture seule, calcul local et chargement progressif des lots historiques.
 */
(function(){
'use strict';
const API='/.netlify/functions/purchase-analysis';
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const fmt=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const months=['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const num=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const v=Number(String(x).replace(',','.'));return Number.isFinite(v)?v:null;};
const el=(root,tag,text,cls)=>{const v=document.createElement(tag);if(text!==undefined)v.textContent=String(text);if(cls)v.className=cls;if(root)root.appendChild(v);return v;};
const money=x=>euro.format(x||0);
const qty=x=>fmt.format(x||0);
const key=p=>[norm(p.supplier),norm(p.reference),norm(p.unit)].join('|');
let overlay=null,host=null,summary=null,tableHost=null,detailHost=null,loadingHost=null;
let entries=[],index=new Map(),loaded=false,loading=null,ignored={},importedAt='',lineCount=0;
let year=2026,basisYear=2025,search='',supplier='',page=0,selection='',discount=0.03,mode='litre',litresPerUnit=null;
const style=el(document.head,'style',`
.pa-overlay{position:fixed;z-index:99995;inset:0;background:rgba(12,19,28,.74);display:flex;align-items:center;justify-content:center;padding:14px}
.pa-panel{box-sizing:border-box;position:relative;background:#fff;color:#1b2833;font:14px system-ui,sans-serif;border-radius:16px;width:min(1240px,96vw);max-height:94vh;overflow:auto;padding:22px;box-shadow:0 20px 65px #0005}
.pa-panel *{box-sizing:border-box}
.pa-panel h2{font-size:22px;margin:0 0 6px}.pa-panel h3{font-size:17px;margin:0 0 9px}.pa-panel p{line-height:1.45}
.pa-top{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.pa-close,.pa-panel button,.pa-panel select,.pa-panel input{font:inherit}
.pa-panel button,.pa-panel input,.pa-panel select{border:1px solid #c8cdd1;border-radius:7px;padding:8px 10px;background:#fff;color:inherit}
.pa-panel button{cursor:pointer}.pa-panel button:hover{background:#f4f5f7}.pa-panel button:disabled{cursor:default;opacity:.6}
.pa-muted{color:#6c7680;font-size:12px}.pa-warning{color:#a03a32;font-size:12px;font-weight:600}
.pa-filters{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}.pa-filters input{flex:2;min-width:190px}.pa-filters select{min-width:120px;max-width:230px}
.pa-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:12px 0}
.pa-metric{border:1px solid #e4e7e9;padding:12px;border-radius:10px}.pa-metric b{display:block;margin:5px 0;font-size:18px}
.pa-layout{display:grid;grid-template-columns:minmax(340px,1.15fr) minmax(300px,1fr);gap:15px}
.pa-card{border:1px solid #dde2e7;border-radius:10px;padding:13px;min-width:0}.pa-scroll{overflow:auto;max-height:490px}
.pa-table{width:100%;border-collapse:collapse;font-size:12px}.pa-table th,.pa-table td{text-align:left;padding:9px 7px;border-bottom:1px solid #e9edf0;vertical-align:middle}
.pa-table th{position:sticky;top:0;background:#fff;z-index:1}.pa-table td.num{text-align:right;white-space:nowrap}.pa-table button.pa-select{width:100%;text-align:left;border:0;padding:3px;background:transparent;font-weight:600}
.pa-table tr.pa-selected{background:#f2f5f7}.pa-pagination{display:flex;gap:10px;justify-content:center;align-items:center;margin:10px 0}
.pa-chart{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;align-items:end;height:165px;padding:8px 1px 0;border-bottom:1px solid #dfe3e6}
.pa-column{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:end;gap:3px}
.pa-bar{width:min(100%,28px);min-height:1px;background:#5b6b78;border-radius:3px 3px 0 0}
.pa-month{font-size:10px;color:#707b84}.pa-data{font-size:9px;text-align:center;color:#505b67}
.pa-scenario{background:#f7f8f9;border-radius:9px;padding:12px;margin-top:13px}
.pa-scenario-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pa-field{display:flex;flex-direction:column;gap:4px;font-size:12px}
.pa-result{font-size:24px;font-weight:700;margin:10px 0 3px}.pa-pulse{padding:10px 12px;border-radius:9px;background:#f4f5f6;margin-top:12px}
@media(max-width:850px){.pa-layout{grid-template-columns:1fr}.pa-metrics{grid-template-columns:1fr 1fr}.pa-panel{padding:13px}.pa-scenario-grid{grid-template-columns:1fr 1fr}}
`);
style.setAttribute('data-prism','purchase-analysis');
function pane(){
 if(overlay)return;
 overlay=el(document.body,'div',undefined,'pa-overlay');
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 host=el(overlay,'section',undefined,'pa-panel');
 host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Analyse des achats');
 const top=el(host,'div',undefined,'pa-top'),title=el(top,'div');
 el(title,'h2','Analyse des achats & négociation');
 el(title,'p','Quantités achetées, montants HT et simulation d’économies · L’Océan','pa-muted');
 const closeBtn=el(top,'button','Fermer ×','pa-close');closeBtn.onclick=close;
 loadingHost=el(host,'div',undefined,'pa-pulse');
 summary=el(host,'div');tableHost=el(host,'div');
 if(loaded)render();else fetchAll();
}
function close(){overlay?.remove();overlay=null;host=null;summary=null;tableHost=null;detailHost=null;loadingHost=null;}
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
  loadingHost.textContent='Lecture des historiques privés en cours…';
  const manifest=await api('mode=manifest');
  if(!manifest.ready){lineCount=0;entries=[];loaded=true;render();return;}
  lineCount=manifest.rowCount||0;importedAt=manifest.importedAt||'';
  const data=new Map(),loss={invalidDate:0,invalidQuantity:0,invalidPrice:0,missingBatch:0};
  const pages=manifest.totalBatches||0;
  for(let offset=0;offset<pages;offset+=12){
   const result=await api('offset='+offset+'&limit=12');
   for(const part of result.entries||[]){
    const id=part.key,old=data.get(id);
    if(!old)data.set(id,{...part});
    else{
     old.quantity+=part.quantity;old.amountHT+=part.amountHT;old.lines+=part.lines;old.flagged+=part.flagged;old.dutyMissing+=part.dutyMissing;
     for(const s of part.sourceNames||[])if(!old.sourceNames.includes(s))old.sourceNames.push(s);
    }
   }
   for(const k of Object.keys(loss))loss[k]+=result.ignored?.[k]||0;
   if(loadingHost)loadingHost.textContent='Analyse des factures : '+Math.min(offset+12,pages)+' / '+pages+' lots lus…';
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
 })().catch(err=>{if(loadingHost)loadingHost.textContent='Erreur : '+err.message;});
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
 if(loadingHost)loadingHost.textContent=!entries.length?'Aucune ligne exploitable : importe d’abord un historique de factures datées avec quantités et prix HT.':'Historique importé : '+lineCount.toLocaleString('fr-FR')+' lignes · '+index.size.toLocaleString('fr-FR')+' références / conditionnements · analyse en lecture seule.';
 summary.replaceChildren();tableHost.replaceChildren();
 const filters=el(summary,'div',undefined,'pa-filters');
 const q=el(filters,'input');q.type='search';q.placeholder='Cacahuètes, bière, code, fournisseur…';q.value=search;q.oninput=()=>{search=q.value;page=0;drawContent();};
 const years=yearList(),yearSelect=el(filters,'select');yearSelect.setAttribute('aria-label','Année des achats');
 years.forEach(y=>{const o=el(yearSelect,'option',String(y));o.value=String(y);});yearSelect.value=String(year);yearSelect.onchange=()=>{year=Number(yearSelect.value);basisYear=years.includes(year-1)?year-1:year;page=0;selection='';drawContent();};
 const suppliers=[...new Set(entries.map(e=>e.supplier))].sort((a,b)=>a.localeCompare(b,'fr'));
 const select=el(filters,'select');select.setAttribute('aria-label','Fournisseur');
 let all=el(select,'option','Tous les fournisseurs');all.value='';
 suppliers.forEach(s=>{const o=el(select,'option',s);o.value=s;});select.value=supplier;select.onchange=()=>{supplier=select.value;page=0;drawContent();};
 const help=el(summary,'p','Achats positifs uniquement. Montants estimés = quantité facturée × prix unitaire HT importé. Les avoirs, remises de pied de facture, conditionnements inconnus et factures manquantes peuvent modifier le total réel.','pa-muted');
 el(summary,'p','Ventes KSD : non connectées. Les volumes affichés ici sont des volumes achetés, jamais des ventes.','pa-warning');
 const metrics=el(summary,'div',undefined,'pa-metrics');metrics.id='paMetrics';
 const layout=el(tableHost,'div',undefined,'pa-layout');
 const left=el(layout,'section',undefined,'pa-card');el(left,'h3','Produits achetés');
 const results=el(left,'div',undefined,'pa-scroll');results.id='paResults';
 const pager=el(left,'div',undefined,'pa-pagination');pager.id='paPager';
 detailHost=el(layout,'section',undefined,'pa-card');
 drawContent();
}
function drawContent(){
 if(!overlay||!loaded)return;
 const f=productsFor(year).filter(p=>(!supplier||p.supplier===supplier)&&(!search||norm([p.description,p.supplier,p.reference,p.unit,...(p.sourceNames||[])].join(' ')).includes(norm(search))));
 const amount=f.reduce((n,p)=>n+p.amountHT,0),units=f.reduce((n,p)=>n+p.quantity,0);
 const met=document.getElementById('paMetrics');if(met){met.replaceChildren();
  [[String(f.length),'Références / conditionnements'],[money(amount),'Montant HT reconstitué'],[qty(units),'Somme des unités hétérogènes (non comparable)']].forEach(([v,t])=>{const c=el(met,'div',undefined,'pa-metric');el(c,'span',t,'pa-muted');el(c,'b',v);});
 }
 const list=document.getElementById('paResults'),pager=document.getElementById('paPager');
 if(!list||!pager)return;list.replaceChildren();pager.replaceChildren();
 if(!f.length){el(list,'p','Aucun produit pour ces filtres.','pa-muted');detailHost.replaceChildren();return;}
 if(!selection||!f.some(p=>key(p)===selection))selection=key(f[0]);
 const table=el(list,'table',undefined,'pa-table'),thead=el(table,'thead'),tr=el(thead,'tr');
 ['Produit / fournisseur','Quantité','Montant HT','Alertes'].forEach(t=>el(tr,'th',t));
 const body=el(table,'tbody');
 f.slice(page*50,(page+1)*50).forEach(p=>{
  const row=el(body,'tr');if(key(p)===selection)row.className='pa-selected';
  const c=el(row,'td');const button=el(c,'button',p.description,'pa-select');
  el(c,'div',p.supplier+' · réf. '+p.reference+' · '+p.unit,'pa-muted');
  button.onclick=()=>{selection=key(p);drawContent();};
  el(row,'td',qty(p.quantity),'num');el(row,'td',money(p.amountHT),'num');
  el(row,'td',p.flagged?'⚠ '+p.flagged:'—');
 });
 if(f.length>50){
  const prev=el(pager,'button','←');prev.disabled=page===0;prev.onclick=()=>{page--;drawContent();};
  el(pager,'span',(page+1)+' / '+Math.ceil(f.length/50),'pa-muted');
  const next=el(pager,'button','→');next.disabled=(page+1)*50>=f.length;next.onclick=()=>{page++;drawContent();};
 }
 const p=f.find(x=>key(x)===selection)||f[0];drawDetail(p);
}
function drawDetail(p){
 detailHost.replaceChildren();
 el(detailHost,'h3',p.description);
 el(detailHost,'p',p.supplier+' · réf. '+p.reference+' · prix par '+p.unit,'pa-muted');
 const total=el(detailHost,'div',undefined,'pa-metric');
 el(total,'span','Achats '+year,'pa-muted');
 el(total,'b',qty(p.quantity)+' '+p.unit+' · '+money(p.amountHT)+' HT');
 el(total,'span',p.lines+' ligne(s) facturées · prix moyen pondéré '+money(p.amountHT/p.quantity)+' HT / '+p.unit,'pa-muted');
 if(p.flagged||p.dutyMissing||p.unitAssumed)el(detailHost,'p','⚠ Chiffres indicatifs : '+p.flagged+' ligne(s) avec alerte, '+p.dutyMissing+' ligne(s) sans PU avec droits. Vérifier les conditionnements et les factures avant de conclure une négociation.','pa-warning');
 el(detailHost,'p','Répartition mensuelle des achats · '+year,'pa-muted');
 const bars=el(detailHost,'div',undefined,'pa-chart'),max=Math.max(...p.months.map(x=>x.qty),1);
 p.months.forEach((m,i)=>{
  const c=el(bars,'div',undefined,'pa-column');
  el(c,'div',m.qty?qty(m.qty):'','pa-data');
  const bar=el(c,'div',undefined,'pa-bar');bar.style.height=(m.qty?(Math.max(3,m.qty/max*105)):1)+'px';
  bar.title=months[i]+' : '+qty(m.qty)+' '+p.unit+' · '+money(m.amount)+' HT';
  el(c,'div',months[i],'pa-month');
 });
 const scenario=el(detailHost,'div',undefined,'pa-scenario');el(scenario,'h3','Simulateur de négociation');
 el(scenario,'p','Estime une économie en appliquant une réduction au volume effectivement acheté sur l’année de référence, sans projection automatique.','pa-muted');
 const wrap=el(scenario,'div',undefined,'pa-scenario-grid');
 const yrs=yearList().filter(y=>(index.get(selection)||[]).some(x=>x.year===y));if(!yrs.includes(basisYear))basisYear=yrs.includes(year-1)?year-1:year;
 const yearField=el(wrap,'label','Année de référence','pa-field'),yearSel=el(yearField,'select');
 yrs.forEach(y=>{const o=el(yearSel,'option',String(y));o.value=String(y);});yearSel.value=String(basisYear);
 yearSel.onchange=()=>{basisYear=Number(yearSel.value);drawDetail(p);};
 const discountField=el(wrap,'label','Baisse négociée (€ HT)','pa-field'),price=el(discountField,'input');price.type='number';price.min='0';price.step='0.01';price.value=String(discount);
 price.oninput=()=>{const v=num(price.value);discount=v!==null&&v>=0?v:0;update();};
 const modeField=el(wrap,'label','Base de la négociation','pa-field'),unit=el(modeField,'select');
 [['litre','€ / litre'],['unite','€ / unité facturée']].forEach(([v,t])=>{const o=el(unit,'option',t);o.value=v;});
 unit.value=mode;unit.onchange=()=>{mode=unit.value;drawDetail(p);};
 let volumeInput=null;
 if(mode==='litre'){
  const litreField=el(wrap,'label','Litres par unité facturée','pa-field');volumeInput=el(litreField,'input');volumeInput.type='number';volumeInput.min='0.001';volumeInput.step='0.01';
  const direct=p.unit==='L'?1:p.unit==='cl'?0.01:p.unit==='ml'?0.001:null;
  volumeInput.value=litresPerUnit!==null?String(litresPerUnit):direct===null?'':String(direct);
  volumeInput.placeholder='Ex. : 20 pour un fût 20 L';
  if(direct!==null){volumeInput.value=String(direct);volumeInput.readOnly=true;volumeInput.title='Conversion directe de l’unité connue';}
  volumeInput.oninput=()=>{litresPerUnit=num(volumeInput.value);update();};
 }
 const result=el(scenario,'div',undefined,'pa-result'),note=el(scenario,'p',undefined,'pa-muted'),caveat=el(scenario,'p',undefined,'pa-warning');
 function update(){
  const records=(index.get(selection)||[]).filter(x=>x.year===basisYear);
  const q=records.reduce((n,x)=>n+x.quantity,0);
  const monthsKnown=new Set(records.map(x=>x.month)).size;
  const direct=p.unit==='L'?1:p.unit==='cl'?0.01:p.unit==='ml'?0.001:null;
  const liters=mode==='litre'?(direct===null?num(volumeInput?.value):direct):null;
  const valid=mode==='unite'||(liters!==null&&liters>0);
  const volume=mode==='unite'?q:valid?q*liters:0;
  result.textContent=valid?money(volume*discount)+' HT':'—';
  note.textContent=valid?'Économie indicative : '+qty(volume)+' '+(mode==='litre'?'litres':'unités facturées')+' × '+money(discount)+' / '+(mode==='litre'?'L':'unité')+' sur '+basisYear+'.':'Indique le nombre de litres dans chaque '+p.unit+' pour chiffrer une baisse en €/L.';
  const flagged=records.reduce((n,x)=>n+x.flagged,0),missing=records.reduce((n,x)=>n+x.dutyMissing,0);
  caveat.textContent='Période couverte : '+monthsKnown+' mois avec achats enregistrés sur '+basisYear+'. '+(flagged?'⚠ '+flagged+' ligne(s) incertaines. ':'')+(missing?'⚠ Prix avec droits manquant sur '+missing+' ligne(s). ':'')+'Aucune hypothèse sur les ventes KSD, les factures manquantes, avoirs ou volumes futurs.';
 }
 update();
}
function open(event){
 const d=event?.detail||{};
 if(d.name)search=d.name;else if(d.reference)search=d.reference;else if(d.supplier)search=d.supplier;
 page=0;selection='';pane();if(loaded)render();
}
window.addEventListener('prism-open-purchase-analysis',open);
window.PrismPurchaseAnalysis={open:()=>open()};
})();
