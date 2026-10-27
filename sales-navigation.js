/* Organisation visuelle d'Analyse des ventes — sans changement des calculs. */
(function(){
'use strict';
var selected='overview';
var tabs=[
 ['overview','Synthèse'],
 ['services','Services'],
 ['products','Produits & activités'],
 ['payments','Encaissements'],
 ['annual','Ventes annuelles détaillées']
];
var rootSelector='#module-sales .module-placeholder';
function hidden(element,hide){if(element)element.classList.toggle('sales-tab-hidden',!!hide);}
function setup(){
 var root=document.querySelector(rootSelector);
 if(!root)return;
 var controls=root.querySelector('.sales-controls');
 if(!controls)return;
 var nav=root.querySelector('.sales-subnav');
 if(!nav){
  nav=document.createElement('nav');nav.className='sales-subnav';nav.setAttribute('aria-label','Sections des analyses de ventes');
  for(var item of tabs){
   var b=document.createElement('button');b.type='button';b.className='sales-subtab';b.dataset.subtab=item[0];b.textContent=item[1];
   b.addEventListener('click',function(){selected=this.dataset.subtab;apply();});
   nav.appendChild(b);
  }
  controls.insertAdjacentElement('afterend',nav);
 }
 var future=root.querySelector('.sales-annual-panel');
 if(!future){
  future=document.createElement('section');future.className='sales-annual-panel';
  var title=document.createElement('h3');title.textContent='Ventes annuelles par produit';future.appendChild(title);
  var intro=document.createElement('p');intro.textContent='Espace réservé à tes futurs rapports détaillés de caisse : quantités et chiffre d’affaires par référence (vins rouges, cafés, bières, plats, etc.).';future.appendChild(intro);
  var note=document.createElement('div');note.className='sales-annual-pending';note.textContent='À alimenter avec ton rapport annuel KSD · aucune donnée produit détaillée importée pour le moment.';future.appendChild(note);
  var detail=document.createElement('p');detail.textContent='Les données annuelles seront présentées par exercice, sans attribuer artificiellement les ventes à des jours ou à des mois.';future.appendChild(detail);
  root.appendChild(future);
 }
 apply();
}
function apply(){
 var root=document.querySelector(rootSelector);if(!root)return;
 for(var button of root.querySelectorAll('.sales-subtab')){
  var active=button.dataset.subtab===selected;
  button.classList.toggle('active',active);
  button.setAttribute('aria-current',active?'page':'false');
 }
 // Le sélecteur de dates reste visible dans tous les sous-onglets.
 for(var selector of ['.sales-stats','.sales-summary','.sales-table-wrap','.sales-note'])
  hidden(root.querySelector(selector),selected!=='overview');
 var insights=root.querySelector('.sales-insights');
 if(insights){
  hidden(insights,!['overview','services','products'].includes(selected));
  hidden(insights.querySelector('.sales-insight-label'),selected!=='overview');
  for(var section of insights.querySelectorAll('.sales-insight-section')){
   var title=section.querySelector('h3')?.textContent||'';
   var group=title.includes('services')?'services':title.includes('Familles')?'products':'overview';
   hidden(section,selected!==group);
  }
 }
 var performance=root.querySelector('.sales-extra');
 if(performance){
  hidden(performance,!['overview','payments'].includes(selected));
  for(var element of performance.children){
   var heading=element.querySelector('h3')?.textContent||'';
   var group=heading.includes('Modes de paiement')?'payments':'overview';
   hidden(element,group!==selected);
  }
 }
 hidden(root.querySelector('.sales-annual-panel'),selected!=='annual');
 var extra=root.querySelector('.sales-weather-goals');
 if(extra){
  hidden(extra,selected!=='overview');
  for(var panel of extra.children){
   var title=panel.querySelector('h3')?.textContent||'';
   hidden(panel,selected!=='overview');
  }
 }
}
function start(){
 var page=document.getElementById('module-sales');if(!page)return;
 var root=page.querySelector('.module-placeholder');if(!root)return;
 var scheduled=false;
 var observer=new MutationObserver(function(){if(scheduled)return;scheduled=true;queueMicrotask(function(){scheduled=false;setup();});});
 observer.observe(root,{childList:true,subtree:false});
 setup();
}
var style=document.createElement('style');
style.textContent='.sales-annual-panel{margin-top:20px;padding:25px;background:#fff;border:1px solid #e7e7e2;border-radius:12px}.sales-annual-panel h3{font-size:18px;color:#0A3D62;margin:0 0 10px}.sales-annual-panel p{font-size:12px;color:#6d7780;line-height:1.65;max-width:760px}.sales-annual-pending{border:1px dashed #d0d6d4;background:#f7f8f6;border-radius:9px;padding:22px;margin-top:20px;color:#51636d;font-size:12px}.sales-tab-hidden{display:none!important}.sales-subnav{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:18px 0 8px;padding:5px;border:1px solid #e6e5df;background:#f7f6f2;border-radius:12px}.sales-subtab{padding:11px 15px;color:#5c666e;border:0;background:transparent;border-radius:8px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}.sales-subtab.active{background:#fff;color:#0A3D62;box-shadow:0 1px 5px rgba(20,30,40,.09)}.sales-subtab:hover:not(.active){background:#eeece7}.sales-extra .sales-x-intro.sales-tab-hidden,.sales-extra .sales-x-kpis.sales-tab-hidden{display:none!important}.sales-insights:has(>.sales-tab-hidden):not(:has(>.sales-insight-section:not(.sales-tab-hidden))){display:none!important}@media(max-width:600px){.sales-subnav{gap:3px}.sales-subtab{font-size:11px;padding:10px 8px;flex:1 0 auto}}';
document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.addEventListener('locean-sales-update',function(){queueMicrotask(setup);});
})();