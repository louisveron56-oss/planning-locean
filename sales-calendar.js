/* L'Océan — calendrier de navigation dans les ventes. */
(function(){
'use strict';
var mode='day',view=new Date(),opened=false;
var modes=[['day','Jour'],['week','Semaine'],['month','Mois'],['year','Année']];
var monthFmt=new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'});
function el(tag,cl,label){var e=document.createElement(tag);if(cl)e.className=cl;if(label!==undefined)e.textContent=label;return e;}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fromKey(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')?new Date(s+'T12:00:00'):new Date();}
function currentDate(){var p=document.querySelector('#module-sales .sales-date');return p?fromKey(p.value):new Date();}
function currentMode(){var selected=document.querySelector('#module-sales .sales-tabs .selected');var buttons=[...document.querySelectorAll('#module-sales .sales-tabs .sales-action')];return modes[Math.max(0,buttons.indexOf(selected))][0];}
function select(period,date){
 var panel=document.getElementById('module-sales');if(!panel)return;
 var idx=modes.findIndex(x=>x[0]===period);
 var tab=panel.querySelectorAll('.sales-tabs button')[idx];
 if(tab)tab.click();
 var picker=panel.querySelector('.sales-date');
 if(picker){picker.value=dateKey(date);picker.dispatchEvent(new Event('change',{bubbles:true}));}
 opened=false;
}
function btn(text,action,className){var b=el('button',className||'sales-calendar-choice',text);b.type='button';b.addEventListener('click',function(event){event.stopPropagation();action();});return b;}
function draw(){
 var popup=document.querySelector('#module-sales .sales-calendar-popup');if(!popup||!opened)return;
 popup.replaceChildren();
 var top=el('div','sales-calendar-head');
 top.appendChild(btn('‹',function(){view=new Date(view.getFullYear()+(mode==='year'?-1:0),view.getMonth()+(mode==='year'?0:mode==='month'?-12:-1),1,12);draw();},'sales-calendar-arrow'));
 top.appendChild(el('strong','',mode==='month'||mode==='year'?String(view.getFullYear()):monthFmt.format(view)));
 top.appendChild(btn('›',function(){view=new Date(view.getFullYear()+(mode==='year'?1:0),view.getMonth()+(mode==='year'?0:mode==='month'?12:1),1,12);draw();},'sales-calendar-arrow'));
 popup.appendChild(top);
 var tabs=el('div','sales-calendar-modes');
 modes.forEach(function(x){var b=btn(x[1],function(){mode=x[0];draw();},'sales-calendar-mode');if(x[0]===mode)b.classList.add('active');tabs.appendChild(b);});
 popup.appendChild(tabs);
 if(mode==='year'){
  var years=el('div','sales-calendar-years');
  var starting=Math.floor(view.getFullYear()/12)*12;
  for(var y=starting;y<starting+12;y++){
   (function(yy){var b=btn(String(yy),function(){select('year',new Date(yy,0,1,12));},'sales-calendar-year');
    if(yy===currentDate().getFullYear())b.classList.add('active');years.appendChild(b);})(y);
  }
  popup.querySelector('.sales-calendar-head strong').textContent=starting+' – '+(starting+11);
  popup.appendChild(years);
 }else if(mode==='month'){
  var grid=el('div','sales-calendar-months');
  for(var i=0;i<12;i++){
   (function(month){var d=new Date(view.getFullYear(),month,1,12);var b=btn(d.toLocaleDateString('fr-FR',{month:'short'}),function(){select('month',d);},'sales-calendar-month');
    if(d.getFullYear()===currentDate().getFullYear()&&d.getMonth()===currentDate().getMonth())b.classList.add('active');grid.appendChild(b);})(i);
  }
  popup.appendChild(grid);
 }else{
  var weekdays=el('div','sales-calendar-weekdays');
  ['L','M','M','J','V','S','D'].forEach(x=>weekdays.appendChild(el('span','',x)));popup.appendChild(weekdays);
  var days=el('div','sales-calendar-days');
  var first=new Date(view.getFullYear(),view.getMonth(),1,12);
  var offset=(first.getDay()+6)%7;
  var count=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
  for(var blank=0;blank<offset;blank++)days.appendChild(el('span','sales-calendar-blank',''));
  for(var dayNumber=1;dayNumber<=count;dayNumber++){
   (function(n){
    var d=new Date(view.getFullYear(),view.getMonth(),n,12);
    var b=btn(String(n),function(){select(mode,d);},'sales-calendar-day');
    var selected=currentDate(),selectedKey=dateKey(selected);
    if(mode==='day'&&dateKey(d)===selectedKey)b.classList.add('active');
    if(mode==='week'){
     var weekday=(selected.getDay()+6)%7,weekStart=new Date(selected);weekStart.setDate(weekStart.getDate()-weekday);
     var weekEnd=new Date(weekStart);weekEnd.setDate(weekEnd.getDate()+6);
     if(d>=weekStart&&d<=weekEnd)b.classList.add('active');
    }
    if(dateKey(d)===dateKey(new Date()))b.classList.add('today');
    days.appendChild(b);
   })(dayNumber);
  }
  popup.appendChild(days);
  popup.appendChild(el('p','sales-calendar-help',mode==='week'?'Clique sur un jour pour sélectionner sa semaine complète (lundi–dimanche).':'Clique sur une date pour afficher les ventes de ce jour.'));
 }
 var bottom=el('div','sales-calendar-foot');
 bottom.appendChild(btn('Aujourd’hui',function(){select(mode,new Date());},'sales-calendar-today'));
 popup.appendChild(bottom);
}
function mount(){
 var root=document.querySelector('#module-sales .module-placeholder');
 if(!root)return;
 var nav=root.querySelector('.sales-period-nav');
 if(!nav||nav.querySelector('.sales-calendar-wrap'))return;
 var original=nav.querySelector('.sales-date');if(!original)return;
 var wrap=el('div','sales-calendar-wrap'),toggle=btn('▦ Calendrier',function(){
  opened=!opened;mode=currentMode();view=currentDate();if(opened)draw();wrap.classList.toggle('open',opened);
 },'sales-calendar-toggle');
 toggle.setAttribute('aria-label','Ouvrir le calendrier de sélection des ventes');
 var popup=el('div','sales-calendar-popup');popup.setAttribute('role','dialog');popup.setAttribute('aria-label','Choisir une période de ventes');
 wrap.appendChild(toggle);wrap.appendChild(popup);nav.appendChild(wrap);if(opened){wrap.classList.add('open');draw();}
}
function initialize(){
 var page=document.getElementById('module-sales');if(!page)return;
 var root=page.querySelector('.module-placeholder');if(!root)return;
 var queued=false;
 new MutationObserver(function(){if(queued)return;queued=true;queueMicrotask(function(){queued=false;mount();});}).observe(root,{childList:true,subtree:false});
 mount();
 document.addEventListener('click',function(e){var w=document.querySelector('#module-sales .sales-calendar-wrap');if(w&&!w.contains(e.target)){opened=false;w.classList.remove('open');}});
 document.addEventListener('keydown',function(e){if(e.key==='Escape'){opened=false;var w=document.querySelector('#module-sales .sales-calendar-wrap');if(w)w.classList.remove('open');}});
}
var css=el('style');
css.textContent='.sales-period-nav>.sales-date{display:none}.sales-calendar-wrap{position:relative}.sales-calendar-toggle{border:1px solid #d6dbd8;border-radius:8px;background:#fff;color:#0A3D62;padding:9px 12px;cursor:pointer;font:600 12px Inter,system-ui,sans-serif;white-space:nowrap}.sales-calendar-toggle:hover{background:#f5f6f5}.sales-calendar-popup{display:none;position:absolute;right:0;top:calc(100% + 8px);z-index:900;background:#fff;border:1px solid #e1e4df;border-radius:14px;box-shadow:0 15px 36px rgba(11,29,43,.15);width:min(340px,calc(100vw - 40px));padding:15px;box-sizing:border-box}.sales-calendar-wrap.open .sales-calendar-popup{display:block}.sales-calendar-head{display:flex;align-items:center;justify-content:space-between;text-transform:capitalize;color:#0A3D62;font-size:14px;margin-bottom:12px}.sales-calendar-arrow{border:0;background:#f4f5f2;border-radius:7px;padding:7px 13px;cursor:pointer}.sales-calendar-modes{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;background:#f2f3f0;border-radius:8px;padding:3px;margin-bottom:15px}.sales-calendar-mode{border:0;background:transparent;border-radius:6px;font-size:11px;color:#596672;padding:9px 0;cursor:pointer}.sales-calendar-mode.active,.sales-calendar-day.active,.sales-calendar-month.active,.sales-calendar-year.active{background:#0A3D62;color:#fff}.sales-calendar-weekdays,.sales-calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}.sales-calendar-weekdays span{font-size:10px;color:#89909a;margin-bottom:6px}.sales-calendar-choice,.sales-calendar-day,.sales-calendar-month,.sales-calendar-year{border:0;background:transparent;border-radius:7px;cursor:pointer;padding:9px 0;font-size:12px;color:#33424e}.sales-calendar-day:hover,.sales-calendar-month:hover,.sales-calendar-year:hover{background:#e6eceb}.sales-calendar-day.active:hover,.sales-calendar-month.active:hover,.sales-calendar-year.active:hover{background:#0A3D62}.sales-calendar-day.today{outline:1px solid #d7ae60;outline-offset:-2px}.sales-calendar-months,.sales-calendar-years{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.sales-calendar-help{font-size:10px;color:#7a838b;line-height:1.4;margin:12px 0 0}.sales-calendar-foot{margin-top:11px;padding-top:10px;border-top:1px solid #eff0ec;display:flex;justify-content:flex-end}.sales-calendar-today{background:#f2f4f2;border:0;color:#0A3D62;font-weight:600;font-size:11px;border-radius:7px;padding:9px 13px;cursor:pointer}@media(max-width:580px){.sales-calendar-popup{right:-5px}.sales-calendar-toggle{padding:8px 10px}}';
document.head.appendChild(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();