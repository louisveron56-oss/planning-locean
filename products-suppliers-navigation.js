/* Répartition du catalogue produits et de la future base fournisseurs.
   Conserve le contenu existant du module historique; aucun stockage modifié. */
(function(){
'use strict';
function initialize(){
 var old=document.getElementById('module-suppliers');
 var nav=document.querySelector('.app-nav-item[data-page="suppliers"]');
 if(!old||!nav||document.getElementById('module-supplier-directory'))return;
 // Garder l'identifiant historique pour ne pas casser le vrai catalogue ni ses scripts.
 // Son intitulé visible devient Produits ; le répertoire est une page distincte.
 var title=old.querySelector('.module-title'),lead=old.querySelector('.module-lead');
 if(title)title.textContent='Produits';
 if(lead)lead.textContent='Catalogue des produits et références d’achat, prix et unités de conditionnement.';
 var chips=old.querySelector('.module-chips');
 if(chips&&old.querySelector('.module-placeholder strong')?.textContent==='Module prêt à être construit'){
  chips.replaceChildren();
  ['Catalogue produits','Familles','Tarifs','Conditionnements'].forEach(function(item){var span=document.createElement('span');span.className='module-chip';span.textContent=item;chips.appendChild(span);});
 }
 // La route historique suppliers reste celle du catalogue produits.
 nav.dataset.page='suppliers';
 nav.setAttribute('onclick',"navigateApp('suppliers')");
 nav.innerHTML='<span class="app-nav-icon">▣</span>Produits';
 // Nouvelle page Fournisseurs distincte, vide en attendant le référentiel.
 var newNav=document.createElement('button');newNav.className='app-nav-item';
 newNav.dataset.page='supplier-directory';newNav.type='button';
 newNav.innerHTML='<span class="app-nav-icon">▤</span>Fournisseurs';
 newNav.addEventListener('click',function(){navigateApp('supplier-directory');});
 nav.insertAdjacentElement('afterend',newNav);
 var section=document.createElement('section');section.className='module-page no-print';
 section.id='module-supplier-directory';section.dataset.module='supplier-directory';
 section.innerHTML='<div class="module-shell"><div class="module-kicker">Opérationnel</div><div class="module-title">Fournisseurs</div><div class="module-lead">Répertoire des fournisseurs, historique des achats et suivi de l’évolution tarifaire.</div><div class="module-placeholder"><div class="module-placeholder-icon">▤</div><strong>Répertoire fournisseurs à construire</strong><p>Les fiches et l’historique seront ajoutés progressivement. Aucun fournisseur ni achat fictif n’est enregistré.</p><div class="module-chips"><span class="module-chip">Fiches fournisseurs</span><span class="module-chip">Historique d’achats</span><span class="module-chip">Évolution des prix</span><span class="module-chip">Factures / BL</span></div></div></div>';
 old.insertAdjacentElement('afterend',section);
 // L'en-tête se fonde sur l'ancien nom de page; adapter sans toucher au routeur.
 var nativeHeader=window.setHeaderMode;
 if(typeof nativeHeader==='function'){
  window.setHeaderMode=function(page){
   nativeHeader(page);
   if(page==='suppliers'||page==='supplier-directory'){var sub=document.querySelector('.brand-sub');if(sub)sub.textContent=page==='suppliers'?'— Produits':'— Fournisseurs';}
  };
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);
else initialize();
})();