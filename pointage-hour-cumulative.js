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
var shell,main,tabA,tabB,panel,details,body,from,to,sort,loaded=false, records={};
function setTab(which){
 var on=which==='cumul';
 tabA.classList.toggle('active',!on);tabB.classList.toggle('active',on);
 Array.from(shell.children).forEach(function(n){if(n!==main&&n!==panel)n.hidden=on;});
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
 var refresh=el('button',{className:'ch-tab',type:'button'},'Actualiser');refresh.onclick=load;f.appendChild(refresh);
 var note=el('div',{className:'ch-note'},'Seules les journées validées sont additionnées. Le solde +/− par rapport à l’annualisation sera disponible après paramétrage de votre accord d’entreprise. Aucun résultat n’est un calcul de paie.');
 body=el('div');details=el('div');panel.append(f,note,body,details);
 shell.insertBefore(panel,main.nextSibling);sort.onchange=render;
}
function render(){
 if(!body)return;
 body.replaceChildren();
 var arr=Object.keys(records).map(function(k){return {name:k,items:records[k]};});
 arr.sort(function(a,b){if(sort.value==='number'){var ea=(typeof EMPS!=='undefined'?EMPS:[]).find(function(x){return x.name===a.name;});var eb=(typeof EMPS!=='undefined'?EMPS:[]).find(function(x){return x.name===b.name;});return String(ea&& (ea.employeeNumber||ea.number||ea.id)||'').localeCompare(String(eb&&(eb.employeeNumber||eb.number||eb.id)||''),'fr',{numeric:true})||a.name.localeCompare(b.name,'fr');}return a.name.localeCompare(b.name,'fr');});
 var table=el('table',{className:'ch-table'}),thead=el('thead'),tr=el('tr');
 ['Salarié','Heures validées','Journées','Solde annualisation'].forEach(function(t){tr.appendChild(el('th',{},t));});thead.appendChild(tr);table.appendChild(thead);
 var tb=el('tbody');
 arr.forEach(function(emp){
  var tr=el('tr'),name=el('button',{className:'ch-employee',type:'button'},emp.name);
  name.onclick=function(){showDetails(emp);};var cell=el('td');cell.appendChild(name);tr.appendChild(cell);
  tr.appendChild(el('td',{},duration(emp.items.reduce(function(s,x){return s+x.minutes;},0))));
  tr.appendChild(el('td',{},String(emp.items.length)));
  tr.appendChild(el('td',{className:'ch-muted'},'À paramétrer'));tb.appendChild(tr);
 });
 table.appendChild(tb);body.appendChild(table);
 if(!arr.length)body.appendChild(el('p',{className:'ch-muted'},'Aucun pointage validé trouvé pour la période.'));
}
function showDetails(emp){
 details.replaceChildren();var box=el('div',{className:'ch-detail'});box.appendChild(el('strong',{},emp.name+' — détail des journées validées'));
 var table=el('table');emp.items.slice().sort(function(a,b){return a.date.localeCompare(b.date);}).forEach(function(x){var tr=el('tr');tr.append(el('td',{},x.date),el('td',{},duration(x.minutes)));table.appendChild(tr);});box.appendChild(table);details.appendChild(box);
}
async function load(){
 details.replaceChildren();body.textContent='Chargement des pointages validés…';
 if(!from.value||!to.value||from.value>to.value){body.textContent='Vérifie les dates.';return;}
 var start=monday(from.value),end=monday(to.value),weeks=[];for(var w=start;w<=end;w=addDays(w,7)){weeks.push(w);if(weeks.length>54){body.textContent='Période trop longue (maximum 54 semaines).';return;}}
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
    if(day<from.value||day>to.value)return;
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