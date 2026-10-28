/* Fiches fournisseurs dérivées de l'archive des documents, sans créer de doublons. */
(function(){
'use strict';
var ready=false,loading=false;
function e(tag,cls,value){var x=document.createElement(tag);if(cls)x.className=cls;if(value!==undefined)x.textContent=value;return x;}
async function token(){var user=window.netlifyIdentity&&window.netlifyIdentity.currentUser();if(!user)throw Error('Connexion requise');return user.jwt();}
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
  host.replaceChildren();host.classList.add('sf-directory-root');
  var all=[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr',{sensitivity:'base'}));
  var directory=e('div','sf-directory-panel');host.appendChild(directory);
  var detail=e('div','sf-detail-panel');detail.hidden=true;host.appendChild(detail);
  function listView(){
   detail.hidden=true;directory.hidden=false;directory.replaceChildren();
   var header=e('div','sf-list-header'),heading=e('div','sf-heading');
   heading.appendChild(e('h3','','Répertoire fournisseurs'));heading.appendChild(e('p','','Rechercher et consulter les documents d’un fournisseur.'));
   header.appendChild(heading);header.appendChild(e('span','sf-total',all.length+' fournisseur(s)'));directory.appendChild(header);
   var search=e('input','sf-search');search.type='search';search.placeholder='Rechercher un fournisseur…';search.setAttribute('aria-label','Rechercher un fournisseur');directory.appendChild(search);
   var list=e('div','sf-list');directory.appendChild(list);
   function paint(){
    list.replaceChildren();var found=all.filter(g=>key(g.name).includes(key(search.value))),lastLetter='';
    if(!found.length){list.appendChild(e('p','sf-empty','Aucun fournisseur correspondant.'));return;}
    found.forEach(g=>{
     var letter=g.name.charAt(0).toLocaleUpperCase('fr');
     if(letter!==lastLetter){list.appendChild(e('div','sf-letter',letter));lastLetter=letter;}
     var row=e('button','sf-row');row.type='button';
     row.appendChild(e('span','sf-name',g.name));
     var n=g.docs.filter(d=>d.kind==='facture').length;
     row.appendChild(e('span','sf-count',n+' facture'+(n!==1?'s':'')));
     row.appendChild(e('span','sf-chevron','›'));
     row.onclick=()=>detailView(g);
     list.appendChild(row);
    });
   }
   search.addEventListener('input',paint);paint();
  }
  function detailView(g){
   directory.hidden=true;detail.hidden=false;detail.replaceChildren();
   var back=e('button','sf-back','‹ Tous les fournisseurs');back.type='button';back.onclick=listView;detail.appendChild(back);
   detail.appendChild(e('h3','sf-supplier-title',g.name));
   var invoices=g.docs.filter(d=>d.kind==='facture').length,bills=g.docs.filter(d=>d.kind==='BL').length;
   detail.appendChild(e('p','sf-supplier-meta',invoices+' facture(s) · '+bills+' bon(s) de livraison'));
   var tabs=e('div','sf-tabs'),list=e('div','sf-docs');detail.appendChild(tabs);detail.appendChild(list);
   var filter='all';
   [['all','Tous'],['facture','Factures'],['BL','Bons de livraison']].forEach(([type,label])=>{
    var b=e('button','sf-tab',label);b.type='button';b.dataset.type=type;b.onclick=()=>{filter=type;paintDocs();};tabs.appendChild(b);
   });
   function paintDocs(){
    tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.type===filter));
    list.replaceChildren();
    var rows=g.docs.filter(d=>filter==='all'||d.kind===filter).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
    if(!rows.length){list.appendChild(e('p','sf-empty','Aucun document pour cette catégorie.'));return;}
    rows.forEach(doc=>{
     var card=e('div','sf-doc'),head=e('div','sf-doc-head'),info=e('div','sf-doc-info');
     info.appendChild(e('strong','',doc.kind==='BL'?'Bon de livraison':doc.kind==='facture'?'Facture':doc.kind||'Document'));
     info.appendChild(e('small','',(doc.date||'Date inconnue')+' · '+(doc.documentNumber||doc.filename)));
     head.appendChild(info);
     var open=e('button','sf-doc-open','Détails ›');open.type='button';head.appendChild(open);card.appendChild(head);
     var content=e('div','sf-doc-content');content.hidden=true;card.appendChild(content);list.appendChild(card);
     open.onclick=async()=>{
      content.hidden=!content.hidden;open.textContent=content.hidden?'Détails ›':'Refermer ⌃';
      if(content.hidden||content.dataset.ready)return;
      content.appendChild(e('p','sf-empty','Chargement…'));
      try{
       var auth=await token(),response=await fetch('/.netlify/functions/purchase-documents?id='+encodeURIComponent(doc.id),{headers:{Authorization:'Bearer '+auth},cache:'no-store'});
       var body=await response.json();if(!response.ok)throw Error(body.error||'Document indisponible');
       var full=body.document||doc;content.replaceChildren();
       var meta=e('p','sf-doc-meta','Date : '+(full.date||'Non renseignée')+' · Référence : '+(full.documentNumber||'Non renseignée'));content.appendChild(meta);
       if(full.lines?.length){
        content.appendChild(e('h4','','Lignes du document ('+full.lines.length+')'));
        var lines=e('div','sf-lines');full.lines.forEach(l=>{
         var line=e('div','sf-line');line.appendChild(e('span','',l.description||'Produit'));
         line.appendChild(e('small','',l.quantity===null?'Quantité inconnue':String(l.quantity)+' '+(l.unit||'')));
         lines.appendChild(line);
        });content.appendChild(lines);
       }
       if(full.disputes?.length){content.appendChild(e('h4','','Litiges'));full.disputes.forEach(x=>content.appendChild(e('p','sf-dispute',x.description+' · '+x.issueType+' · '+x.status)));}
       if(full.priceChanges?.length){content.appendChild(e('h4','','Variations de prix'));full.priceChanges.forEach(x=>content.appendChild(e('p','sf-change',x.description+' : '+(x.percent>0?'+':'')+x.percent+' %')));}
       var download=e('button','sf-download','Télécharger le document original');download.type='button';content.appendChild(download);
       download.onclick=async()=>{
        download.disabled=true;
        try{
         var t=await token(),r=await fetch('/.netlify/functions/purchase-documents?id='+encodeURIComponent(doc.id)+'&original=1',{headers:{Authorization:'Bearer '+t}});
         var p=await r.json();if(!r.ok)throw Error(p.error||'Document indisponible');
         var a=document.createElement('a');a.href=p.dataUri;a.download=p.filename||doc.filename||'document';document.body.appendChild(a);a.click();a.remove();
        }catch(err){alert(err.message);}finally{download.disabled=false;}
       };
       content.dataset.ready='1';
      }catch(err){content.replaceChildren(e('p','sf-error',err.message));}
     };
    });
   }
   paintDocs();
  }
  listView();

 }catch(err){host.replaceChildren(e('p','pd-warning',err.message));}
 finally{loading=false;}
}
function init(){
 var page=document.getElementById('module-supplier-directory');if(!page){var obs=new MutationObserver(function(){if(document.getElementById('module-supplier-directory')){obs.disconnect();init();}});obs.observe(document.body,{childList:true,subtree:true});return;}
 new MutationObserver(function(){if(page.classList.contains('open'))render();}).observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('open'))render();
}
var style=e('style');style.textContent=
'#module-supplier-directory .module-placeholder.sf-directory-root{min-height:0!important;padding:clamp(18px,3vw,30px)!important;text-align:left!important;box-sizing:border-box!important;max-width:100%!important;display:block!important}'
+'.sf-directory-panel[hidden],.sf-detail-panel[hidden],.sf-doc-content[hidden]{display:none!important}'
+'.sf-list-header{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:15px}.sf-heading h3{font-size:18px!important;margin:0 0 4px!important;color:#352a22!important}.sf-heading p{font-size:12px;color:#77685a;margin:0!important}.sf-total{font-size:11px;background:#f1e9df;border-radius:30px;padding:6px 10px;white-space:nowrap}'
+'.sf-search{width:min(100%,450px);display:block;background:#fff;border:1px solid #d9ccbe;border-radius:9px;padding:12px 13px;font-size:13px;margin:0 0 18px;box-sizing:border-box}'
+'.sf-list{max-width:850px}.sf-letter{font-size:11px;letter-spacing:.07em;font-weight:800;color:#837264;background:#f4eee7;padding:7px 12px;border-radius:5px;margin:15px 0 2px}'
+'.sf-row{width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:0;border-bottom:1px solid #ece3d9;background:transparent;padding:13px 10px;cursor:pointer}.sf-row:hover,.sf-row:focus-visible{background:#f7f1ea}.sf-name{flex:1;min-width:0;font-size:14px;font-weight:650;color:#382b24;overflow-wrap:anywhere}.sf-count{white-space:nowrap;font-size:11px;color:#806e60}.sf-chevron{font-size:23px;color:#917d69}'
+'.sf-empty{font-size:12px;color:#806e60;padding:12px 0}.sf-error{font-size:12px;color:#aa4536}.sf-back{border:0;background:transparent;padding:5px 0 18px;color:#806247;cursor:pointer;font-size:12px;font-weight:650}'
+'.sf-supplier-title{font-size:23px!important;color:#382b24!important;margin:0 0 5px!important}.sf-supplier-meta{font-size:12px;color:#847467;margin:0 0 17px!important}.sf-tabs{display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid #ece2d8;padding:0 0 14px;margin-bottom:6px}.sf-tab{border:1px solid #ded1c3;border-radius:8px;background:transparent;color:#665446;padding:8px 11px;font-size:12px;cursor:pointer}.sf-tab.active{background:#332823;border-color:#332823;color:#fff}'
+'.sf-docs{max-width:900px}.sf-doc{padding:13px 0;border-bottom:1px solid #eee5db}.sf-doc-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.sf-doc-info{display:flex;flex-direction:column;gap:5px;min-width:0}.sf-doc-info strong{font-size:13px;color:#352a22}.sf-doc-info small{font-size:11px;color:#897969;overflow-wrap:anywhere}.sf-doc-open{border:0;background:#f2e9df;color:#604c3b;border-radius:7px;padding:9px 12px;white-space:nowrap;font-size:11px;cursor:pointer}'
+'.sf-doc-content{margin-top:15px}.sf-doc-meta{font-size:12px;color:#7a6c60}.sf-doc-content h4{font-size:12px!important;margin:14px 0 8px!important}.sf-lines{max-height:280px;overflow-y:auto;border:1px solid #eee4da;border-radius:8px}.sf-line{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;font-size:11px;border-bottom:1px solid #eee5db}.sf-line small{color:#807064;white-space:nowrap}.sf-dispute,.sf-change{font-size:11px;color:#926138}.sf-download{border:1px solid #d8c9b9;background:#f5ede4;color:#584637;border-radius:7px;padding:10px 13px;margin-top:14px;font-size:11px;cursor:pointer}'
+'@media(max-width:550px){.sf-list-header{align-items:flex-start;flex-direction:column;gap:8px}.sf-row{padding:12px 5px}.sf-name{font-size:13px}.sf-count{font-size:10px}}';
document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();