/* Navigation indépendante BL / factures, catalogue inchangé.
   Réutilise la même archive privée : aucun document n'est copié ou déplacé côté serveur. */
(function(){
'use strict';
function createPage(id,title,lead){
 var page=document.createElement('section');page.className='module-page no-print';page.id='module-'+id;page.dataset.module=id;
 var shell=document.createElement('div');shell.className='module-shell';
 var kicker=document.createElement('div');kicker.className='module-kicker';kicker.textContent='Achats & Réceptions';
 var heading=document.createElement('div');heading.className='module-title';heading.textContent=title;
 var intro=document.createElement('div');intro.className='module-lead';intro.textContent=lead;
 shell.append(kicker,heading,intro);page.appendChild(shell);
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
 function menu(label,id,kind,icon){
  var button=document.createElement('button');button.type='button';button.className='app-nav-item';
  button.dataset.page=id;button.innerHTML='<span class="app-nav-icon">'+icon+'</span>'+label;
  button.addEventListener('click',function(){
   if(typeof window.navigateApp==='function')window.navigateApp(id);
   var source=document.querySelector('#module-suppliers .pd-root, #module-delivery-notes .pd-root, #module-purchase-invoices .pd-root');
   if(source)document.querySelector('#module-'+id+' .module-shell').appendChild(source);
   window.dispatchEvent(new CustomEvent('locean-purchase-section',{detail:{kind:kind}}));
  });
  // Sous-onglets natifs Achats & Stocks, chacun conservant sa route propre.
  // Insérer avant Inventaires pour garder : Produits, Fournisseurs, BL, Factures.
  base.insertBefore(button,base.querySelector('[data-page="inventory"]')||null);
 }
 menu('Bons de livraison','delivery-notes','BL','☷');
 menu('Factures','purchase-invoices','facture','▤');
 // Move the shared document controls out of the products catalogue as soon as they mount.
 function relocate(){
  var source=document.querySelector('#module-suppliers .pd-root');
  if(!source)return false;
  bl.querySelector('.module-shell').appendChild(source);
  window.dispatchEvent(new CustomEvent('locean-purchase-section',{detail:{kind:'BL'}}));
  return true;
 }
 if(!relocate()){
  var observer=new MutationObserver(function(){if(relocate())observer.disconnect();});
  observer.observe(catalog,{childList:true,subtree:true});
 }
 // Limit the legacy catalog page to its original product catalogue.
 // If a user returns to Products, the document UI remains in the last dedicated document page.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();