/* PRISM Menu Engineering V1 — lecture seule, ventes KSD, sans coût matière estimé.
 * Utilise la même API sécurisée que Ventes par article ; aucun changement des fiches de Claude.
 * L'expression « popularité » signifie volume de ventes, pas rentabilité.
 */
(function(){
'use strict';
if(window.__prismMenuEngineeringSales)return;window.__prismMenuEngineeringSales=true;
const SECTION='module-menuengineering',API='/.netlify/functions/sales-details';
const euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const integer=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const percent=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
let dataset=null,loading=false,error='',selection={year:null,family:'Toutes',query:'',sort:'qte'};
function el(tag,cls,value){let x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x}
function number(x){let n=Number(String(x==null?'':x).replace(/[\s\u00a0\u202f€]/g,'').replace(',','.'));return Number.isFinite(n)?n:0}
function valid(x){return x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(Number(String(x).replace(',','.')))}
function iso(raw){let t=String(raw||'').trim(),m=t.match(/^(\d\d?)\/(\d\d?)\/(\d{4})/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');if(/^\d{4}-\d\d-\d\d/.test(t))return t.slice(0,10);return ''}
async function batch(sheet,start,token){
 const res=await fetch(API+'?sheet='+encodeURIComponent(sheet)+'&start='+start,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 const body=await res.json().catch(()=>({}));if(!res.ok)throw Error(body.error||'Lecture KSD indisponible');return body;
}
async function load(){
 if(loading)return;loading=true;error='';render();
 try{
  const user=window.netlifyIdentity?.currentUser();if(!user)throw Error('Connexion Prism nécessaire');
  const token=await user.jwt();
  const first=await batch('Ventes_Articles',1,token);let rows=(first.rows||[]).slice(),total=Number(first.totalRows)||rows.length;
  if(total>21000)throw Error('Volume des ventes au-delà de la pagination autorisée : contacter le développeur.');
  for(let start=1001;start<=total;start+=1000){let p=await batch('Ventes_Articles',start,token);rows.push(...(p.rows||[]));}
  const heads=rows.shift()||[];
  dataset=rows.map(row=>{let o={};heads.forEach((h,i)=>o[String(h)]=row[i]);return o});
  const ys=years();selection.year=ys[ys.length-1]||null;
 }catch(e){error=e.message||String(e);}finally{loading=false;render();}
}
function years(){return [...new Set((dataset||[]).map(r=>Number(r.annee)).filter(y=>y>=2020&&y<=2100))].sort((a,b)=>a-b)}
function cutoff(year){let max='';for(const r of dataset||[]){if(Number(r.annee)!==year)continue;let d=iso(r.jusqu_au);if(d>max)max=d;}return max;}
function aggregate(year){
 const map=new Map();
 for(const r of dataset||[]){
  if(Number(r.annee)!==year||String(r.categorie||'').trim().toLowerCase()!=='nourriture')continue;
  const id=String(r.id_article??'').trim();if(!id)continue;
  const name=String(r.article||'Article sans nom').trim(),family=String(r.famille||'Sans famille').trim()||'Sans famille';
  let item=map.get(id);
  if(!item){item={id,name,family,qte:0,ca:0,ht:0,hasHT:true};map.set(id,item)}
  item.qte+=number(r.quantite);item.ca+=number(r.ca_ttc);
  if(valid(r.ca_ht))item.ht+=number(r.ca_ht);else item.hasHT=false;
 }
 return [...map.values()];
}
function button(label,fn,cls){const b=el('button',cls||'pme-btn',label);b.type='button';b.onclick=fn;return b}
function panel(label,value,foot){let x=el('div','pme-kpi');x.append(el('small','',label),el('strong','',value),el('span','',foot));return x}
function render(){
 const shell=document.getElementById('pme-sales-root');if(!shell)return;shell.replaceChildren();
 let top=el('div','pme-head');top.append(el('h2','','Menu Engineering · Popularité des ventes'),el('p','','Classement commercial des plats à partir des ventes KSD. Les fiches techniques et les coûts matière restent indépendants.'));
 shell.append(top);
 if(loading){shell.append(el('p','pme-note','Chargement des données KSD…'));return}
 if(error){shell.append(el('p','pme-error',error),button('Réessayer',()=>{dataset=null;load()}));return}
 if(!dataset)return;
 const ys=years();if(!ys.length){shell.append(el('p','pme-note','Aucune donnée Ventes_Articles accessible.'));return}
 if(!ys.includes(selection.year))selection.year=ys[ys.length-1];
 const all=aggregate(selection.year).filter(x=>x.qte>0||x.ca>0);
 const families=[...new Set(all.map(x=>x.family))].sort((a,b)=>a.localeCompare(b,'fr'));
 let controls=el('div','pme-controls');
 let year=el('select');year.setAttribute('aria-label','Année');
 ys.forEach(y=>{let o=el('option','',String(y));o.value=String(y);year.append(o)});year.value=String(selection.year);year.onchange=()=>{selection.year=Number(year.value);selection.family='Toutes';render()};
 let family=el('select');family.setAttribute('aria-label','Famille');
 ['Toutes',...families].forEach(f=>{let o=el('option','',f==='Toutes'?'Toutes les familles':f);o.value=f;family.append(o)});if(!families.includes(selection.family))selection.family='Toutes';family.value=selection.family;family.onchange=()=>{selection.family=family.value;render()};
 let q=el('input');q.type='search';q.placeholder='Rechercher un plat';q.value=selection.query;q.setAttribute('aria-label','Rechercher un plat');
 q.oninput=()=>{selection.query=q.value;render();let next=shell.querySelector('input[type=search]');next?.focus();next?.setSelectionRange(next.value.length,next.value.length)};
 let sort=el('select');sort.setAttribute('aria-label','Classement');
 [['qte','Quantités vendues'],['ca','CA HT connu'],['name','Nom du plat']].forEach(([id,label])=>{let o=el('option','',label);o.value=id;sort.append(o)});sort.value=selection.sort;sort.onchange=()=>{selection.sort=sort.value;render()};
 controls.append(year,family,q,sort);shell.append(controls);
 const filtered=all.filter(x=>(selection.family==='Toutes'||x.family===selection.family)&&(!selection.query||[x.name,x.family,x.id].join(' ').toLocaleLowerCase('fr').includes(selection.query.toLocaleLowerCase('fr'))));
 const qty=filtered.reduce((s,x)=>s+x.qte,0),totalKnownHT=filtered.filter(x=>x.hasHT).reduce((s,x)=>s+x.ht,0),unknown=filtered.filter(x=>!x.hasHT).length;
 const ranked=filtered.slice().sort((a,b)=>b.qte-a.qte||a.name.localeCompare(b.name,'fr'));
 const n=ranked.length,topCount=Math.max(1,Math.ceil(n*.2)),top20=ranked.slice(0,topCount),topQuantity=top20.reduce((s,x)=>s+x.qte,0);
 const totalQty=ranked.reduce((s,x)=>s+x.qte,0);
 const until=cutoff(selection.year),isFull=until>=selection.year+'-12-31';
 let metrics=el('div','pme-kpis');
 metrics.append(panel('Références vendues',integer.format(n),'Famille et recherche sélectionnées'),panel('Quantités',integer.format(qty),'Unités KSD, options à vérifier'),panel('CA HT documenté',unknown?'Partiel':euro.format(totalKnownHT),unknown?unknown+' références sans CA HT':'Hors rentabilité'),panel('Part du top 20 %',totalQty?percent.format(topQuantity/totalQty*100)+' %':'—',topCount+' références les plus vendues'));
 shell.append(metrics);
 let banner=el('p','pme-notice','Période '+selection.year+(until?' · données jusqu’au '+until:' · date de fin non renseignée')+(isFull?' · année déclarée complète':' · année incomplète ou non confirmée')+'. Popularité uniquement : aucune marge calculée. Les formules, suppléments et éventuels doublons de codes KSD doivent être vérifiés avant décision.');
 shell.append(banner);
 let prevYear=selection.year-1,prevMap=new Map(aggregate(prevYear).map(x=>[x.id,x])),comparable=isFull&&cutoff(prevYear)>=prevYear+'-12-31';
 let count=el('h3','','Classement des plats · '+n+' références');shell.append(count);
 let wrap=el('div','pme-table-wrap'),table=el('table','pme-table'),thead=el('thead'),hr=el('tr');
 ['#','Plat / famille','Qté','CA HT','Part des volumes','Qté N-1'].forEach(t=>hr.append(el('th','',t)));thead.append(hr);table.append(thead);
 let body=el('tbody');
 const ordered=selection.sort==='ca'?filtered.slice().sort((a,b)=>(b.hasHT?b.ht:-Infinity)-(a.hasHT?a.ht:-Infinity)):selection.sort==='name'?filtered.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')):ranked;
 let shown=ordered.slice(0,150);
 shown.forEach((item,i)=>{
  let tr=el('tr'),prev=prevMap.get(item.id),n1=comparable&&prev&&prev.qte>0?((item.qte/prev.qte-1)*100):null;
  let portion=qty?item.qte/qty*100:0;
  [integer.format(i+1),item.name+' · '+item.family,integer.format(item.qte),item.hasHT?euro.format(item.ht):'—',percent.format(portion)+' %',n1===null?'—':(n1>=0?'+':'')+percent.format(n1)+' %'].forEach((v,k)=>tr.append(el('td',k>1?'pme-num':'',v)));body.append(tr);
 });
 table.append(body);wrap.append(table);shell.append(wrap);
 if(ordered.length>150)shell.append(el('p','pme-note','Affichage limité aux 150 premières références. Affine les filtres pour accéder aux autres.'));
 if(!comparable)shell.append(el('p','pme-note','Évolution N-1 masquée : la période de comparaison n’est pas confirmée comme complète sur les deux années.'));
 shell.append(el('p','pme-note','Source : Google Sheets Ventes_Articles, via la même API sécurisée que Ventes par article. Les archives recettes et coûts techniques ne sont pas modifiés.'));
}
function mount(){
 const sec=document.getElementById(SECTION);if(!sec)return false;
 if(document.getElementById('pme-sales-root'))return true;
 const existing=sec.querySelector('.module-shell')||sec;
 const root=el('div','pme-sales-root');root.id='pme-sales-root';existing.prepend(root);
 const older=existing.querySelectorAll('.me-kpis,.me-cards,.module-placeholder,.me-actions,.module-lead');
 older.forEach(node=>{node.dataset.pmeHidden='1';node.style.display='none'});
 const style=el('style');style.textContent='.pme-sales-root{max-width:1320px;margin:auto;color:#322d28}.pme-head h2{font-size:22px;margin:8px 0}.pme-head p,.pme-note{font-size:12px;color:#81776d;line-height:1.55}.pme-controls{display:flex;flex-wrap:wrap;gap:9px;margin:20px 0}.pme-controls select,.pme-controls input{background:#fff;color:#292522;border:1px solid #ded6cc;padding:10px 12px;border-radius:8px;font-size:12px;min-width:145px}.pme-controls input{flex:1}.pme-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.pme-kpi{background:#fff;border:1px solid #e4ddd4;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:6px}.pme-kpi small{font-size:11px;color:#766f66}.pme-kpi strong{font-size:22px}.pme-kpi span{font-size:10px;color:#857d74}.pme-notice{font-size:11px;color:#78644b;background:#f7f0e6;border-radius:9px;padding:13px;line-height:1.6;margin:16px 0}.pme-sales-root h3{font-size:15px;margin:18px 0 12px}.pme-table-wrap{overflow:auto;border:1px solid #e3ddd4;border-radius:12px;background:#fff}.pme-table{border-collapse:collapse;width:100%;font-size:12px}.pme-table th,.pme-table td{padding:11px 12px;border-bottom:1px solid #eee8e0;text-align:left}.pme-table th{background:#f7f4ef;font-size:11px;white-space:nowrap}.pme-table td.pme-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.pme-table tr:last-child td{border:0}.pme-error{color:#a43d2b}.pme-btn{border:1px solid #a69b8e;padding:10px 13px;border-radius:8px;background:#fff;cursor:pointer}@media(max-width:920px){.pme-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.pme-kpis{grid-template-columns:1fr}}';document.head.append(style);
 const observer=new MutationObserver(()=>{if(sec.classList.contains('open')&&!dataset&&!loading)load()});
 observer.observe(sec,{attributes:true,attributeFilter:['class']});
 if(sec.classList.contains('open'))load();
 return true;
}
function start(){if(!mount())setTimeout(start,300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();