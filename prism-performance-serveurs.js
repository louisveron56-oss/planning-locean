/* PRISM — performances annuelles KSD, données importées volontairement par l'administrateur.
   Aucun nom/CA de salarié n'est intégré au dépôt ; aucune écriture vers les ratios officiels. */
(function(){
'use strict';
if(window.__prismAnnualServers)return;window.__prismAnnualServers=true;
const KEY='prism-kds-annual-servers-v1';
let data=null,year='2026',family='Toutes',search='',metric='ca',includeTechnical=false,selected=null,loaded=false;
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const eur=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const pct=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
const money=n=>eur.format(n||0);
const el=(tag,cls,t)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(t!==undefined)n.textContent=t;return n};
const number=v=>{const n=Number(String(v||'').trim().replace(/\s/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const tech=name=>!name||/^\d+$/.test(name)||/^(DIR\s*\d+|None)$/i.test(name);
function parseCsv(text,filename){
 let rows=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(line=>line.split(';').map(v=>v.trim()));
 const heading=rows[0]?.[0]||'';
 let y=Number(filename.match(/SERVEURS_(20\d\d)/i)?.[1]);
 if(!y){let m=heading.match(/->.*?(20\d\d)/);y=m?Number(m[1]):0}
 if(!(y>=2020&&y<=2100))throw Error('Année introuvable : '+filename);
 let index={};rows.forEach((r,i)=>{if(['CA Vendeurs','Enc./Vendeurs','Nb / couvert(s) / Serv','Retours Art.','CA Articles par vendeur'].includes(r[0]))index[r[0]]=i});
 if(Object.keys(index).length!==5)throw Error('Structure KSD non reconnue : '+filename);
 const annual=[],families=[],covers=new Map();
 for(let i=index['Nb / couvert(s) / Serv']+1;i<index['Retours Art.'];i++){
  const r=rows[i],name=r[0];if(name&&name!=='moyenne couverts')covers.set(name,number(r[1]));
 }
 for(let i=index['CA Vendeurs']+1;i<index['Enc./Vendeurs'];i++){
  const r=rows[i],name=r[0];if(name&&!name.startsWith('Total'))annual.push([y,name,number(r[1]),number(r[2]),covers.has(name)?covers.get(name):null,heading]);
 }
 let pending=[];
 for(let i=index['CA Articles par vendeur']+1;i<rows.length;i++){
  const r=rows[i],m=r[0].match(/^S\.Tot\s*(.*)$/);if(!m)continue;
  const v=m[1].trim(),fam=v.match(/^(\d{2})-(.*)$/);
  if(fam)pending.push([fam[1],fam[2].trim(),number(r[1]),number(r[2])]);
  else{pending.forEach(p=>families.push([y,v,p[0],p[1],p[2],p[3]]));pending=[]}
 }
 return {annual,families,heading};
}
function normalize(v){
 if(!v||!Array.isArray(v.annual)||!Array.isArray(v.families))throw Error('Format annuel KSD non reconnu.');
 return {annual:v.annual.filter(x=>Array.isArray(x)&&Number(x[0])>2000),families:v.families.filter(x=>Array.isArray(x)&&Number(x[0])>2000)};
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch(e){return false}}
function group(c){const n=Number(c);return n>=2&&n<=14?'Boissons':n>=31&&n<=55?'Nourriture':n===57?'Hôtel':'Autres'}
function aggregate(){
 const a=data.annual.filter(r=>String(r[0])===year);
 return a.filter(r=>includeTechnical||!tech(r[1])).map(r=>{
  const ff=data.families.filter(f=>String(f[0])===year&&f[1]===r[1]);
  const buckets={Boissons:0,Nourriture:0,Hôtel:0,Autres:0};
  ff.forEach(f=>{buckets[group(f[2])]+=Number(f[5])||0});
  return {name:r[1],articles:Number(r[2])||0,ca:Number(r[3])||0,covers:r[4]==null?null:Number(r[4]),families:ff,buckets,source:r[5]};
 });
}
function download(text,filename,mime){
 const blob=new Blob([text],{type:mime||'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function render(){
 const root=document.getElementById('pas-root');if(!root)return;root.replaceChildren();
 const title=el('div','pas-title');title.append(el('h2','','Performance commerciale · Serveurs'),el('p','','Exports KSD annuels — lecture commerciale et simulations personnelles, sans calcul de prime ou de productivité horaire.'));
 root.append(title);
 const help=el('div','pas-help'),file=el('input');file.type='file';file.accept='.csv,.json,text/csv,application/json';file.multiple=true;file.id='pas-upload';
 let label=el('label','pas-import','Importer les exports KSD (.csv) ou le fichier consolidé (.json)');label.htmlFor=file.id;
 file.onchange=async()=>{try{
  let annual=data?.annual?.slice()||[],families=data?.families?.slice()||[];
  for(const f of Array.from(file.files||[])){
   let raw=await f.text(),part=f.name.toLowerCase().endsWith('.json')?normalize(JSON.parse(raw)):parseCsv(raw,f.name);
   const yy=[...new Set(part.annual.map(r=>Number(r[0])))];
   annual=annual.filter(r=>!yy.includes(Number(r[0]))).concat(part.annual);
   families=families.filter(r=>!yy.includes(Number(r[0]))).concat(part.families);
  }
  data=normalize({annual,families});save();year=String(Math.max(...data.annual.map(r=>Number(r[0]))));selected=null;render();
 }catch(e){alert('Import non réalisé : '+(e.message||e))}};
 help.append(label,file);
 if(data){
  help.append(el('span','pas-muted','Données conservées sur cet appareil uniquement. Pas encore synchronisées avec Google Sheets.'));
  const clear=el('button','pas-button','Effacer les données locales');clear.onclick=()=>{if(confirm('Effacer les données KSD de cet appareil ?')){localStorage.removeItem(KEY);data=null;render()}};help.append(clear);
  const exportBtn=el('button','pas-button','Exporter la base JSON');exportBtn.onclick=()=>download(JSON.stringify(data),'prism-performances-serveurs.json','application/json');help.append(exportBtn);
 }
 root.append(help);
 if(!data){root.append(el('p','pas-notice','Importe les 3 exports KSD 2024, 2025 et 2026 d’un seul coup, ou le fichier JSON consolidé fourni. Aucun résultat individuel n’est publié dans le code de Prism.'));return}
 const ys=[...new Set(data.annual.map(r=>String(r[0])))].sort(),controls=el('div','pas-controls');
 const yearSelect=el('select');ys.forEach(y=>{let o=el('option','',y);o.value=y;yearSelect.append(o)});if(!ys.includes(year))year=ys[ys.length-1];yearSelect.value=year;yearSelect.onchange=()=>{year=yearSelect.value;selected=null;render()};controls.append(yearSelect);
 const famSelect=el('select');['Toutes','Boissons','Nourriture','Hôtel','Autres'].forEach(f=>{let o=el('option','',f==='Toutes'?'Toutes les familles':f);o.value=f;famSelect.append(o)});famSelect.value=family;famSelect.onchange=()=>{family=famSelect.value;render()};controls.append(famSelect);
 const sort=el('select');[['ca','CA attribué'],['articles','Quantités'],['covers','Couverts'],['name','Nom']].forEach(([v,l])=>{let o=el('option','',l);o.value=v;sort.append(o)});sort.value=metric;sort.onchange=()=>{metric=sort.value;render()};controls.append(sort);
 let input=el('input');input.type='search';input.placeholder='Rechercher un serveur';input.value=search;input.oninput=()=>{search=input.value;render();let q=root.querySelector('input[type=search]');q?.focus();q?.setSelectionRange(q.value.length,q.value.length)};controls.append(input);
 const toggle=el('label','pas-toggle');let ck=el('input');ck.type='checkbox';ck.checked=includeTechnical;ck.onchange=()=>{includeTechnical=ck.checked;render()};toggle.append(ck,el('span','','Afficher les comptes techniques'));controls.append(toggle);
 root.append(controls);
 const all=aggregate(),shown=all.filter(r=>(!search||r.name.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))));
 const val=x=>family==='Toutes'?x.ca:x.buckets[family],total=shown.reduce((s,x)=>s+val(x),0),sum=shown.reduce((s,x)=>s+x.articles,0),covers=shown.reduce((s,x)=>s+Math.max(0,x.covers||0),0);
 const stats=el('div','pas-stats');[[shown.length,'Comptes affichés'],[money(total),'CA TTC attribué'+(family==='Toutes'?'':' · '+family)],[nf.format(sum),'Articles (toutes familles)'],[nf.format(covers),'Couverts enregistrés']].forEach(([v,l])=>{let c=el('div','pas-stat');c.append(el('strong','',String(v)),el('small','',l));stats.append(c)});root.append(stats);
 let note=el('p','pas-notice','Source KSD : '+(all[0]?.source||'export annuel')+'. 2026 est une période partielle. Les CA sont attribués aux comptes de caisse (TTC présumé), et non une mesure de performance par heure. Les identifiants distincts (ISMAEL/ISMAÏL, MARTIN/MARTIN F…) ne sont jamais fusionnés automatiquement.');
 root.append(note);
 const sorted=shown.sort((a,b)=>metric==='name'?a.name.localeCompare(b.name,'fr'):(metric==='ca'?val(b)-val(a):metric==='covers'?(b.covers||0)-(a.covers||0):b.articles-a.articles));
 let tblwrap=el('div','pas-scroll'),table=el('table','pas-table'),thead=el('thead'),tr=el('tr');
 ['Serveur KSD','CA attribué','Poids dans la sélection','Articles','Couverts','CA / couvert','Détail'].forEach(h=>tr.append(el('th','',h)));thead.append(tr);table.append(thead);
 let tbody=el('tbody');
 sorted.forEach(r=>{
  const row=el('tr'),cv=r.covers>0?money(r.ca/r.covers):'—';
  [r.name,money(val(r)),total?(pct.format(val(r)/total*100)+' %'):'—',nf.format(r.articles),r.covers==null?'—':nf.format(r.covers),cv].forEach(v=>row.append(el('td','',v)));
  let cell=el('td'),b=el('button','pas-button',selected===r.name?'Masquer':'Explorer');b.onclick=()=>{selected=selected===r.name?null:r.name;render()};cell.append(b);row.append(cell);tbody.append(row);
 });table.append(tbody);tblwrap.append(table);root.append(tblwrap);
 if(selected){let r=shown.find(x=>x.name===selected);if(r){
  let detail=el('div','pas-detail');detail.append(el('h3','',selected+' · familles de ventes '+year));
  let arr=r.families.filter(f=>family==='Toutes'||group(f[2])===family).sort((a,b)=>b[5]-a[5]);
  let max=Math.max(1,...arr.map(f=>f[5]));arr.forEach(f=>{let line=el('div','pas-bar-line'),name=el('span','',f[3]),track=el('div','pas-bar-track'),fill=el('div','pas-bar-fill'),v=el('strong','',money(f[5]));fill.style.width=Math.max(0,f[5]/max*100)+'%';track.append(fill);line.append(name,track,v);detail.append(line)});
  let future=el('p','pas-muted','Les objectifs et paliers seront des simulations distinctes des ventes réelles. Pour des comparaisons équitables, il faudra intégrer les heures réellement travaillées.');detail.append(future);root.append(detail);
 }}
 let csv=el('button','pas-button','Exporter cette sélection en CSV');csv.onclick=()=>{
  let lines=[['annee','compte_ksd','famille_filtre','ca_ttc','quantite_articles','couverts','ca_par_couvert'],...sorted.map(x=>[year,x.name,family,val(x),x.articles,x.covers??'',x.covers>0?x.ca/x.covers:''])];
  download(lines.map(a=>a.map(v=>String(v).includes(';')?'"'+String(v).replace(/"/g,'""')+'"':v).join(';')).join('\n'),'prism-serveurs-'+year+'.csv','text/csv;charset=utf-8');
 };root.append(csv);
}
function mount(){
 const sec=document.getElementById('module-teamperf');if(!sec)return false;
 const shell=sec.querySelector('.module-shell')||sec,old=shell.querySelectorAll('.module-lead,.future-panel-grid,.module-placeholder');
 old.forEach(x=>x.style.display='none');
 const root=el('div','pas-root');root.id='pas-root';shell.prepend(root);
 let css=el('style');css.textContent='.pas-root{max-width:1320px;color:#302b26}.pas-title h2{font-size:21px;margin:4px 0}.pas-title p,.pas-muted{font-size:12px;color:#81776e}.pas-help,.pas-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:18px 0}.pas-import,.pas-button{font:inherit;font-size:12px;border:1px solid #cbbfac;padding:10px 12px;border-radius:8px;background:#fff;color:#43372c;cursor:pointer}.pas-import{background:#ede6dc;font-weight:600}.pas-help input[type=file]{position:absolute;left:-9999px}.pas-controls input[type=search],.pas-controls select{font-size:12px;padding:10px;background:#fff;color:#2e2925;border:1px solid #d5ccbe;border-radius:8px;min-width:125px}.pas-controls input[type=search]{flex:1}.pas-toggle{font-size:11px;display:flex;gap:7px;align-items:center}.pas-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.pas-stat{border:1px solid #ded6ca;padding:14px;background:#fff;border-radius:10px;display:flex;flex-direction:column;gap:5px}.pas-stat strong{font-size:19px}.pas-stat small{font-size:10px;color:#777}.pas-notice{margin:16px 0;padding:12px;background:#f8f0e7;color:#785d43;border-radius:8px;font-size:11px;line-height:1.6}.pas-scroll{overflow:auto;border:1px solid #ded6ca;border-radius:10px;background:#fff}.pas-table{width:100%;border-collapse:collapse;font-size:12px}.pas-table th{background:#f5f1eb;color:#675d52}.pas-table td,.pas-table th{text-align:left;padding:10px;border-bottom:1px solid #eee7dd;white-space:nowrap}.pas-detail{border:1px solid #ded6ca;border-radius:10px;margin:16px 0;padding:16px;background:#fff}.pas-detail h3{font-size:16px}.pas-bar-line{display:grid;grid-template-columns:minmax(130px,200px) 1fr 100px;gap:12px;align-items:center;font-size:11px;margin:9px 0}.pas-bar-track{height:10px;background:#eee9e2;border-radius:9px;overflow:hidden}.pas-bar-fill{height:100%;background:#85725f}.pas-bar-line strong{text-align:right}@media(max-width:850px){.pas-stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:540px){.pas-stats{grid-template-columns:1fr}.pas-bar-line{grid-template-columns:100px 1fr 75px}}';document.head.append(css);
 try{let saved=localStorage.getItem(KEY);if(saved)data=normalize(JSON.parse(saved))}catch(e){}
 const ob=new MutationObserver(()=>{if(sec.classList.contains('open')&&!loaded){loaded=true;render()}});
 ob.observe(sec,{attributes:true,attributeFilter:['class']});render();return true;
}
function start(){if(!mount())setTimeout(start,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();