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
function renderWeatherMemo(host){
 var old=host.querySelector('.sales-weather-memo');if(old)old.remove();
 if(!active||active.period!=='day')return;
 var caCard=host.querySelector('.sales-stats .sales-card:first-child');if(!caCard)return;
 var memo=el('div','sales-weather-memo');memo.setAttribute('aria-label','Météo historique du jour');
 var label=append(memo,'span','sales-weather-memo-label','MÉTÉO DU JOUR');
 if(!context){append(memo,'strong','','Chargement…');}
 else if(context.error){append(memo,'strong','','Indisponible');memo.title=context.error;}
 else{
  var exact=context.rows.find(r=>dateKey(r.date)===active.anchor);
  if(!exact)append(memo,'strong','','Non renseignée');
  else{
   var raw=String(exact.temp_max??'').trim(),temperature=raw?format.format(num(raw))+' °C':'— °C';
   append(memo,'strong','',temperature);
   var alert=String(exact.alerte_meteo||'').trim();
   if(alert)append(memo,'span','sales-weather-memo-alert','⚠ '+alert);
   else append(memo,'span','sales-weather-memo-desc',String(exact.temps||exact.meteo||'').trim()||'Sans alerte');
   memo.title='Relevé du '+active.anchor+' · Source : Contexte (Google Sheets)';
  }
 }
 caCard.appendChild(memo);
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
 var link=append(box,'button','sales-goal-button','Voir le Tableau de bord');link.type='button';link.style.marginTop='12px';link.addEventListener('click',function(){if(typeof window.navigateApp==='function')window.navigateApp('dashboard');});
 holder.appendChild(box);
}
function redraw(){
 if(!active)return;
 var host=document.querySelector('#module-sales .module-placeholder');if(!host)return;
 var old=host.querySelector('.sales-weather-goals');if(old)old.remove();
 renderWeatherMemo(host);
 var wrap=el('div','sales-weather-goals');renderGoal(wrap);host.appendChild(wrap);
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
var styles=el('style');styles.textContent='#module-sales .sales-stats .sales-card:first-child{position:relative;padding-right:160px;min-height:105px}.sales-weather-memo{position:absolute;top:13px;right:12px;max-width:140px;padding-left:13px;border-left:1px solid #e8e8e5;display:flex;flex-direction:column;align-items:flex-start;gap:5px}.sales-weather-memo-label{font-size:9px;color:#6b7881;letter-spacing:.04em;font-weight:700}.sales-weather-memo strong{font-size:17px;color:#0A3D62}.sales-weather-memo-alert{font-size:10px;color:#8a521d;font-weight:700;line-height:1.2}.sales-weather-memo-desc{font-size:10px;color:#7b838a}@media(max-width:520px){#module-sales .sales-stats .sales-card:first-child{padding-right:145px}.sales-weather-memo{max-width:126px}}'+'.sales-weather-goals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}.sales-weather-card{background:white;border:1px solid #e7e7e2;border-radius:12px;padding:20px;min-width:0}.sales-weather-card h3{font-size:16px;color:#0A3D62;margin:0}.sales-weather-description,.sales-weather-alert,.sales-goal-notice{font-size:11px;color:#77818b;line-height:1.5;margin:9px 0 0}.sales-weather-stats{display:flex;flex-direction:column;gap:8px;margin-top:18px}.sales-weather-number{color:#0A3D62;font-size:29px;font-weight:750}.sales-weather-detail{font-size:12px;color:#495561}.sales-weather-alert{margin-top:18px;border-top:1px solid #f0f0ed;padding-top:12px}.sales-goal-head{display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:5px;margin:18px 0 12px}.sales-goal-head strong{font-size:27px;color:#0A3D62}.sales-goal-head span{font-size:11px;color:#77818b}.sales-goal-track{background:#eeefec;border-radius:999px;height:15px;overflow:hidden}.sales-goal-fill{height:100%;background:#0A3D62;border-radius:999px;transition:width .2s}.sales-goal-form{display:flex;gap:7px;margin-top:14px}.sales-goal-input{min-width:0;width:100%;border-radius:7px;border:1px solid #dadeda;padding:9px 10px;font-size:12px}.sales-goal-button{background:#0A3D62;color:white;border:0;border-radius:7px;padding:10px 13px;white-space:nowrap;cursor:pointer;font-size:11px}.sales-goal-notice{margin-top:12px}@media(max-width:900px){.sales-weather-goals{grid-template-columns:1fr}}';document.head.appendChild(styles);
window.addEventListener('locean-sales-update',function(e){active=e.detail;redraw();if(!context&&!fetching)fetchContext();});
if(window.__loceanSalesLatest){active=window.__loceanSalesLatest;redraw();fetchContext();}
})();