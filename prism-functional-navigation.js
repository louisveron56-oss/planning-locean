(function(){
'use strict';
var groups=[
 ['ANALYSE & PERFORMANCE','◫',[['sales','Ventes'],['teamperf','Performance équipe'],['costs','Coûts matière'],['foodcost','Analyse food cost'],['reports','Rapports']]],
 ['ACHATS & STOCKS','▤',[['suppliers','Produits'],['supplier-directory','Fournisseurs'],['delivery-notes','Bons de livraison'],['purchase-invoices','Factures'],['inventory','Inventaires'],['stocks','Stocks']]],
 ['ÉQUIPE & RH','◉',[['planning','Planning'],['pointage','Pointage'],['team','Collaborateurs']]],
 ['CARTE & RECETTES','⌘',[['menu','Recettes & fiches techniques'],['menuengineering','Menu Engineering']]],
 ['ADMINISTRATION','⚙',[['posimport','Import caisse'],['settings','Paramètres'],['improvements','Améliorations'],['alltools','Tous les outils · Archive']]]
];
var built=false;
function e(t,c,v){var node=document.createElement(t);if(c)node.className=c;if(v!==undefined)node.textContent=v;return node;}
function toggle(head,content){var open=head.getAttribute('aria-expanded')==='true';head.setAttribute('aria-expanded',String(!open));content.hidden=open;}
function mount(){
 if(built)return true;
 var sidebar=document.getElementById('appSidebar'),scroll=sidebar?.querySelector('.app-sidebar-scroll');if(!scroll)return false;
 var old=[...sidebar.querySelectorAll('.app-nav-item[data-page]')],map=new Map(old.map(x=>[x.dataset.page,x]));
 if(!['dashboard','supplier-directory','delivery-notes','purchase-invoices'].every(x=>map.has(x)))return false;
 var nav=e('nav','prism-functional-nav');nav.setAttribute('aria-label','Navigation par fonction');
 var home=map.get('dashboard');home.replaceChildren(e('span','app-nav-icon','▤'),document.createTextNode('Tableau de bord'));home.classList.add('prism-home-link');nav.appendChild(home);
 groups.forEach(function(g,i){
  var section=e('section','prism-functional-group'),header=e('button','prism-functional-toggle');
  header.type='button';header.setAttribute('aria-expanded','false');
  header.append(e('span','prism-functional-symbol',g[1]),e('span','prism-functional-label',g[0]),e('span','prism-functional-chevron','⌄'));
  var items=e('div','prism-functional-items');items.hidden=true;
  items.id='prism-functional-'+i;header.setAttribute('aria-controls',items.id);header.onclick=()=>toggle(header,items);
  g[2].forEach(function(pair){
   var btn=map.get(pair[0]);if(!btn)return;
   var icon=btn.querySelector('.app-nav-icon')?.textContent||'·';
   btn.replaceChildren(e('span','app-nav-icon',icon),document.createTextNode(pair[1]));
   items.appendChild(btn);
  });
  section.append(header,items);nav.appendChild(section);
 });
 var extra=old.filter(x=>x!==home&&!nav.contains(x));
 if(extra.length){
  var other=e('section','prism-functional-group'),h=e('button','prism-functional-toggle');
  h.type='button';h.setAttribute('aria-expanded','false');h.append(e('span','prism-functional-symbol','⋯'),e('span','prism-functional-label','AUTRES MODULES'),e('span','prism-functional-chevron','⌄'));
  var content=e('div','prism-functional-items');content.hidden=true;h.onclick=()=>toggle(h,content);
  extra.forEach(x=>content.appendChild(x));other.append(h,content);nav.appendChild(other);
 }
 scroll.prepend(nav);scroll.querySelectorAll('.app-nav-group').forEach(x=>{if(!x.querySelector('[data-page]'))x.remove();});
 built=true;buildMobile();return true;
}
function buildMobile(){
 var drawer=document.getElementById('oceMobileMenu'),body=drawer?.querySelector('.oce-menu-scroll');
 if(!body||!built)return false;
 body.replaceChildren();
 function link(page,label){
  var btn=e('button','oce-menu-link',label);btn.type='button';btn.dataset.page=page;
  btn.onclick=()=>{drawer.classList.remove('open');document.querySelector('.oce-shade')?.classList.remove('open');document.body.classList.remove('oce-menu-open');window.navigateApp(page);};return btn;
 }
 body.appendChild(link('dashboard','▤   Tableau de bord'));
 groups.forEach(function(g){
  var section=e('section','oce-menu-group prism-mobile-group'),head=e('button','prism-mobile-toggle',g[0]+'   ⌄'),items=e('div','prism-mobile-items');
  head.type='button';head.setAttribute('aria-expanded','false');items.hidden=true;head.onclick=()=>toggle(head,items);
  g[2].forEach(pair=>{if(document.querySelector('.prism-functional-nav [data-page="'+pair[0]+'"]'))items.appendChild(link(pair[0],pair[1]));});
  if(items.children.length){section.append(head,items);body.appendChild(section);}
 });return true;
}
function init(){
 if(mount()){if(!buildMobile()){var observer=new MutationObserver(()=>{if(buildMobile())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}return;}
 var side=document.getElementById('appSidebar');if(!side)return;
 var watcher=new MutationObserver(()=>{if(mount())watcher.disconnect();});watcher.observe(side,{childList:true,subtree:true});
}
var style=e('style');style.textContent=
'.prism-functional-nav{display:flex;flex-direction:column;gap:6px;padding:8px 0}.prism-home-link{font-weight:750!important;margin:3px 8px 13px!important;padding:13px 12px!important}.prism-functional-group{margin:0 6px 3px}.prism-functional-toggle{display:flex;align-items:center;gap:9px;width:100%;min-height:43px;background:transparent;color:#EAE0D3;border:0;text-align:left;padding:10px 9px;border-radius:8px;cursor:pointer}.prism-functional-toggle:hover,.prism-functional-toggle[aria-expanded=true]{background:rgba(234,224,211,.1)}'
+'.prism-functional-symbol{min-width:22px;text-align:center;font-size:16px;color:#d8c6b6}.prism-functional-label{flex:1;font-size:10px;letter-spacing:.055em;font-weight:750}.prism-functional-chevron{font-size:18px;color:#d8c6b6}.prism-functional-toggle[aria-expanded=true] .prism-functional-chevron{transform:rotate(180deg)}.prism-functional-items{padding:0 0 5px 12px}.prism-functional-items[hidden]{display:none!important}.prism-functional-items .app-nav-item{font-size:12px!important;min-height:36px!important}'
+'.prism-mobile-toggle{display:block;background:transparent;color:inherit;border:0;font-size:12px;font-weight:750;text-align:left;padding:14px 8px;width:100%}.prism-mobile-items[hidden]{display:none!important}.prism-mobile-items .oce-menu-link{padding-left:20px!important}.prism-mobile-group{padding:0 4px}';
document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();