/* Navigation indépendante BL / factures, catalogue inchangé.
   Réutilise la même archive privée : aucun document n'est copié ou déplacé côté serveur. */
(function(){
'use strict';
function createPage(id,title,lead){
 var page=document.createElement('section');page.className='module-page no-print';page.id='module-'+id;page.dataset.module=id;
 var shell=document.createElement('div');shell.className='module-shell';
 var kicker=document.createElement('div');kicker.className='module-kicker';kicker.textContent='Achats & Réceptions';
 var heading=document.createElement('div');heading.className='module-title';heading.textContent=title;
 shell.append(heading);page.appendChild(shell);
 var after=document.getElementById('module-suppliers');after.insertAdjacentElement('afterend',page);
 return page;
}
function run(){
 var catalog=document.getElementById('module-suppliers');
 var nav=document.querySelector('.app-nav-item[data-page="supplier-directory"]');
 if(!catalog||!nav||document.getElementById('module-delivery-notes'))return;
 var bl=createPage('delivery-notes','Bons de livraison','Réceptions du matin · écarts de livraison · litiges fournisseurs');
 var invoices=createPage('purchase-invoices','Factures','Contrôle des prix HT · variations tarifaires · rapprochement des livraisons');
 var base=nav.parentElement;
 function activate(id,kind){
  const holder=document.querySelector('#module-'+id+' .module-shell');
  const source=document.querySelector('#module-delivery-notes .pd-root, #module-purchase-invoices .pd-root, #module-suppliers .pd-root');
  if(holder&&source&&source.parentElement!==holder)holder.appendChild(source);
  window.dispatchEvent(new CustomEvent('locean-purchase-section',{detail:{kind}}));
 }
 function menu(label,id,kind,icon){
  var button=document.createElement('button');button.type='button';button.className='app-nav-item';
  button.dataset.page=id;button.innerHTML='<span class="app-nav-icon">'+icon+'</span>'+label;
  button.addEventListener('click',function(){
   if(typeof window.navigateApp==='function')window.navigateApp(id);
   activate(id,kind);
  });
  // Sous-onglets natifs Achats & Stocks, chacun conservant sa route propre.
  // Insérer avant Inventaires pour garder : Produits, Fournisseurs, BL, Factures.
  base.insertBefore(button,base.querySelector('[data-page="inventory"]')||null);
 }
 menu('Bons de livraison','delivery-notes','BL','☷');
 menu('Factures','purchase-invoices','facture','▤');
 // BL and invoices share the document editor, never the Products page.
 // Also follow programmatic navigation (dashboard shortcuts, mobile menu).
 let lastSection='';
 function sync(){
  const invoicesOpen=invoices.classList.contains('open'),blOpen=bl.classList.contains('open');
  const section=invoicesOpen?'purchase-invoices':blOpen?'delivery-notes':'';
  if(section&&section!==lastSection){lastSection=section;activate(section,section==='delivery-notes'?'BL':'facture');}
  if(!section)lastSection='';
 }
 const observer=new MutationObserver(sync);
 observer.observe(bl,{attributes:true,attributeFilter:['class']});
 observer.observe(invoices,{attributes:true,attributeFilter:['class']});
 sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();