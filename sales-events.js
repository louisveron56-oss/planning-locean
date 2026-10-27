/* Vue Jour des ventes : événements enregistrés par le planning, dont rugby RCV. */
(function(){
'use strict';
var state=null;
var MONTHS={janvier:1,fevrier:2,mars:3,avril:4,mai:5,juin:6,juillet:7,aout:8,septembre:9,octobre:10,novembre:11,decembre:12};
function compact(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function element(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function dateISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function monday(date){var d=new Date(date+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return dateISO(d);}
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
function matchingDates(ev,week){
 var direct=String(ev._sortDate||ev.dateISO||ev.startDate||'');
 if(/^\d{4}-\d{2}-\d{2}/.test(direct))return [direct.slice(0,10)];
 var title=compact(ev.date||'');
 var iso=title.match(/(?:^|[^\d])(\d{4})-(\d{2})-(\d{2})(?:[^\d]|$)/);
 if(iso)return [iso[1]+'-'+iso[2]+'-'+iso[3]];
 var fr=title.match(/(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{4}))?/);
 if(fr)return [(fr[3]||week.slice(0,4))+'-'+fr[2].padStart(2,'0')+'-'+fr[1].padStart(2,'0')];
 var named=title.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b(?:\s+(\d{4}))?/);
 if(named)return [(named[3]||week.slice(0,4))+'-'+String(MONTHS[named[2]]).padStart(2,'0')+'-'+named[1].padStart(2,'0')];
 if(ev.type==='school_holiday'||/semaine concernee/.test(title))return ['week'];
 return [];
}
function dayEvents(date){
 var wk=monday(date),stored=localStorage.getItem('locean_events_'+wk),manual=localStorage.getItem('locean_manual_events_'+wk);
 var search=stored?read('locean_events_'+wk):null;
 var a=(Array.isArray(search?.events)?search.events:[]).concat(Array.isArray(read('locean_manual_events_'+wk))?read('locean_manual_events_'+wk):[]);
 var unique=new Map();
 a.forEach(function(ev){
  if(!ev||ev.type==='weather_context')return;
  var dates=matchingDates(ev,wk);
  if(dates.includes(date)||dates.includes('week')){
   var id=compact(ev.name)+'|'+String(ev._sortDate||ev.date||'');
   if(!unique.has(id))unique.set(id,ev);
  }
 });
 var rank=function(e){return e.type==='rcv_home'?0:e.type==='rcv_home_relocated'?1:e.type==='major_sports_broadcast'?2:e.impact==='high'?3:e.type==='rcv_away'?4:5;};
 (VERIFIED_RUGBY_FIXTURES[date]||[]).forEach(function(match){
  var equivalent=[...unique.values()].some(function(ev){
   var n=compact(ev.name||'');
   return n.includes('vannes')&&n.includes('clermont')&&/^rcv_/.test(String(ev.type||''));
  });
  if(!equivalent)unique.set('confirmed-fixture-'+date,match);
 });
 return {events:[...unique.values()].sort((a,b)=>rank(a)-rank(b)),searched:stored!==null,week:wk};
}
/* Match historique confirmé : LNR et Rugby Club Vannes (J7 Top 14 2026-2027).
   Le 19 octobre est la date de début de semaine du planning, pas le jour du match. */
var VERIFIED_RUGBY_FIXTURES={
 '2026-10-24':[{
  type:'rcv_home',name:'🏉 RC Vannes – ASM Clermont',
  date:'samedi 24 octobre · 14h30',lieu:'Stade de la Rabine — Vannes',
  impact:'high',note:'Top 14 · 7e journée · match à domicile',
  _sortDate:'2026-10-24T14:30:00',
  url:'https://top14.lnr.fr/feuille-de-match/2026-2027/j7/11862-vannes-clermont',
  verified:true
 }]
};
function rugbyDetail(ev){
 if(!/^rcv_/.test(String(ev.type||'')))return null;
 if(ev.type==='rcv_home')return 'À domicile · affluence locale potentielle';
 if(ev.type==='rcv_home_relocated')return 'Domicile délocalisé · impact local à vérifier';
 return 'À l’extérieur · effet local indirect';
}
function render(){
 var host=document.querySelector('#module-sales .module-placeholder');if(!host)return;
 var existing=host.querySelector('.sales-day-events');if(existing)existing.remove();
 if(!state||state.period!=='day')return;
 var data=dayEvents(state.anchor),panel=element('section','sales-day-events');
 var top=element('div','sales-day-events-top');
 top.appendChild(element('strong','','Événements du jour'));
 var jump=element('button','sales-day-events-jump','Voir le planning ↗');jump.type='button';
 jump.addEventListener('click',function(){if(typeof window.navigateApp==='function')window.navigateApp('planning');});
 top.appendChild(jump);panel.appendChild(top);
 if(data.events.length){
  var list=element('div','sales-day-events-list');
  data.events.slice(0,6).forEach(function(ev){
   var row=element('div','sales-day-event'),dot=element('span','sales-day-event-impact '+(ev.impact||'low'),'●');
   row.appendChild(dot);
   var contents=element('div','sales-day-event-text');
   contents.appendChild(element('strong','',String(ev.name||'Événement')));
   // Le planning fournit déjà pour RCV l'affiche, la date et l'heure réelle.
   var secondary=[String(ev.date||'').trim(),String(ev.lieu||'').trim()].filter(Boolean).join(' · ');
   if(secondary)contents.appendChild(element('small','',secondary));
   var rugby=rugbyDetail(ev);
   if(rugby)contents.appendChild(element('span','sales-day-event-context',rugby));
   if(ev.verified)contents.appendChild(element('span','sales-day-event-context','Match confirmé · source LNR / RC Vannes'));
   row.appendChild(contents);list.appendChild(row);
  });
  panel.appendChild(list);
  if(data.events.length>6)panel.appendChild(element('p','sales-day-events-note','+'+(data.events.length-6)+' autre(s) événement(s) enregistrés.'));
 }else panel.appendChild(element('p','sales-day-events-note',data.searched?'Aucun événement précisément daté ce jour dans la recherche enregistrée.':'Cette semaine n’a pas encore d’événements recherchés et enregistrés sur cet appareil.'));
 panel.appendChild(element('p','sales-day-events-caption','Données du planning · semaine du '+data.week+' · les horaires restent ceux de la source, sans estimation.'));
 var cards=host.querySelector('.sales-stats');if(cards)cards.insertAdjacentElement('afterend',panel);else host.appendChild(panel);
 if(typeof window.applyLoceanSalesTabs==='function')window.applyLoceanSalesTabs();
}
var st=element('style');
st.textContent='.sales-day-events{border:1px solid #e6e8e3;border-radius:11px;background:white;margin-top:12px;padding:13px 17px}.sales-day-events-top{display:flex;justify-content:space-between;gap:12px;align-items:center;color:#0A3D62;font-size:13px}.sales-day-events-jump{background:transparent;border:0;color:#0A3D62;font-size:11px;font-weight:650;cursor:pointer}.sales-day-events-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 17px;margin-top:12px}.sales-day-event{display:flex;gap:8px;min-width:0}.sales-day-event-impact{color:#adb3b8;font-size:14px;flex:0 0 auto}.sales-day-event-impact.high{color:#c63b3b}.sales-day-event-impact.medium{color:#d99a1c}.sales-day-event-text{display:flex;flex-direction:column;gap:4px;min-width:0}.sales-day-event-text strong{font-size:12px;color:#243746}.sales-day-event-text small{font-size:11px;color:#66737c;line-height:1.4}.sales-day-event-context{font-size:10px;color:#0A3D62;font-weight:650}.sales-day-events-note,.sales-day-events-caption{font-size:10px;color:#818991;line-height:1.5;margin:10px 0 0}.sales-day-events-caption{border-top:1px solid #f0f1ed;padding-top:8px}@media(max-width:760px){.sales-day-events-list{grid-template-columns:1fr}}';
document.head.appendChild(st);
window.addEventListener('locean-sales-update',function(e){state=e.detail;render();});
window.addEventListener('storage',function(e){if(e.key&&e.key.startsWith('locean_')&&state)render();});
if(window.__loceanSalesLatest){state=window.__loceanSalesLatest;render();}
})();