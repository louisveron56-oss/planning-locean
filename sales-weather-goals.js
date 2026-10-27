/* L'Océan — contexte météo et progression du CA, lecture seule côté Sheets */
(function(){
'use strict';
var context=null,active=null,fetching=false;
var euros=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
var format=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function num(v){return Number(String(v??'').replace(/[\s\u00a0\u202f€]/g,'').replace(',','.'))||0;}
function dateKey(v){var s=String(v||'');if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);var m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';}
function rangeFor(date,period){var d=new Date(date+'T12:00:00'),a=new Date(d),b=new Date(d);if(period==='week'){a.setDate(a.getDate()-((a.getDay()+6)%7));b=new Date(a);b.setDate(b.getDate()+6);}if(period==='month'){a=new Date(d.getFullYear(),d.getMonth(),1,12);b=new Date(d.getFullYear(),d.getMonth()+1,0,12);}if(period==='year'){a=new Date(d.getFullYear(),0,1,12);b=new Date(d.getFullYear(),11,31,12);}return {start:key(a),end:key(b)};}
function key(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function selectRows(rows,r){return (rows||[]).filter(x=>{var d=dateKey(x.date);return d>=r.start&&d<=r.end;});}
function objectRows(first,others){var headers=(first.rows||[])[0]||[];return [...(first.rows||[]).slice(1),...others.flatMap(p=>p.rows||[])].map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]])));}
function append(parent,tag,cls,text){var e=el(tag,cls,text);parent.appendChild(e);return e;}
function panel(title,description){var p=el('section','sales-weather-card');append(p,'h3','',title);if(description)append(p,'p','sales-weather-description',description);return p;}
function renderWeather(holder){
 var card=panel('Météo & activité','Historique issu de l’onglet Contexte · pas une prévision en temps réel');
 if(!context){append(card,'p','sales-weather-description','Chargement des relevés météo…');holder.appendChild(card);return;}
 if(context.error){append(card,'p','sales-weather-description','Météo indisponible : '+context.error);holder.appendChild(card);return;}
 var p=rangeFor(active.anchor,active.period),rows=selectRows(context.rows,p);
 var temps=rows.map(r=>num(r.temp_max)).filter(n=>n> -30&&n<55),alerts=rows.filter(r=>String(r.alerte_meteo||'').trim());
 var grid=append(card,'div','sales-weather-stats');
 if(active.period==='day'){
  append(grid,'div','sales-weather-number',temps.length?format.format(temps[0])+' °C':'—');
  append(grid,'div','sales-weather-detail',alerts.length?alerts[0].alerte_meteo:'Aucune alerte renseignée dans le fichier');
 }else{
  append(grid,'div','sales-weather-number',temps.length?format.format(Math.max(...temps))+' °C':'—');
  append(grid,'div','sales-weather-detail','Température maximale observée sur la période');
  var alertSummary=alerts.length?alerts.map(x=>dateKey(x.date)+' : '+x.alerte_meteo).slice(0,3).join(' · '):'Aucune alerte renseignée sur la période';
  append(card,'p','sales-weather-alert',alertSummary+(alerts.length>3?' · +'+(alerts.length-3)+' autre(s)':''));
 }
 holder.appendChild(card);
}
const STORE='locean-ca-target-month';
function savedTargets(){try{return JSON.parse(localStorage.getItem(STORE)||'{}');}catch(_){return {};}}
function updateTargets(data){try{localStorage.setItem(STORE,JSON.stringify(data));}catch(_){}}
function renderGoal(holder){
 var month=active.anchor.slice(0,7),targets=savedTargets(),value=Number(targets[month])||0;
 var rows=(active.rows||[]).filter(r=>String(r.etablissement||'').toLocaleLowerCase('fr').includes('océan')&&dateKey(r.date).slice(0,7)===month);
 var ca=rows.reduce((v,r)=>v+num(r.ca_ttc),0),pct=value?ca/value*100:0;
 var box=panel('Objectif de chiffre d’affaires','Suivi mensuel · objectif à définir pour '+new Date(month+'-01T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'}));
 var info=append(box,'div','sales-goal-head');
 append(info,'strong','',euros.format(ca));
 append(info,'span','',value?'sur '+euros.format(value)+' d’objectif':'Aucun objectif défini');
 var track=append(box,'div','sales-goal-track'),fill=append(track,'div','sales-goal-fill');fill.style.width=Math.max(0,Math.min(100,pct))+'%';
 append(box,'p','sales-weather-description',value?format.format(pct)+' % atteint · '+(ca>=value?'Objectif atteint':euros.format(value-ca)+' restant'):'Renseigne un objectif pour activer la progression.');
 var row=append(box,'div','sales-goal-form');
 var input=append(row,'input','sales-goal-input');input.type='number';input.min='0';input.step='100';input.placeholder='Objectif CA TTC (€)';input.value=value||'';
 var button=append(row,'button','sales-goal-button','Enregistrer');button.type='button';
 button.addEventListener('click',function(){var proposed=Number(input.value);if(!Number.isFinite(proposed)||proposed<0)return;var obj=savedTargets();if(proposed>0)obj[month]=proposed;else delete obj[month];updateTargets(obj);redraw();});
 append(box,'p','sales-goal-notice','Objectif mémorisé uniquement sur cet appareil. Le seuil de rentabilité sera ajouté lorsque les charges fixes, variables et le prévisionnel auront été validés. Ce pourcentage mesure l’atteinte d’un objectif commercial, pas la rentabilité.');
 holder.appendChild(box);
}
function redraw(){
 if(!active)return;var host=document.querySelector('#module-sales .module-placeholder');if(!host)return;
 var old=host.querySelector('.sales-weather-goals');if(old)old.remove();
 var wrap=el('div','sales-weather-goals');renderWeather(wrap);renderGoal(wrap);host.appendChild(wrap);
}
async function fetchContext(){
 if(fetching||context)return;fetching=true;
 try{
  var user=window.netlifyIdentity&&netlifyIdentity.currentUser();
  if(!user)throw Error('Connexion requise');
  var token=await user.jwt();
  async function load(start){
   var res=await fetch('/.netlify/functions/sales-details?sheet=Contexte&start='+start,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   var payload=await res.json();
   if(!res.ok)throw Error(payload.error||'Erreur');
   return payload;
  }
  var first=await load(1),more=[],max=Number(first.totalRows)||0;
  for(var start=1001;start<=max;start+=1000)more.push(await load(start));
  context={rows:objectRows(first,more)};
 }catch(e){context={error:e.message};}finally{fetching=false;redraw();}
}
var styles=el('style');styles.textContent='.sales-weather-goals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}.sales-weather-card{background:white;border:1px solid #e7e7e2;border-radius:12px;padding:20px;min-width:0}.sales-weather-card h3{font-size:16px;color:#0A3D62;margin:0}.sales-weather-description,.sales-weather-alert,.sales-goal-notice{font-size:11px;color:#77818b;line-height:1.5;margin:9px 0 0}.sales-weather-stats{display:flex;flex-direction:column;gap:8px;margin-top:18px}.sales-weather-number{color:#0A3D62;font-size:29px;font-weight:750}.sales-weather-detail{font-size:12px;color:#495561}.sales-weather-alert{margin-top:18px;border-top:1px solid #f0f0ed;padding-top:12px}.sales-goal-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:5px;margin:18px 0 12px}.sales-goal-head strong{font-size:27px;color:#0A3D62}.sales-goal-head span{font-size:11px;color:#77818b}.sales-goal-track{background:#eeefec;border-radius:999px;height:15px;overflow:hidden}.sales-goal-fill{height:100%;background:#0A3D62;border-radius:999px;transition:width .2s}.sales-goal-form{display:flex;gap:7px;margin-top:14px}.sales-goal-input{min-width:0;width:100%;border-radius:7px;border:1px solid #dadeda;padding:9px 10px;font-size:12px}.sales-goal-button{background:#0A3D62;color:white;border:0;border-radius:7px;padding:10px 13px;white-space:nowrap;cursor:pointer;font-size:11px}.sales-goal-notice{margin-top:12px}@media(max-width:900px){.sales-weather-goals{grid-template-columns:1fr}}';document.head.appendChild(styles);
window.addEventListener('locean-sales-update',function(e){active=e.detail;redraw();if(!context&&!fetching)fetchContext();});
if(window.__loceanSalesLatest){active=window.__loceanSalesLatest;redraw();fetchContext();}
})();