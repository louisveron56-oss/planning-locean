/* L'Océan — analyses détaillées des ventes, lecture seule. */
(function(){
'use strict';
var cache={},current=null,busy={};
var money=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
var fmt=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
function num(v){return Number(String(v==null?'':v).replace(/[\s\u00a0\u202f€]/g,'').replace(',','.'))||0;}
function node(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function localDate(s){return new Date(s+'T12:00:00');}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function startEnd(date,period){
 var d=localDate(date),a=new Date(d),b=new Date(d);
 if(period==='week'){a.setDate(d.getDate()-((d.getDay()+6)%7));b=new Date(a);b.setDate(a.getDate()+6);}
 if(period==='month'){a=new Date(d.getFullYear(),d.getMonth(),1,12);b=new Date(d.getFullYear(),d.getMonth()+1,0,12);}
 if(period==='year'){a=new Date(d.getFullYear(),0,1,12);b=new Date(d.getFullYear(),11,31,12);}
 return {from:iso(a),to:iso(b)};
}
function dateValue(v){var s=String(v||'');if(/^\d{4}-\d\d-\d\d/.test(s))return s.slice(0,10);var m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';}
function isOcean(row){return String(row.etablissement||'').toLocaleLowerCase('fr').includes('océan');}
function inPeriod(r,range){var d=dateValue(r.date);return isOcean(r)&&d>=range.from&&d<=range.to;}
function grouping(date,period){
 var d=localDate(date);
 if(period==='year')return date.slice(0,7);
 if(period==='month'){var start=new Date(d);start.setDate(d.getDate()-((d.getDay()+6)%7));return iso(start);}
 return date;
}
function displayGroup(k,period){
 if(period==='year')return localDate(k+'-01').toLocaleDateString('fr-FR',{month:'short'});
 if(period==='month')return localDate(k).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
 return localDate(k).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit'});
}
function blockTitle(text,sub){var outer=node('div','sales-insight-heading');outer.appendChild(node('h3','',text));if(sub)outer.appendChild(node('p','',sub));return outer;}
function bars(outer,items){
 var max=Math.max(...items.map(x=>x.value),1);
 var chart=node('div','sales-bars');
 items.forEach(function(item){
  var line=node('div','sales-bar-row');
  line.appendChild(node('span','sales-bar-name',item.name));
  var track=node('div','sales-bar-track'),fill=node('div','sales-bar-fill');
  fill.style.width=Math.max(0,Math.min(100,item.value/max*100))+'%';
  track.appendChild(fill);line.appendChild(track);
  line.appendChild(node('strong','sales-bar-value',money.format(item.value)));
  chart.appendChild(line);
 });
 outer.appendChild(chart);
}
function timeline(root,context){
 var range=startEnd(context.anchor,context.period),items=context.rows.filter(r=>inPeriod(r,range));
 var map=new Map();items.forEach(function(r){var day=dateValue(r.date),k=grouping(day,context.period);map.set(k,(map.get(k)||0)+num(r.ca_ttc));});
 var entries=[...map].sort((a,b)=>a[0].localeCompare(b[0]));
 var section=node('section','sales-insight-section');
 section.appendChild(blockTitle('Évolution du chiffre d’affaires','Répartition du CA TTC sur la période sélectionnée'));
 if(entries.length)bars(section,entries.map(e=>({name:displayGroup(e[0],context.period),value:e[1]})));
 else section.appendChild(node('p','sales-insight-muted','Aucune journée avec Z sur la période.'));
 root.appendChild(section);
}
function rowsToObjects(first,additional){
 var heads=(first.rows||[])[0]||[];
 var all=[...(first.rows||[]).slice(1),...additional.flatMap(x=>x.rows||[])];
 return all.map(row=>Object.fromEntries(heads.map((h,i)=>[h,row[i]])));
}
async function pageRequest(sheet,start,token){
 var res=await fetch('/.netlify/functions/sales-details?sheet='+encodeURIComponent(sheet)+'&start='+start,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 var data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||'Erreur de lecture '+sheet);
 return data;
}
async function loadDataset(sheet){
 if(cache[sheet]||busy[sheet])return;
 busy[sheet]=true;
 try{
  var user=window.netlifyIdentity&&netlifyIdentity.currentUser();
  if(!user)throw new Error('Connexion nécessaire');
  var token=await user.jwt();
  var first=await pageRequest(sheet,1,token);
  var n=Number(first.totalRows)||1,starts=[];
  for(var s=1001;s<=n;s+=1000)starts.push(s);
  var more=[];
  for(var i=0;i<starts.length;i+=3){
   var batch=await Promise.all(starts.slice(i,i+3).map(s=>pageRequest(sheet,s,token)));
   more.push(...batch);
  }
  cache[sheet]={rows:rowsToObjects(first,more),total:n};
 }catch(e){cache[sheet]={error:e.message};}
 finally{delete busy[sheet];if(current)render(current);}
}
function services(root,context){
 var c=cache.Services,section=node('section','sales-insight-section sales-service-section');
 section.appendChild(blockTitle('Performances des services','Chiffre d’affaires, couverts et ticket moyen — période sélectionnée'));
 if(!c){section.appendChild(node('p','sales-insight-muted','Chargement des performances midi et soir…'));}
 else if(c.error){section.appendChild(node('p','sales-insight-muted','Services indisponibles : '+c.error));}
 else{
  var range=startEnd(context.anchor,context.period),matches=c.rows.filter(r=>inPeriod(r,range));
  var values={Midi:{ca:0,couverts:0,jours:new Set()},Soir:{ca:0,couverts:0,jours:new Set()}};
  matches.forEach(function(r){
   var type=String(r.service||'').trim().toLocaleLowerCase('fr');
   var name=type.includes('midi')?'Midi':type.includes('soir')?'Soir':null;
   if(!name)return;
   var row=values[name];row.ca+=num(r.ca_ttc);row.couverts+=num(r.couverts);row.jours.add(dateValue(r.date));
  });
  var total=values.Midi.ca+values.Soir.ca;
  if(!matches.length)section.appendChild(node('p','sales-insight-muted','Aucun service renseigné pour cette période.'));
  else{
   var cards=node('div','sales-service-cards');
   ['Midi','Soir'].forEach(function(name){
    var v=values[name],card=node('div','sales-service-card');
    var top=node('div','sales-service-top');
    top.appendChild(node('strong','',name==='Midi'?'☀  MIDI':'☾  SOIR'));
    top.appendChild(node('span','',total?(new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(v.ca/total*100)+' % du CA des services'):'—'));
    card.appendChild(top);
    var stats=node('div','sales-service-stats');
    [['CA TTC',money.format(v.ca)],['Couverts',fmt.format(v.couverts)],['Ticket moyen',v.couverts?(new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(v.ca/v.couverts)):'—']].forEach(function(pair){
     var item=node('div','sales-service-stat');
     item.appendChild(node('small','',pair[0]));
     item.appendChild(node('strong','',pair[1]));
     stats.appendChild(item);
    });
    card.appendChild(stats);
    card.appendChild(node('p','sales-service-foot',v.jours.size+' journée(s) de service renseignée(s)'));
    cards.appendChild(card);
   });
   section.appendChild(cards);
   if(total){
    var split=node('div','sales-service-split');
    var mid=node('span','sales-service-mid');mid.style.width=(values.Midi.ca/total*100)+'%';
    var night=node('span','sales-service-night');night.style.width=(values.Soir.ca/total*100)+'%';
    split.appendChild(mid);split.appendChild(night);section.appendChild(split);
   }
   section.appendChild(node('p','sales-insight-muted','Ticket moyen = CA TTC du service ÷ nombre de couverts du service. Les ventes non rattachées à Midi ou Soir sont exclues de la répartition.'));
  }
 }
 root.appendChild(section);
}
function families(root,context){
 var c=cache.Familles,section=node('section','sales-insight-section');
 section.appendChild(blockTitle('Familles de produits','Top 8 des familles par chiffre d’affaires TTC'));
 if(!c){section.appendChild(node('p','sales-insight-muted','Chargement des familles…'));}
 else if(c.error){section.appendChild(node('p','sales-insight-muted','Familles indisponibles : '+c.error));}
 else{
  var range=startEnd(context.anchor,context.period),matches=c.rows.filter(r=>inPeriod(r,range)),map=new Map();
  matches.forEach(function(r){var name=String(r.famille||'').trim();if(name)map.set(name,(map.get(name)||0)+num(r.ca_ttc));});
  var items=[...map].map(x=>({name:x[0],value:x[1]})).sort((a,b)=>b.value-a.value).slice(0,8);
  if(items.length)bars(section,items);else section.appendChild(node('p','sales-insight-muted','Aucune famille renseignée pour cette période.'));
 }
 root.appendChild(section);
}
function render(ctx){
 current=ctx;
 var host=document.querySelector('#module-sales .module-placeholder');if(!host)return;
 var existing=host.querySelector('.sales-insights');if(existing)existing.remove();
 var panel=node('div','sales-insights');panel.appendChild(node('p','sales-insight-label','ANALYSES COMPLÉMENTAIRES'));
 timeline(panel,ctx);services(panel,ctx);families(panel,ctx);
 host.appendChild(panel);
}
function installStyles(){
 var css='.sales-service-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.sales-service-card{border:1px solid #e6e8e5;border-radius:11px;background:#fafbf9;padding:16px;min-width:0}.sales-service-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;color:#0A3D62;font-size:12px}.sales-service-top span{font-weight:500;color:#747c83;font-size:11px}.sales-service-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:18px 0 12px}.sales-service-stat{min-width:0;display:flex;flex-direction:column;gap:6px}.sales-service-stat small{font-size:10px;color:#777f87}.sales-service-stat strong{font-size:19px;letter-spacing:-.02em;color:#0A3D62;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.sales-service-foot{font-size:10px;color:#7b828b;margin:0}.sales-service-split{display:flex;overflow:hidden;height:9px;border-radius:9px;margin:14px 0;background:#eee}.sales-service-mid{background:#d8ad51}.sales-service-night{background:#0A3D62}@media(max-width:850px){.sales-service-cards{grid-template-columns:1fr}}@media(max-width:520px){.sales-service-stat strong{font-size:16px}}.sales-insights{margin-top:24px;display:grid;gap:16px}.sales-insight-label{font-size:10px;font-weight:800;letter-spacing:.12em;color:#747b80}.sales-insight-section{padding:18px;border-radius:12px;background:white;border:1px solid #e6e6df;min-width:0}.sales-insight-heading{margin-bottom:18px}.sales-insight-heading h3{font-size:16px;color:#0A3D62;margin:0;font-weight:750}.sales-insight-heading p{font-size:11px;color:#78818a;margin:5px 0 0}.sales-insight-muted{font-size:11px;color:#7a8088;margin-top:12px}.sales-bars{display:grid;gap:10px}.sales-bar-row{display:grid;grid-template-columns:minmax(80px,150px) minmax(50px,1fr) minmax(68px,110px);gap:10px;align-items:center;min-width:0}.sales-bar-name{font-size:11px;color:#33414b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sales-bar-track{height:12px;background:#efeee9;border-radius:5px;overflow:hidden}.sales-bar-fill{height:100%;background:#0A3D62;border-radius:5px}.sales-bar-value{font-size:11px;font-weight:700;color:#263a48;text-align:right;font-variant-numeric:tabular-nums}@media(max-width:650px){.sales-insight-section{padding:12px}.sales-bar-row{grid-template-columns:minmax(65px,90px) minmax(40px,1fr) minmax(64px,90px);gap:6px}.sales-bar-name,.sales-bar-value{font-size:10px}}';
 var style=node('style');style.textContent=css;document.head.appendChild(style);
}
installStyles();
window.addEventListener('locean-sales-update',function(event){render(event.detail);if(!cache.Services&&!busy.Services)loadDataset('Services');if(!cache.Familles&&!busy.Familles)loadDataset('Familles');});
if(window.__loceanSalesLatest){render(window.__loceanSalesLatest);loadDataset('Services');loadDataset('Familles');}
})();