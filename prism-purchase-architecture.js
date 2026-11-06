/* Prism : architecture Achats & Stocks V1, navigation non destructive.
   Réutilise les modules existants ; ne modifie ni données, ni ratios, ni fichiers de refonte. */
(function(){
'use strict';
function $ (q,root){return (root||document).querySelector(q)}
function make(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
var paths=[
 {id:'suppliers',label:'Produits',group:'Catalogue',icon:'▣',note:'Référentiel, familles, unités, tarifs et historique produit'},
 {id:'supplier-directory',label:'Fournisseurs',group:'Catalogue',icon:'▤',note:'Répertoire fournisseurs (en cours de construction)'},
 {id:'agreements',label:'Accords fournisseurs',group:'Catalogue',icon:'◇',note:'Gratuités, prix théorique et coût confirmé'},
 {id:'delivery-notes',label:'Bons de livraison',group:'Documents',icon:'☷',note:'Réceptions et rapprochements de livraison'},
 {id:'purchase-invoices',label:'Factures',group:'Documents',icon:'▤',note:'Factures fournisseur et suivi des documents'},
 {id:'purchase-history',label:'Historique des achats',group:'Contrôle & analyses',icon:'↗',note:'Historique des prix et des lignes de factures'},
 {id:'purchase-audit',label:'Audit des achats',group:'Contrôle & analyses',icon:'◎',note:'Contrôles et anomalies des factures'},
 {id:'inventory',label:'Inventaires',group:'Stocks physiques',icon:'☷',note:'Comptages et valorisation'},
 {id:'stocks',label:'Stocks',group:'Stocks physiques',icon:'⬡',note:'Stock théorique : module en préparation'}
];
function page(id,title,lead){
 var p=document.getElementById('module-'+id);
 if(p)return p;
 p=make('section','module-page no-print');p.id='module-'+id;p.dataset.module=id;
 var shell=make('div','module-shell prism-purchase-workspace');
 shell.append(make('div','module-kicker','ACHATS & STOCKS'),make('div','module-title',title),make('p','prism-purchase-lead',lead));
 p.appendChild(shell);
 var after=document.getElementById('module-suppliers');
 if(after)after.insertAdjacentElement('beforebegin',p);else document.body.appendChild(p);
 return p;
}
function go(id){
 if(typeof window.navigateApp!=='function')return;
 window.navigateApp(id);
 var section=$('.prism-nav-section:has([data-page="purchase-home"])');
 if(section)section.open=true;
}
function addAction(container,id,label,desc,soon){
 var btn=make('button','prism-purchase-tile');
 btn.type='button';
 var strong=make('strong','',label),small=make('small','',desc);
 btn.append(strong,small);
 if(soon){btn.disabled=true;btn.append(make('span','prism-purchase-soon','En préparation'))}
 else btn.addEventListener('click',function(){go(id)});
 container.appendChild(btn);
}
function setupOverview(){
 var p=page('purchase-home','Achats & Stocks','Un espace unique pour gérer les produits, négocier les prix et contrôler les achats.');
 var shell=$('.module-shell',p);
 if($('#prism-purchase-groups',shell))return;
 var host=make('div','prism-purchase-groups');host.id='prism-purchase-groups';
 var groups=['Catalogue','Documents','Contrôle & analyses','Stocks physiques'];
 groups.forEach(function(group){
  var block=make('section','prism-purchase-group'),title=make('h3','',group),tiles=make('div','prism-purchase-tiles');
  paths.filter(function(x){return x.group===group}).forEach(function(x){
   addAction(tiles,x.id,x.label,x.note,x.id==='stocks');
  });
  block.append(title,tiles);host.appendChild(block);
 });
 var note=make('p','prism-purchase-disclaimer','Les accords sont sauvegardés localement dans cette première version ; les coûts confirmés ne remplacent pas les factures comptables. Les fonctions encore indisponibles restent identifiées.');
 shell.append(host,note);
}
function setupRoutes(){
 [['purchase-history','Historique des achats','Explore les achats et les variations de prix, sur la base des factures importées.','prism-purchase-history-open','Ouvrir l’historique des achats'],
 ['purchase-audit','Audit des achats','Vérifie les anomalies et explique les différences constatées entre les factures.','prism-purchase-audit-open','Ouvrir l’audit guidé']].forEach(function(x){
  var p=page(x[0],x[1],x[2]),shell=$('.module-shell',p);
  if($('.prism-purchase-launch',shell))return;
  var launch=make('button','prism-purchase-launch',x[4]);
  launch.type='button';
  var status=make('p','prism-purchase-status','');
  launch.addEventListener('click',function(){
   var original=document.getElementById(x[3]);
   if(original){original.click();status.textContent='';}
   else status.textContent='Ce module n’est pas encore disponible sur cette version.';
  });
  shell.append(launch,status);
 });
}
function setupNavigation(){
 var section=$('.prism-native-nav .prism-nav-section:has([data-page="agreements"])');
 if(!section)return;
 var nav=$('.app-nav-group',section);
 if(!nav)return;
 var original=nav.querySelector('[data-page="suppliers"]');
 if(!original)return;
 if(!nav.querySelector('[data-page="purchase-home"]')){
  var home=make('button','app-nav-item');home.type='button';home.dataset.page='purchase-home';
  home.innerHTML='<span class="app-nav-icon">▦</span>Vue d’ensemble';
  home.addEventListener('click',function(){go('purchase-home')});nav.insertBefore(home,nav.firstChild);
 }
 nav.querySelectorAll('.prism-nav-subheading, .app-nav-label').forEach(function(node){node.remove()});
 var btnMap={};
 paths.forEach(function(x){
  var b=nav.querySelector('[data-page="'+x.id+'"]')||document.querySelector('.prism-native-nav [data-page="'+x.id+'"]');
  if(!b){
   b=make('button','app-nav-item');b.type='button';b.dataset.page=x.id;
   b.addEventListener('click',function(){go(x.id)});
  }
  if(b.parentElement!==nav)nav.appendChild(b);
  if(x.id==='stocks')b.innerHTML='<span class="app-nav-icon">⬡</span>Stocks <span class="app-nav-badge">bientôt</span>';
  else b.innerHTML='<span class="app-nav-icon">'+x.icon+'</span>'+x.label;
  btnMap[x.id]=b;
 });
 nav.innerHTML='';
 nav.appendChild(make('div','app-nav-label','Achats & Stocks'));
 var home=$('.prism-native-nav [data-page="purchase-home"]');
 // Le bouton Vue d’ensemble était déplacé hors de nav par innerHTML ; le reconstruire.
 var overview=make('button','app-nav-item');overview.type='button';overview.dataset.page='purchase-home';
 overview.innerHTML='<span class="app-nav-icon">▦</span>Vue d’ensemble';overview.addEventListener('click',function(){go('purchase-home')});
 nav.appendChild(overview);
 var last='';
 paths.forEach(function(x){
  if(x.group!==last){last=x.group;nav.appendChild(make('div','prism-nav-subheading',last.toUpperCase()))}
  nav.appendChild(btnMap[x.id]);
 });
 var sub=section.querySelector('summary span:nth-child(2)');
 if(sub)sub.textContent='ACHATS & STOCKS';
 // S’assurer que l’accord a une entrée pérenne, même sans injection JS.
 section.open=true;
}
function styles(){
 if(document.getElementById('prismPurchaseArchitectureCss'))return;
 var st=make('style');st.id='prismPurchaseArchitectureCss';
 st.textContent='.prism-purchase-workspace{max-width:1250px!important}.prism-purchase-lead{color:#747576;margin:10px 0 24px;font-size:13px}.prism-purchase-groups{display:grid;grid-template-columns:1fr 1fr;gap:16px}.prism-purchase-group{border:1px solid #e5e0d8;background:#fff;border-radius:15px;padding:20px}.prism-purchase-group h3{font-size:15px;margin-bottom:14px;color:#242321}.prism-purchase-tiles{display:grid;grid-template-columns:1fr 1fr;gap:9px}.prism-purchase-tile{background:#faf9f6;border:1px solid #e6e2dc;padding:15px;text-align:left;border-radius:10px;cursor:pointer;font:inherit}.prism-purchase-tile:hover{border-color:#9b8b79;background:#f5f1ec}.prism-purchase-tile strong{display:block;font-size:12px;margin-bottom:7px;color:#222}.prism-purchase-tile small{display:block;color:#777;font-size:11px;line-height:1.5}.prism-purchase-tile:disabled{opacity:.58;cursor:default}.prism-purchase-soon{display:block;font-size:10px;color:#875b30;margin-top:6px}.prism-purchase-disclaimer{font-size:11px;color:#7b7770;margin:15px 0}.prism-purchase-launch{padding:12px 18px;border:0;border-radius:8px;background:#242522;color:#fff;cursor:pointer;margin-top:15px}.prism-purchase-status{margin-top:12px;color:#a34428}@media(max-width:1050px){.prism-purchase-groups{grid-template-columns:1fr}}@media(max-width:580px){.prism-purchase-tiles{grid-template-columns:1fr}}';
 document.head.appendChild(st);
}
function boot(){styles();setupOverview();setupRoutes();setupNavigation();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();