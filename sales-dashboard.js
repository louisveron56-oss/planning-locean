/* L'Océan — analyses des ventes, sans modifier les données Google Sheets. */
(function(){
'use strict';
var data=null,loading=false,period='day',anchor=new Date(),ready=false;
var euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
var integer=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
var decimals=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
function number(v){if(typeof v==='number')return Number.isFinite(v)?v:0;return Number(String(v??'').replace(/[\s\u00a0\u202f€]/g,'').replace(',','.'))||0;}
function dateKey(v){var s=String(v??'').trim(),m;if(m=s.match(/^(\d{4})-(\d\d)-(\d\d)/))return m[1]+'-'+m[2]+'-'+m[3];if(m=s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})/))return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return null;}
function fromKey(s){return new Date(s+'T12:00:00');}
function key(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function shift(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function elem(tag,cls,value){var e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;}
function button(label,action){var b=elem('button','sales-action',label);b.type='button';b.addEventListener('click',action);return b;}
function sum(rows,col){return rows.reduce(function(v,r){return v+number(r[col]);},0);}
function rangeFor(d,type){var start=new Date(d),end=new Date(d);if(type==='week'){var weekday=(d.getDay()+6)%7;start=shift(d,-weekday);end=shift(start,6);}if(type==='month'){start=new Date(d.getFullYear(),d.getMonth(),1,12);end=new Date(d.getFullYear(),d.getMonth()+1,0,12);}if(type==='year'){start=new Date(d.getFullYear(),0,1,12);end=new Date(d.getFullYear(),11,31,12);}return {start:start,end:end};}
function pastPeriod(d,type){var x=new Date(d);if(type==='day')x.setDate(x.getDate()-1);if(type==='week')x.setDate(x.getDate()-7);if(type==='month')x.setMonth(x.getMonth()-1,1);if(type==='year')x.setFullYear(x.getFullYear()-1);return x;}
function nextPeriod(d,type,direction){var x=new Date(d);if(type==='day')x.setDate(x.getDate()+direction);if(type==='week')x.setDate(x.getDate()+7*direction);if(type==='month')x.setMonth(x.getMonth()+direction,1);if(type==='year')x.setFullYear(x.getFullYear()+direction);return x;}
function yearPrior(d,type){var x=new Date(d);if(type==='day'||type==='week')x.setDate(x.getDate()-364);else x.setFullYear(x.getFullYear()-1);return x;}
function makeMap(rows){var m=new Map();rows.forEach(function(r){var k=dateKey(r.date);if(k&&String(r.etablissement||'').toLocaleLowerCase('fr').includes('océan'))m.set(k,r);});return m;}
function records(map,range){var list=[];for(var d=new Date(range.start);d<=range.end;d=shift(d,1)){var r=map.get(key(d));if(r)list.push(r);}return list;}
function delta(cur,old){if(!old)return '—';var v=(cur/old-1)*100;return (v>0?'+':'')+decimals.format(v)+' %';}
function periodLabel(r,type){var opts={day:{day:'numeric',month:'long',year:'numeric'},month:{month:'long',year:'numeric'},year:{year:'numeric'}};if(type==='week')return r.start.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' – '+r.end.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});return r.start.toLocaleDateString('fr-FR',opts[type]);}
function card(label,value,sub){var c=elem('div','sales-card');c.appendChild(elem('div','sales-card-label',label));c.appendChild(elem('div','sales-card-value',value));c.appendChild(elem('div','sales-card-sub',sub));return c;}
function buildTable(root,range,map){
 var table=elem('table','sales-table'),head=elem('thead'),hr=elem('tr');
 ['Période','CA TTC','CA HT','Couverts','Ticket moyen','CA N-1'].forEach(function(h){hr.appendChild(elem('th','',h));});head.appendChild(hr);table.appendChild(head);
 var body=elem('tbody'),groups=[],t=period;
 if(t==='year'){for(var i=0;i<12;i++){var d=new Date(range.start.getFullYear(),i,1,12);groups.push({label:d.toLocaleDateString('fr-FR',{month:'long'}),range:rangeFor(d,'month'),base:d});}}
 else if(t==='month'){for(var d=new Date(range.start);d<=range.end;d=shift(d,7)){var r=rangeFor(d,'week'),begin=r.start<range.start?range.start:r.start,finish=r.end>range.end?range.end:r.end;groups.push({label:begin.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})+' – '+finish.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}),range:{start:begin,end:finish},base:begin});}}
 else {for(var d=new Date(range.start);d<=range.end;d=shift(d,1)){groups.push({label:d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}),range:{start:d,end:d},base:d});}}
 var mobileList=elem('div','sales-mobile-periods');
 groups.forEach(function(g){var current=records(map,g.range),compare=records(map,{start:yearPrior(g.range.start,t==='month'?'month':t==='year'?'year':'day'),end:yearPrior(g.range.end,t==='month'?'month':t==='year'?'year':'day')});
 var n=sum(current,'couverts'),weighted=n?current.reduce(function(a,r){return a+number(r.ticket_moyen)*number(r.couverts);},0)/n:0;
 var tr=elem('tr');[g.label,current.length?euro.format(sum(current,'ca_ttc')):'Z absent',current.length?euro.format(sum(current,'ca_ht')):'—',current.length?integer.format(n):'—',current.length?decimals.format(weighted)+' €':'—',compare.length?euro.format(sum(compare,'ca_ttc')):'—'].forEach(function(v){tr.appendChild(elem('td','',v));});body.appendChild(tr);
 var item=elem('article','sales-mobile-month');
 var heading=elem('div','sales-mobile-month-heading');
 heading.appendChild(elem('strong','',g.label));
 heading.appendChild(elem('span','',current.length?'CA TTC':'Sans Z'));
 item.appendChild(heading);
 item.appendChild(elem('div','sales-mobile-month-main',current.length?euro.format(sum(current,'ca_ttc')):'Z absent'));
 var meta=elem('div','sales-mobile-month-meta');
 meta.appendChild(elem('span','',current.length?'HT '+euro.format(sum(current,'ca_ht')):'HT —'));
 meta.appendChild(elem('span','',current.length?integer.format(n)+' couverts':'Couverts —'));
 item.appendChild(meta);mobileList.appendChild(item);
 });table.appendChild(body);var wrap=elem('div','sales-table-wrap');wrap.appendChild(table);root.appendChild(wrap);root.appendChild(mobileList);
}
function salesDailyReset(){period='day';anchor=new Date();if(data?.rows){var valid=data.rows.map(r=>dateKey(r.date)).filter(Boolean).sort();if(valid.length&&key(anchor)>valid[valid.length-1])anchor=fromKey(valid[valid.length-1]);}if(ready)redraw();}
window.addEventListener('prism-open-sales',salesDailyReset);
function redraw(){
 if(!data)return;
 var container=document.querySelector('#module-sales .module-placeholder');if(!container)return;
 var map=makeMap(data.rows);var dates=Array.from(map.keys()).sort();if(!dates.length){container.replaceChildren(elem('p','','Aucune vente disponible dans Jours.'));return;}
 var range=rangeFor(anchor,period),current=records(map,range);
 var previous=records(map,rangeFor(pastPeriod(anchor,period),period));
 var previousYear=records(map,{start:yearPrior(range.start,period),end:yearPrior(range.end,period)});
 var ca=sum(current,'ca_ttc'),covers=sum(current,'couverts'),weighted=covers?current.reduce(function(a,r){return a+number(r.ticket_moyen)*number(r.couverts);},0)/covers:0;
 container.style.display='block';container.style.textAlign='left';container.style.alignItems='stretch';container.replaceChildren();
 var controls=elem('div','sales-controls'),tabs=elem('div','sales-tabs');
 [['day','Jour'],['month','Mois'],['year','Année']].forEach(function(entry){var b=button(entry[1],function(){period=entry[0];redraw();});if(period===entry[0])b.classList.add('selected');tabs.appendChild(b);});controls.appendChild(tabs);
 var nav=elem('div','sales-period-nav');nav.appendChild(button('‹',function(){anchor=nextPeriod(anchor,period,-1);redraw();}));
 nav.appendChild(elem('strong','sales-period-title',periodLabel(range,period)));
 nav.appendChild(button('›',function(){anchor=nextPeriod(anchor,period,1);redraw();}));
 var picker=elem('input','sales-date');picker.type='date';picker.value=key(anchor);picker.title='Choisir une date';picker.addEventListener('change',function(){if(picker.value){anchor=fromKey(picker.value);redraw();}});nav.appendChild(picker);controls.appendChild(nav);container.appendChild(controls);
 var grid=elem('div','sales-stats');
 var caCard=card('Chiffre d’affaires TTC',euro.format(ca),'');
 var caCompare=caCard.querySelector('.sales-card-sub');caCompare.replaceChildren();
 var priorLabel=elem('span','sales-n1-label','N-1');
 caCompare.appendChild(priorLabel);
 if(previousYear.length){
  var priorValue=sum(previousYear,'ca_ttc');
  caCompare.appendChild(elem('span','sales-n1-amount',euro.format(priorValue)));
  var n1delta=elem('span','sales-n1-delta',delta(ca,priorValue));
  n1delta.classList.add(ca>priorValue?'is-positive':ca<priorValue?'is-negative':'is-neutral');
  caCompare.appendChild(n1delta);
 }else caCompare.appendChild(elem('span','sales-n1-missing','Non disponible'));
 grid.appendChild(caCard);
 grid.appendChild(card('CA HT',euro.format(sum(current,'ca_ht')),'Période choisie'));
 grid.appendChild(card('Couverts',integer.format(covers),'N-1 : '+delta(covers,sum(previousYear,'couverts'))));
 grid.appendChild(card('Ticket moyen pondéré',decimals.format(weighted)+' €','Selon couverts et ticket moyen de chaque jour'));
 container.appendChild(grid);
 if(period!=='day'){
  var headline=elem('div','sales-summary');
  headline.appendChild(elem('strong','',current.length+' journée(s) renseignée(s)'));
  headline.appendChild(elem('span','', 'CA vs période précédente : '+delta(ca,sum(previous,'ca_ttc'))+' · CA vs N-1 : '+delta(ca,sum(previousYear,'ca_ttc'))));
  container.appendChild(headline);
  buildTable(container,range,map);
  container.appendChild(elem('p','sales-note','Source : LOCEAN_DATA_API / Jours. Les jours sans Z ne sont pas considérés comme un CA nul. Pour les semaines, N-1 compare les mêmes jours de la semaine, 52 semaines plus tôt.'));
 }
 window.__loceanSalesLatest={period:period,anchor:key(anchor),rows:data.rows};
 window.dispatchEvent(new CustomEvent('locean-sales-update',{detail:window.__loceanSalesLatest}));
}
async function load(force){
 if(loading||(!force&&ready))return;var holder=document.querySelector('#module-sales .module-placeholder');if(!holder)return;
 loading=true;
 var loadingPanel=elem('div','prism-sales-loading');
 loadingPanel.appendChild(elem('div','prism-sales-loading-icon','↗'));
 loadingPanel.appendChild(elem('h3','','Synchronisation des ventes'));
 loadingPanel.appendChild(elem('p','','Connexion sécurisée à tes données KSD…'));
 var retry=button('Réessayer',function(){if(!loading)load(true);});
 retry.style.display='none';loadingPanel.appendChild(retry);
 holder.replaceChildren(loadingPanel);
 var watchdog=setTimeout(function(){
  if(loading){loadingPanel.querySelector('h3').textContent='La connexion prend plus de temps que prévu';
   loadingPanel.querySelector('p').textContent='Le service de ventes ne répond pas encore. Tu peux réessayer ou vérifier le déploiement Netlify.';
   retry.style.display='inline-flex';}
 },9000);
 try{
 var user=window.netlifyIdentity&&netlifyIdentity.currentUser();if(!user)throw new Error('Connexion requise. Recharge la page après identification.');
 var token=await Promise.race([user.jwt(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Session trop lente : reconnecte-toi puis réessaie.')),16000))]);
 var response=await fetch('/.netlify/functions/sales',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(22000)});
 var payload=await response.json();if(!response.ok)throw new Error(payload.error||'Erreur de chargement des ventes');
 if(!Array.isArray(payload.rows))throw new Error('Réponse inattendue de Google Sheets');
 data=payload;ready=true;
 var keys=payload.rows.map(function(r){return dateKey(r.date);}).filter(Boolean).sort();if(keys.length&&key(anchor)>keys[keys.length-1])anchor=fromKey(keys[keys.length-1]);
 redraw();
 }catch(err){var panel=elem('div','prism-sales-loading prism-sales-error');panel.appendChild(elem('div','prism-sales-loading-icon','!'));panel.appendChild(elem('h3','','Données temporairement indisponibles'));panel.appendChild(elem('p','',err.name==='TimeoutError'?'Délai de connexion dépassé. Réessaie ou vérifie le service Netlify.':err.message));panel.appendChild(button('↻ Réessayer',function(){load(true);}));holder.replaceChildren(panel);ready=false;}finally{clearTimeout(watchdog);loading=false;}
}
function sidebarFix(){
 var scroll=document.querySelector('.app-sidebar-scroll'),footer=document.querySelector('.app-sidebar-foot');if(!scroll||!footer)return;
 scroll.appendChild(footer);
 var style=elem('style');style.textContent='.app-sidebar-scroll{min-height:0}.app-sidebar-scroll .app-sidebar-foot{border-top:1px solid var(--app-sidebar-border);margin-top:8px;padding:12px 0 4px}.app-sidebar-scroll .app-sidebar-foot .app-nav-item{margin:1px 0}.app-sidebar-scroll .auth-user.visible{border-top:0;margin-top:2px;padding:4px 0;gap:3px}.app-sidebar-scroll .auth-user-email{padding:0 10px}.app-sidebar-scroll .auth-logout{border:0;border-radius:8px;padding:10px;font-size:12px;color:var(--app-sidebar-text)}.app-sidebar-scroll .auth-logout:hover{color:#fff;background:rgba(255,255,255,.06)}.sales-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.sales-tabs{display:flex;gap:4px;border:1px solid #deded9;background:#f6f5f1;padding:4px;border-radius:10px}.sales-action{border:0;border-radius:7px;background:transparent;color:#45505b;padding:9px 12px;font:600 12px Inter,sans-serif;cursor:pointer}.sales-action:hover{background:#ecebe7}.sales-action.selected{color:#fff;background:#0A3D62}.sales-period-nav{display:flex;align-items:center;gap:8px}.sales-period-title{font-size:13px;min-width:145px;text-align:center}.sales-date{border:1px solid #ddd;border-radius:7px;padding:7px;max-width:145px;background:#fff;color:#273a47}.sales-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}.sales-card{padding:16px;background:#fff;border:1px solid #e4e4df;border-radius:12px}.sales-card-label{color:#777;font-size:11px}.sales-card-value{font-weight:750;font-size:23px;color:#0A3D62;margin:9px 0}.sales-card-sub{font-size:11px;color:#69727d}.sales-summary{margin:20px 0 12px;display:flex;gap:16px;flex-wrap:wrap;font-size:12px}.sales-summary span{color:#6f7580}.sales-table-wrap{overflow-x:auto;background:#fff;border:1px solid #e4e4df;border-radius:10px}.sales-table{width:100%;border-collapse:collapse;font-size:12px;min-width:620px}.sales-table th,.sales-table td{padding:11px 13px;border-bottom:1px solid #eeefed;text-align:right;white-space:nowrap}.sales-table th:first-child,.sales-table td:first-child{text-align:left}.sales-table th{color:#606b74;background:#fafafa}.sales-note{font-size:11px;color:#737b84;margin-top:12px;line-height:1.5}@media(max-width:1050px){.sales-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:630px){.sales-stats{grid-template-columns:1fr}.sales-controls{align-items:stretch}.sales-tabs{justify-content:space-between}.sales-period-nav{flex-wrap:wrap}.sales-period-title{flex:1}}';
 style.textContent+=' .prism-sales-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;min-height:230px;padding:25px 18px;text-align:center;border:1px solid #eae0d3;background:#fffdf9;border-radius:16px;color:#332823}.prism-sales-loading-icon{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:#f1e8dc;color:#806d61;font-size:22px}.prism-sales-loading h3{margin:0;font-size:17px;color:#332823}.prism-sales-loading p{font-size:12px;color:#806d61;line-height:1.5;max-width:370px;margin:0}.prism-sales-loading .sales-action{margin-top:6px;padding:11px 17px;background:#332823;color:#fff;border-radius:9px}.prism-sales-error{min-height:190px}';
 document.head.appendChild(style);
}
function install(){
 sidebarFix();
 var page=document.getElementById('module-sales');if(!page)return;
 var banner=page.querySelector('.data-source-banner');
 if(banner){var pill=banner.querySelector('.data-source-pill');if(pill)pill.textContent='Google Sheets · Lecture seule';var sub=banner.querySelector('.data-source-sub');if(sub)sub.textContent='LOCEAN_DATA_API · Synchronisation depuis les exports KSD';var refresh=button('↻ Actualiser',function(){load(true);});banner.appendChild(refresh);}
 new MutationObserver(function(){if(page.classList.contains('open'))load(false);}).observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('open'))load(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.loadSalesDashboard=load;
var insightsScript=document.createElement('script');insightsScript.src='./sales-insights.js';insightsScript.defer=true;document.head.appendChild(insightsScript);
var performanceScript=document.createElement('script');performanceScript.src='./sales-performance.js';performanceScript.defer=true;document.head.appendChild(performanceScript);
var goalsScript=document.createElement('script');goalsScript.src='./sales-weather-goals.js';goalsScript.defer=true;document.head.appendChild(goalsScript);
var navigationScript=document.createElement('script');navigationScript.src='./sales-navigation.js';navigationScript.defer=true;document.head.appendChild(navigationScript);
var calendarScript=document.createElement('script');calendarScript.src='./sales-calendar.js';calendarScript.defer=true;document.head.appendChild(calendarScript);
var eventsScript=document.createElement('script');eventsScript.src='./sales-events.js';eventsScript.defer=true;document.head.appendChild(eventsScript);
var catalogNavScript=document.createElement('script');catalogNavScript.src='./products-suppliers-navigation.js';catalogNavScript.defer=true;document.head.appendChild(catalogNavScript);
var purchasesScript=document.createElement('script');purchasesScript.src='./purchases-catalog.js';purchasesScript.defer=true;document.head.appendChild(purchasesScript);
var documentsScript=document.createElement('script');documentsScript.src='./purchases-documents.js';documentsScript.defer=true;document.head.appendChild(documentsScript);
var purchaseWorkflowsScript=document.createElement('script');purchaseWorkflowsScript.src='./purchase-workflows.js';purchaseWorkflowsScript.defer=true;document.head.appendChild(purchaseWorkflowsScript);
var supplierHistoryScript=document.createElement('script');supplierHistoryScript.src='./supplier-history.js';supplierHistoryScript.defer=true;document.head.appendChild(supplierHistoryScript);
var invoiceExportScript=document.createElement('script');invoiceExportScript.src='./invoice-export.js';invoiceExportScript.defer=true;document.head.appendChild(invoiceExportScript);
var functionalNavigationScript=document.createElement('script');functionalNavigationScript.src='./prism-functional-navigation.js';functionalNavigationScript.defer=true;document.head.appendChild(functionalNavigationScript);
var mobileUXScript=document.createElement('script');mobileUXScript.src='./mobile-experience.js';mobileUXScript.async=false;document.head.appendChild(mobileUXScript);
var prismThemeScript=document.createElement('script');prismThemeScript.src='./prism-theme.js';prismThemeScript.async=false;document.head.appendChild(prismThemeScript);
})();