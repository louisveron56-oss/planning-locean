/* Fiches fournisseurs dérivées de l'archive des documents, sans créer de doublons. */
(function(){
'use strict';
var ready=false,loading=false;
function e(tag,cls,value){var x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x;}
function key(value){return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function euro(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(v);}
async function render(){
 var page=document.getElementById('module-supplier-directory'),host=page?.querySelector('.module-placeholder');
 if(!host||loading)return;loading=true;host.replaceChildren(e('p','pd-help','Chargement des fournisseurs issus des documents validés…'));
 try{
  var user=window.netlifyIdentity?.currentUser();if(!user)throw Error('Connexion requise');
  var token=await user.jwt(),res=await fetch('/.netlify/functions/purchase-documents',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  var data=await res.json();if(!res.ok)throw Error(data.error||'Lecture indisponible');
  var groups=new Map();
  (data.documents||[]).filter(x=>x.status==='validé'&&x.supplier).forEach(function(doc){
   var k=key(doc.supplier);
   if(!groups.has(k))groups.set(k,{name:doc.supplier,docs:[],disputes:0,priceChanges:0});
   var group=groups.get(k);group.docs.push(doc);group.disputes+=(doc.disputes||[]).filter(d=>d.status!=='résolu').length;group.priceChanges+=(doc.priceChanges||[]).filter(d=>d.percent>0).length;
  });
  host.replaceChildren();
  var title=e('div','supplier-directory-summary',groups.size+' fournisseur(s) identifiés depuis les documents validés');host.appendChild(title);
  if(!groups.size){host.appendChild(e('p','pd-help','Aucun fournisseur issu de BL ou factures validés pour le moment.'));return;}
  var list=e('div','supplier-directory-grid');host.appendChild(list);
  [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr')).forEach(function(group){
   var box=e('section','supplier-directory-card');
   box.appendChild(e('h3','',group.name));
   var num=group.docs.filter(x=>x.kind==='facture').length,bl=group.docs.filter(x=>x.kind==='BL').length;
   box.appendChild(e('p','',num+' facture(s) · '+bl+' BL validé(s)'));
   if(group.disputes)box.appendChild(e('p','supplier-directory-alert',group.disputes+' litige(s) non résolu(s)'));
   if(group.priceChanges)box.appendChild(e('p','supplier-directory-alert',group.priceChanges+' hausse(s) tarifaire(s) relevée(s)'));
   var details=e('details','supplier-directory-history'),summary=e('summary','','Historique documentaire');details.appendChild(summary);
   group.docs.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,40).forEach(doc=>{
    var row=e('div','supplier-directory-doc',(doc.kind||'Document')+' · '+(doc.date||'Sans date')+' · '+(doc.documentNumber||doc.filename));details.appendChild(row);
   });
   box.appendChild(details);list.appendChild(box);
  });
 }catch(err){host.replaceChildren(e('p','pd-warning',err.message));}
 finally{loading=false;}
}
function init(){
 var page=document.getElementById('module-supplier-directory');if(!page){var obs=new MutationObserver(function(){if(document.getElementById('module-supplier-directory')){obs.disconnect();init();}});obs.observe(document.body,{childList:true,subtree:true});return;}
 new MutationObserver(function(){if(page.classList.contains('open'))render();}).observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('open'))render();
}
var style=e('style');style.textContent='.supplier-directory-summary{font-size:12px;color:#566a76;margin:10px 0 15px}.supplier-directory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.supplier-directory-card{padding:18px;background:#fff;border:1px solid #e3e6e3;border-radius:12px;min-width:0}.supplier-directory-card h3{font-size:16px;color:#153c55;margin:0 0 8px}.supplier-directory-card p{font-size:12px;color:#66747e}.supplier-directory-alert{color:#9d6430!important}.supplier-directory-history{font-size:12px;margin-top:12px}.supplier-directory-history summary{cursor:pointer;color:#153c55;font-weight:600}.supplier-directory-doc{border-top:1px solid #eee;padding:8px 0;color:#65747d}@media(max-width:700px){.supplier-directory-grid{grid-template-columns:1fr}}';document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();