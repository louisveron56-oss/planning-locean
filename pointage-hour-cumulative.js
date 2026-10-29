(function(){
'use strict';
// Lecture seule. Les règles de régularisation de l'accord d'entreprise restent à paramétrer.
var css=document.createElement('style');
css.textContent='.ch-tabs{display:flex;gap:8px;margin:18px 0 10px}.ch-tab{border:1px solid #ddd7d1;background:white;border-radius:9px;padding:10px 17px;cursor:pointer;font-weight:700;color:#534942}.ch-tab.active{background:#332823;color:white}.ch-filters{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:15px}.ch-filters label{display:grid;gap:5px;font-size:11px;font-weight:650}.ch-filters input,.ch-filters select{padding:9px;border:1px solid #ddd7d1;border-radius:7px;background:white}.ch-table{width:100%;border-collapse:collapse;background:white;border-radius:12px;overflow:hidden}.ch-table th,.ch-table td{padding:12px;text-align:left;border-bottom:1px solid #eee7e0}.ch-table th{font-size:11px;color:#73685d}.ch-employee{background:none;border:0;text-align:left;cursor:pointer;font-weight:700;text-decoration:underline;text-underline-offset:3px}.ch-muted{color:#746b62;font-size:12px}.ch-note{padding:12px;margin:12px 0;background:#fff9ee;border:1px solid #f0dfba;border-radius:9px;color:#69522d;font-size:12px}.ch-detail{margin-top:16px;background:white;border:1px solid #e6e0da;border-radius:12px;padding:14px}.ch-detail table{width:100%;border-collapse:collapse}.ch-detail td{padding:7px;border-bottom:1px solid #eee}';
document.head.appendChild(css);
function el(tag,attrs,content){var n=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){if(k==='className')n.className=attrs[k];else n.setAttribute(k,attrs[k]);});if(content!==undefined)n.textContent=content;return n;}
function pad(n){return String(n).padStart(2,'0');}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function monday(s){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d);}
function addDays(s,n){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d);}
function duration(m){return (m/60).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' h';}
var shell,main,tabA,tabB,panel,details,body,from,to,sort,loaded=false, records={}, contractMode=false, originalVisibility=new Map();
function setTab(which){
 var on=which==='cumul';
 tabA.classList.toggle('active',!on);tabB.classList.toggle('active',on);
 Array.from(shell.children).forEach(function(n){if(n!==main&&n!==panel){if(on){if(!originalVisibility.has(n))originalVisibility.set(n,n.hidden);n.hidden=true;}else n.hidden=originalVisibility.has(n)?originalVisibility.get(n):false;}});
 panel.hidden=!on;
 if(on&&!loaded){loaded=true;load();}
}
function mount(){
 shell=document.querySelector('#module-pointage .module-shell');
 if(!shell||document.getElementById('ch-panel'))return;
 main=el('div',{className:'ch-tabs'});
 tabA=el('button',{type:'button',className:'ch-tab active'},'Pointages');
 tabB=el('button',{type:'button',className:'ch-tab'},'Cumul d’heures');
 tabA.onclick=function(){setTab('pointage');};tabB.onclick=function(){setTab('cumul');};
 main.append(tabA,tabB);
 shell.insertBefore(main,shell.children[3]||null);
 panel=el('div',{id:'ch-panel'});panel.hidden=true;
 var f=el('div',{className:'ch-filters'});
 function field(label,type,value){var w=el('label',{},label),x=el('input',{type:type});x.value=value;w.appendChild(x);f.appendChild(w);return x;}
 var d=new Date();to=field('Jusqu’au','date',iso(d));var start=new Date(d);start.setMonth(start.getMonth()-1);from=field('Depuis','date',iso(start));
 var sl=el('label',{},'Trier par');sort=el('select');[['alpha','Nom A–Z'],['number','Numéro salarié']].forEach(function(o){var op=el('option',{value:o[0]},o[1]);sort.appendChild(op);});sl.appendChild(sort);f.appendChild(sl);
 var mode=el('button',{className:'ch-tab',type:'button'},'Période des contrats');mode.onclick=function(){contractMode=!contractMode;mode.classList.toggle('active',contractMode);load();};f.appendChild(mode);var refresh=el('button',{className:'ch-tab',type:'button'},'Actualiser');refresh.onclick=load;f.appendChild(refresh);
 var note=el('div',{className:'ch-note'},'Lecture opérationnelle uniquement : seuls les jours validés sont comptés. Écart indicatif = heures validées moins prorata de la durée hebdomadaire contractuelle ; hors absences, congés, jours fériés et règles spécifiques de l’accord d’entreprise. Ce n’est ni un solde d’annualisation définitif ni un calcul de paie.');
 body=el('div');details=el('div');panel.append(f,note,body,details);
 shell.insertBefore(panel,main.nextSibling);sort.onchange=render;
}
function employeeRecord(name){return (typeof EMPS!=='undefined'?EMPS:[]).find(function(e){return String(e.name).trim()===name;});}
function periodFor(e){var now=iso(new Date()),a=from.value,b=to.value;if(contractMode&&e&&e.contractType){a=e.contractType==='CDI'?now.slice(0,4)+'-01-01':(e.contractStartDate||a);b=e.contractType==='CDI'?now.slice(0,4)+'-12-31':(e.contractEndDate||b);}if(e&&e.contractStartDate&&a<e.contractStartDate)a=e.contractStartDate;if(e&&e.contractType==='CDD'&&e.contractEndDate&&b>e.contractEndDate)b=e.contractEndDate;if(e&&e.actualExitDate&&b>e.actualExitDate)b=e.actualExitDate;if(b>now)b=now;return {from:a,to:b};}
function daysBetween(a,b){if(!a||!b||b<a)return 0;return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000)+1;}
function render(){
 if(!body)return;
 body.replaceChildren();
 var arr=Object.keys(records).map(function(k){var e=employeeRecord(k),p=periodFor(e);return {name:k,items:records[k].filter(function(x){return x.date>=p.from&&x.date<=p.to;}),profile:e,period:p};});
 arr.sort(function(a,b){if(sort.value==='number'){var ea=(typeof EMPS!=='undefined'?EMPS:[]).find(function(x){return x.name===a.name;});var eb=(typeof EMPS!=='undefined'?EMPS:[]).find(function(x){return x.name===b.name;});return String(ea&& (ea.employeeNumber||ea.number||ea.id)||'').localeCompare(String(eb&&(eb.employeeNumber||eb.number||eb.id)||''),'fr',{numeric:true})||a.name.localeCompare(b.name,'fr');}return a.name.localeCompare(b.name,'fr');});
 var table=el('table',{className:'ch-table'}),thead=el('thead'),tr=el('tr');
 ['Salarié','Heures validées','Journées','Écart indicatif'].forEach(function(t){tr.appendChild(el('th',{},t));});thead.appendChild(tr);table.appendChild(thead);
 var tb=el('tbody');
 arr.forEach(function(emp){
  var tr=el('tr'),name=el('button',{className:'ch-employee',type:'button'},emp.name);
  name.onclick=function(){showDetails(emp);};var cell=el('td');cell.appendChild(name);tr.appendChild(cell);
  tr.appendChild(el('td',{},duration(emp.items.reduce(function(s,x){return s+x.minutes;},0))));
  tr.appendChild(el('td',{},String(emp.items.length)));
  var worked=emp.items.reduce(function(s,x){return s+x.minutes;},0),weekly=Number(emp.profile&&emp.profile.contract)||0;var days=daysBetween(emp.period.from,emp.period.to);var diff=weekly>0&&days>0?worked-Math.round(days*weekly*60/7):null;var balance=el('td',{},diff===null?'Non calculable':(diff>=0?'+':'−')+duration(Math.abs(diff)));balance.style.fontWeight='700';balance.style.color=diff===null?'#73685d':diff>=0?'#168451':'#c33b42';balance.title='Écart purement indicatif : référence hebdomadaire proratisée, hors absences et règles d’accord';tr.appendChild(balance);tb.appendChild(tr);
 });
 table.appendChild(tb);body.appendChild(table);
 if(!arr.length)body.appendChild(el('p',{className:'ch-muted'},'Aucun pointage validé trouvé pour la période.'));
}
function showDetails(emp){
 details.replaceChildren();var box=el('div',{className:'ch-detail'});box.appendChild(el('strong',{},emp.name+' — détail des journées validées · '+emp.period.from+' au '+emp.period.to));
 var table=el('table');emp.items.slice().sort(function(a,b){return a.date.localeCompare(b.date);}).forEach(function(x){var tr=el('tr');tr.append(el('td',{},x.date),el('td',{},duration(x.minutes)));table.appendChild(tr);});box.appendChild(table);details.appendChild(box);
}
async function load(){
 details.replaceChildren();body.textContent='Chargement des pointages validés…';
 if(!from.value||!to.value||from.value>to.value){body.textContent='Vérifie les dates.';return;}
 var periods=(typeof EMPS!=='undefined'?EMPS:[]).map(periodFor);var rangeStart=contractMode?periods.reduce(function(v,p){return p.from<v?p.from:v;},from.value):from.value;var rangeEnd=contractMode?periods.reduce(function(v,p){return p.to>v?p.to:v;},to.value):to.value;var start=monday(rangeStart),end=monday(rangeEnd),weeks=[];for(var w=start;w<=end;w=addDays(w,7)){weeks.push(w);if(weeks.length>110){body.textContent='Période trop longue (maximum 54 semaines).';return;}}
 records={};(typeof EMPS!=='undefined'?EMPS:[]).filter(function(e){return !e.hidden;}).forEach(function(e){records[String(e.name).trim()]=[];});
 var headers=typeof serverHeaders==='function'?serverHeaders(false):null;
 if(!headers){body.textContent='Connexion au stockage central indisponible : aucun cumul incomplet ne sera présenté.';return;}
 try{
  for(var i=0;i<weeks.length;i++){
   var week=weeks[i],obj;
   if(week===CURRENT_WEEK){obj=POINTAGE;}else{
    var result=await serverRequest('/.netlify/functions/storage?week='+encodeURIComponent(week),{method:'GET',headers:headers},false);
    obj=result&&result.week&&result.week.pointage||{};
   }
   Object.keys(obj||{}).forEach(function(day){
    if(day<rangeStart||day>rangeEnd)return;
    var entry=obj[day];if(!entry||!entry.validated||!entry.rows)return;
    Object.keys(entry.rows).forEach(function(name){
     var row=entry.rows[name],minutes=actualMinutesFromRow(row);
     if(!records[name])records[name]=[];
     records[name].push({date:day,minutes:minutes});
    });
   });
  }
  render();
 }catch(err){records={};body.textContent='Lecture interrompue : impossible de garantir un cumul exhaustif. Réessayez après vérification du serveur.';console.error('Cumul heures:',err);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();