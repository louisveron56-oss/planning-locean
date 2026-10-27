/* L'Océan : pilotage CA complémentaire, sources privées en lecture seule. */
(function(){
'use strict';
var last=null,payments=null,loading=false;
var money=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
var integer=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
var percent=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1});
function val(x){return Number(String(x==null?'':x).replace(/[\s\u00a0\u202f€]/g,'').replace(',','.'))||0;}
function el(t,c,s){var n=document.createElement(t);if(c)n.className=c;if(s!==undefined)n.textContent=s;return n;}
function dKey(v){var s=String(v||'');if(/^\d{4}-\d\d-\d\d/.test(s))return s.slice(0,10);var m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';}
function day(s){return new Date(s+'T12:00:00');}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dateRange(ctx){var d=day(ctx.anchor),a=new Date(d),b=new Date(d);
if(ctx.period==='week'){a.setDate(d.getDate()-((d.getDay()+6)%7));b=new Date(a);b.setDate(a.getDate()+6);}
if(ctx.period==='month'){a=new Date(d.getFullYear(),d.getMonth(),1,12);b=new Date(d.getFullYear(),d.getMonth()+1,0,12);}
if(ctx.period==='year'){a=new Date(d.getFullYear(),0,1,12);b=new Date(d.getFullYear(),11,31,12);}
return {start:iso(a),end:iso(b)};}
function ocean(r){return String(r.etablissement||'').toLocaleLowerCase('fr').includes('océan');}
function filter(rows,range){return rows.filter(r=>{var d=dKey(r.date);return ocean(r)&&d>=range.start&&d<=range.end;});}
function sum(rows,k){return rows.reduce((n,r)=>n+val(r[k]),0);}
function heading(text,sub){var x=el('div','sales-x-heading');x.appendChild(el('h3','',text));if(sub)x.appendChild(el('p','',sub));return x;}
function section(title,sub){var x=el('section','sales-x-section');x.appendChild(heading(title,sub));return x;}
function bar(parent,name,n,total,show){var row=el('div','sales-x-bar');row.appendChild(el('span','',name));var track=el('div','sales-x-track'),fill=el('div','sales-x-fill');fill.style.width=(total?Math.min(100,n/total*100):0)+'%';track.appendChild(fill);row.appendChild(track);row.appendChild(el('strong','',show||money.format(n)));parent.appendChild(row);}
function chip(parent,label,value,sub){var c=el('div','sales-x-chip');c.appendChild(el('small','',label));c.appendChild(el('strong','',value));if(sub)c.appendChild(el('span','',sub));parent.appendChild(c);}
function csvExport(rows){
 var cols=['date','etablissement','ca_ttc','ca_ht','ca_tables','ca_comptoir','couverts','ticket_moyen','nb_tickets','retours_montant','offerts_montant'];
 var text=[cols,...rows.map(r=>cols.map(k=>String(r[k]??'')))].map(row=>row.map(v=>'"'+v.replace(/"/g,'""')+'"').join(';')).join('\r\n');
 var blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
 var a=document.createElement('a');a.href=url;a.download='locean-ventes-'+last.period+'-'+last.anchor+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadPayments(){
 if(loading||payments)return;loading=true;
 try{
  var u=window.netlifyIdentity&&netlifyIdentity.currentUser();if(!u)throw Error('Compte non connecté');
  var token=await u.jwt();
  async function call(start){var res=await fetch('/.netlify/functions/sales-details?sheet=Paiements&start='+start,{headers:{Authorization:'Bearer '+token},cache:'no-store'});var j=await res.json();if(!res.ok)throw Error(j.error||'Erreur Paiements');return j;}
  var first=await call(1),next=[],total=Number(first.totalRows)||0;
  for(var n=1001;n<=total;n+=1000)next.push(n);
  var pages=[];for(var i=0;i<next.length;i+=3){pages.push(...await Promise.all(next.slice(i,i+3).map(call)));}
  var headers=(first.rows||[])[0]||[];
  payments=[...(first.rows||[]).slice(1),...pages.flatMap(x=>x.rows||[])].map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
 }catch(e){payments={error:e.message};}
 finally{loading=false;render();}
}
function render(){
 if(!last)return;
 var host=document.querySelector('#module-sales .module-placeholder');if(!host)return;
 var old=host.querySelector('.sales-extra');if(old)old.remove();
 var range=dateRange(last),rows=filter(last.rows,range),sumCA=sum(rows,'ca_ttc');
 var root=el('div','sales-extra');
 var intro=el('div','sales-x-intro');intro.appendChild(el('strong','','Pilotage opérationnel'));
 var btn=el('button','sales-action','↓ Export CSV de la période');btn.type='button';btn.onclick=()=>csvExport(rows);intro.appendChild(btn);root.appendChild(intro);
 var figures=el('div','sales-x-kpis');
 var salesTables=sum(rows,'ca_tables'),counter=sum(rows,'ca_comptoir'),tickets=sum(rows,'nb_tickets'),covers=sum(rows,'couverts');
 chip(figures,'Tickets enregistrés',integer.format(tickets),'D’après les Z de caisse');
 chip(figures,'CA salle',money.format(salesTables),sumCA?percent.format(salesTables/sumCA*100)+' % du CA total':'—');
 chip(figures,'CA comptoir',money.format(counter),sumCA?percent.format(counter/sumCA*100)+' % du CA total':'—');
 chip(figures,'Offerts et retours',money.format(sum(rows,'offerts_montant')+sum(rows,'retours_montant')),'Montants cumulés, hors déduction du CA');
 root.appendChild(figures);
 var pay=section('Modes de paiement','Répartition des encaissements de la période');
 if(!payments){pay.appendChild(el('p','sales-x-empty','Lecture des paiements en cours…'));}
 else if(payments.error){pay.appendChild(el('p','sales-x-empty','Paiements non disponibles : '+payments.error));}
 else{
 var methods=new Map(),selected=filter(payments,range);
 selected.forEach(r=>{var name=String(r.moyen||'Autre').trim()||'Autre';methods.set(name,(methods.get(name)||0)+val(r.montant));});
 var total=[...methods.values()].reduce((a,b)=>a+b,0);
 if(total){[...methods].sort((a,b)=>b[1]-a[1]).forEach(p=>bar(pay,p[0],p[1],total,percent.format(p[1]/total*100)+' %'));}
 else pay.appendChild(el('p','sales-x-empty','Aucun règlement renseigné.'));
 }
 root.appendChild(pay);
 var alerts=section('Lecture rapide de la période','Indicateurs calculés à partir des Z disponibles');
 var info=el('div','sales-x-insight-grid');
 var days=new Set(rows.map(r=>dKey(r.date))),expected=Math.round((day(range.end)-day(range.start))/86400000)+1,coverage=expected?days.size/expected:0;
 chip(info,'Couverture des Z',days.size+' / '+expected+' jours',coverage<1?'Période incomplète':'Toutes les dates de la période sont renseignées');
 chip(info,'CA moyen par jour renseigné',days.size?money.format(sumCA/days.size):'—','Moyenne sur les jours présents uniquement');
 chip(info,'Couverts / jour renseigné',days.size?integer.format(covers/days.size):'—','Fréquentation moyenne');
 chip(info,'Ticket moyen / couvert',covers?money.format(rows.reduce((acc,r)=>acc+val(r.ticket_moyen)*val(r.couverts),0)/covers):'—','Moyenne pondérée par les couverts');
 alerts.appendChild(info);
 var caution=el('p','sales-x-empty','Les journées sans Z sont considérées comme manquantes et non comme des journées à 0 €. Les parts salle/comptoir sont calculées sur le CA TTC ; les paiements représentent les encaissements et peuvent différer du CA.');
 alerts.appendChild(caution);root.appendChild(alerts);
 host.appendChild(root);
}
function styles(){
 var css='.sales-extra{margin-top:20px;display:grid;gap:16px}.sales-x-intro{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}.sales-x-intro>strong{color:#0A3D62;font-size:15px}.sales-x-kpis,.sales-x-insight-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.sales-x-chip{background:#fff;border:1px solid #e7e7e2;border-radius:11px;padding:14px;display:flex;flex-direction:column;gap:6px;min-width:0}.sales-x-chip small{font-size:10px;color:#747c83}.sales-x-chip strong{color:#0A3D62;font-size:19px;line-height:1.2}.sales-x-chip span{font-size:10px;color:#76818a;line-height:1.4}.sales-x-section{padding:18px;background:white;border:1px solid #e7e7e2;border-radius:12px}.sales-x-heading{margin-bottom:16px}.sales-x-heading h3{margin:0;font-size:16px;color:#0A3D62}.sales-x-heading p{margin:5px 0 0;color:#828991;font-size:11px}.sales-x-bar{display:grid;grid-template-columns:minmax(75px,160px) 1fr 80px;gap:10px;align-items:center;margin:11px 0}.sales-x-bar>span{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sales-x-bar strong{text-align:right;font-size:11px;color:#0A3D62}.sales-x-track{background:#eceeea;height:11px;border-radius:5px;overflow:hidden}.sales-x-fill{height:100%;background:#0A3D62;border-radius:5px}.sales-x-empty{color:#77818b;font-size:11px;line-height:1.5;margin:12px 0 0}@media(max-width:950px){.sales-x-kpis,.sales-x-insight-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:580px){.sales-x-kpis,.sales-x-insight-grid{grid-template-columns:1fr}.sales-x-bar{grid-template-columns:90px minmax(50px,1fr) 62px;gap:6px}}';
 var s=el('style');s.textContent=css;document.head.appendChild(s);
}
styles();
window.addEventListener('locean-sales-update',function(e){last=e.detail;render();if(!payments&&!loading)loadPayments();});
if(window.__loceanSalesLatest){last=window.__loceanSalesLatest;render();loadPayments();}
})();