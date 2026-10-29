/* L'Océan — réception et validation de BL et factures. */
(function(){
'use strict';
var root,docs=[],current=null,busy=false,productCatalog=[],activeType='BL',proposedBLs=[],selectedBLs=[];
function e(t,c,txt){var x=document.createElement(t);if(c)x.className=c;if(txt!==undefined)x.textContent=txt;return x;}
function add(p,t,c,txt){var x=e(t,c,txt);p.appendChild(x);return x;}
function token(){var user=window.netlifyIdentity&&window.netlifyIdentity.currentUser();return user?user.jwt():Promise.reject(Error('Connexion requise'));}
async function call(method,path,payload){var auth=await token();var r=await fetch('/.netlify/functions/purchase-documents'+(path||''),{method,headers:{Authorization:'Bearer '+auth,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});var body=await r.json();if(!r.ok)throw Error(body.error||'Erreur du service documentaire');return body;}
function money(p){return Number.isFinite(Number(p))&&p!==''&&p!==null?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(Number(p)):'Non précisé';}
function show(text,error){var x=root.querySelector('.pd-status');if(x){x.textContent=text;x.style.color=error?'#aa3d30':'#3a6473';}}
async function optimizedImage(file){
 if(file.size<=1800000||!file.type.startsWith('image/'))return file;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return file;
 try{
  var bitmap=await createImageBitmap(file),ratio=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
  var canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  var blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
  if(blob&&blob.size<file.size)return new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});
 }catch(_){}
 return file;
}
function fileData(file){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Lecture impossible'));reader.readAsDataURL(file);});}
function uploadCard(){
 var block=add(root,'section','pd-card'),header=add(block,'div','pd-heading');
 add(header,'h3','','Réception & contrôle documentaire');add(header,'p','','Photographier un BL ou importer une facture. Archivage privé et validation après lecture IA.');
 var buttons=add(block,'div','pd-upload-actions');
 var camera=add(buttons,'label','pd-action','📷 Prendre une photo');var photo=add(camera,'input','pd-hidden');photo.type='file';photo.accept='image/*';photo.setAttribute('capture','environment');
 var other=add(buttons,'label','pd-action pd-secondary','⇧ Importer PDF / image');var files=add(other,'input','pd-hidden');files.type='file';files.accept='application/pdf,image/jpeg,image/png,image/webp';files.multiple=false;
 add(block,'p','pd-help','PDF, JPEG, PNG ou WebP · 2,5 Mo maximum · Les unités peuvent enrichir le catalogue après validation explicite. Aucun prix n’est modifié automatiquement.');
 add(block,'p','pd-status','');
 async function receive(file){
  if(!file)return;
  if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)){show('Format non pris en charge.',true);return;}
  if(file.type.startsWith('image/'))file=await optimizedImage(file);
  if(file.size>2500000){show('Document trop volumineux (limite 2,5 Mo). Réduis la photo ou le PDF.',true);return;}
  if(busy)return;
  busy=true;show('Enregistrement privé du document…');
  try{var dataUri=await fileData(file);var response=await call('POST','',{action:'upload',filename:file.name,mime:file.type,establishment:'LOCEAN',dataUri});
   show('Document archivé. Tu peux maintenant lancer sa lecture IA.');
   await refresh();await openDocument(response.document.id);
  }catch(err){show(err.message,true);}finally{busy=false;photo.value='';files.value='';}
 }
 photo.addEventListener('change',()=>receive(photo.files?.[0]));files.addEventListener('change',()=>receive(files.files?.[0]));
}
async function refresh(){
 try{
  var auth=await token();
  var [result,catalogResponse]=await Promise.all([
   call('GET',''),
   fetch('/.netlify/functions/purchases',{headers:{Authorization:'Bearer '+auth},cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
  ]);
  productCatalog=catalogResponse?.products||[];docs=result.documents||[];renderList();
 }
 catch(err){show(err.message,true);}
}
function renderList(){
 var host=root.querySelector('.pd-list');if(!host)return;host.replaceChildren();
 var h=add(host,'div','pd-list-title');add(h,'h4','',activeType==='BL'?'Bons de livraison':'Factures');add(h,'span','',docs.filter(x=>x.kind===activeType).length+' document(s)');
 if(!docs.length){add(host,'p','pd-help','Aucun document enregistré pour le moment.');return;}
 docs.filter(x=>x.kind===activeType||(x.kind==='à déterminer'&&activeType==='BL')).forEach(function(doc){
  var row=add(host,'button','pd-doc');row.type='button';
  var left=add(row,'span','pd-doc-body');
  add(left,'strong','',doc.supplier||doc.filename);
  add(left,'small','',[(doc.kind||'Document'),doc.date||'',doc.documentNumber||''].filter(Boolean).join(' · '));
  var badge=add(row,'span','pd-doc-badge',doc.status||'à analyser');
  if(doc.status==='validé')badge.classList.add('confirmed');
  row.onclick=()=>openDocument(doc.id);
 });
}
function valueInput(p,label,value,type){
 var wrap=add(p,'label','pd-field');add(wrap,'span','',label);var input=add(wrap,'input','');input.type=type||'text';input.value=value??'';return input;
}
function productWords(value){
 var norm=String(value||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 var noise=new Set(['de','du','des','la','le','les','en','au','aux','a','et','avec','pour','kg','kgs','g','gr','l','cl','ml','pc','pcs','unite','unites','frais','fraiche','frais','qualite','origine']);
 return norm.split(/\s+/).filter(x=>x.length>1&&!noise.has(x));
}
function suggestCatalog(label,reference,limit){
 var words=productWords(label),ref=String(reference||'').trim().toLowerCase();
 if(!words.length&&!ref)return [];
 return productCatalog.map(function(p,index){
  var nameWords=productWords(p.name),intersection=words.filter(w=>nameWords.some(t=>t===w||w.length>4&&t.startsWith(w)||t.length>4&&w.startsWith(t))).length;
  var sameRef=ref&&[p.reference,p.code,p.sku,p.supplierReference].some(x=>x&&String(x).trim().toLowerCase()===ref);
  var score=(sameRef?100:0)+(words.length?intersection/words.length*70:0)+(nameWords.length?intersection/nameWords.length*20:0);
  if(words.length&&nameWords.join(' ')===words.join(' '))score+=25;
  return {index:index,score:score,product:p};
 }).filter(x=>x.score>=23).sort((a,b)=>b.score-a.score||a.product.name.localeCompare(b.product.name,'fr')).slice(0,limit||4);
}
function kindSelection(){return root?.querySelector('.pd-review select')?.value||activeType;}

var pdSubcats={
 'Bar':['Vins rouges','Vins blancs','Vins rosés','Champagnes & effervescents','Spiritueux','Bières & cidres','Softs & eaux','Cafés, thés & boissons chaudes','Sirops & ingrédients bar','Autres boissons'],
 'Cuisine':['Viandes & volailles','Poissons & fruits de mer','Fruits & légumes','Crèmerie & fromages','Épicerie salée','Épicerie sucrée','Surgelés','Pain & boulangerie','Autres cuisine'],
 'Hygiène':['Entretien','Consommables & emballages','Hygiène corporelle','Autres hygiène']
};
function pdGuess(label){
 var v=String(label||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 var tests=[
 ['Hygiène','Consommables & emballages',/serviette|nappe|sac kraft|barquette|gobelet|film alimentaire|papier cuisson|gant jetable|emballage/],
 ['Hygiène','Entretien',/detergent|desinfect|lessive|nettoy|javel|degraiss|liquide vaisselle/],
 ['Bar','Vins rouges',/vin rouge|bordeaux|bourgogne rouge|cotes du rhone/],
 ['Bar','Vins blancs',/vin blanc|chardonnay|muscadet|sauvignon blanc/],
 ['Bar','Vins rosés',/vin rose|rose de provence/],
 ['Bar','Champagnes & effervescents',/champagne|cremant|prosecco/],
 ['Bar','Bières & cidres',/biere|cidre|pression|ipa |lager/],
 ['Bar','Softs & eaux',/eau minerale|eau gazeuse|jus de fruit|limonade|cola|tonic/],
 ['Bar','Cafés, thés & boissons chaudes',/cafe|matcha|the vert|infusion/],
 ['Cuisine','Poissons & fruits de mer',/saumon|cabillaud|huitre|moule|crevette|thon|merlu|poisson/],
 ['Cuisine','Viandes & volailles',/boeuf|poulet|canard|porc|veau|agneau|volaille|jambon/],
 ['Cuisine','Crèmerie & fromages',/lait|creme fraiche|beurre|fromage|comte|mozzarella|emmental/],
 ['Cuisine','Pain & boulangerie',/baguette|pain de mie|brioche|croissant|pain burger/],
 ['Cuisine','Fruits & légumes',/tomate|pomme de terre|carotte|oignon|salade|citron|courgette|aubergine|poire|pomme/],
 ['Cuisine','Épicerie sucrée',/sucre|chocolat|vanille|confiture|miel|farine/]
 ];
 for(var t of tests)if(t[2].test(v))return {category:t[0],subcategory:t[1]};
 return {category:'',subcategory:''};
}

function lineInput(p,line,i){
 var row=add(p,'div','pd-line');add(row,'strong','','Ligne '+(i+1));
 var name=valueInput(row,'Produit sur le BL',line.description||'');
 var qty=valueInput(row,'Quantité livrée',line.quantity??'','number');qty.step='any';
 var unit=valueInput(row,'Unité / conditionnement détecté',line.unit||'');
 var price=valueInput(row,'Prix HT indiqué',line.unitPriceHT??'','number');price.step='any';
 var ref=valueInput(row,'Référence fournisseur',line.reference||'');
 // Correspondances suggérées : aucune modification sans sélection humaine.
 var wrap=add(row,'div','pd-match-area');
 add(wrap,'strong','pd-match-title','Correspondance catalogue');
 var suggestions=add(wrap,'div','pd-match-suggestions');
 var wrapSearch=add(wrap,'label','pd-field');
 add(wrapSearch,'span','','Autre référence : chercher dans le catalogue');
 var search=add(wrapSearch,'input','pd-catalog-search');search.type='search';search.placeholder='Rechercher par nom ou référence…';
 var selector=add(wrap,'select','pd-catalog-select');
 function rebuildOptions(query){
  var old=selector.value;
  selector.replaceChildren();
  var none=add(selector,'option','','Aucune correspondance — ne rien modifier');none.value='';
  var text=productWords(query).join(' '),matches=productCatalog.map((p,index)=>({p,index})).filter(function(item){
   return !text||productWords(item.p.name).join(' ').includes(text)||String(item.p.reference||item.p.code||'').toLowerCase().includes(String(query).toLowerCase());
  });
  matches.slice(0,180).forEach(function(item){
   var opt=add(selector,'option','',item.p.name+' · '+(item.p.category||'')+' · '+(item.p.unit||'unité inconnue'));
   opt.value=String(item.index);
  });
  if(old!==''&&productCatalog[Number(old)]&&!matches.slice(0,180).some(x=>x.index===Number(old))){
   var selected=productCatalog[Number(old)],extra=add(selector,'option','',selected.name+' · Référence sélectionnée');extra.value=old;
  }
  selector.value=old;
  if(selector.selectedIndex<0)selector.value='';
 }
 rebuildOptions('');
 if(Number.isInteger(line.catalogIndex)&&productCatalog[line.catalogIndex])selector.value=String(line.catalogIndex);
 else selector.value='';
 function updateSuggestions(){
  suggestions.replaceChildren();
  var candidates=suggestCatalog(name.value,ref.value,3);
  if(!candidates.length){add(suggestions,'small','pd-match-empty','Aucune correspondance proche trouvée. Utilise la recherche ci-dessous.');return;}
  candidates.forEach(function(x){
   var b=add(suggestions,'button','pd-match-proposal');
   b.type='button';
   var label=add(b,'span','pd-match-proposal-name',x.product.name);
   add(b,'small','',x.product.unit||x.product.category||'');
   var tag=add(b,'span','pd-match-proposal-tag',x.score>=90?'Correspondance forte':'À confirmer');
   if(selector.value===String(x.index))b.classList.add('selected');
   b.addEventListener('click',function(){selector.value=String(x.index);if(selector.value!==String(x.index)){rebuildOptions('');selector.value=String(x.index);}change();updateSuggestions();});
  });
 }
 search.addEventListener('input',function(){rebuildOptions(search.value);change();});
 name.addEventListener('input',updateSuggestions);
 ref.addEventListener('input',updateSuggestions);
 var reception=add(row,'div','pd-reception-fields');reception.style.gridColumn='1/-1';
 var received=valueInput(reception,'Quantité réellement reçue',line.receivedQuantity??'','number');received.step='any';
 var issueWrap=add(reception,'label','pd-field');add(issueWrap,'span','','Anomalie de livraison');var issue=add(issueWrap,'select','');
 [['','Aucune anomalie'],['manquant','Manquant'],['casse','Cassé / abîmé'],['non_livre','Non livré'],['double','Livré en double'],['mauvaise_reference','Mauvaise référence'],['autre','Autre litige']].forEach(([val,label])=>{var opt=add(issue,'option','',label);opt.value=val;});
 issue.value=line.issueType||'';
 var issueNote=valueInput(reception,'Note manuscrite / remarque',line.issueNote||'');
 function displayReception(){reception.style.display=kindSelection()==='BL'?'grid':'none';}
 if(window.__pdReceiveBindings)window.__pdReceiveBindings.push(displayReception);
 var updateRow=add(row,'label','pd-unit-update');
 var checkbox=add(updateRow,'input','');checkbox.type='checkbox';
 add(updateRow,'span','','Enregistrer cette unité dans la fiche produit après validation');
 var proposal=add(row,'div','pd-create-proposal');
 var createLabel=add(proposal,'label','pd-unit-update');
 var createNew=add(createLabel,'input','');createNew.type='checkbox';
 add(createLabel,'span','','Ajouter ce nouveau produit au catalogue après validation');
 var categories=add(proposal,'div','pd-new-product-selects');
 var cat=add(categories,'select','pd-catalog-select');
 [['','Catégorie à choisir'],['Bar','Bar'],['Cuisine','Cuisine'],['Hygiène','Hygiène']].forEach(function(pair){var option=add(cat,'option','',pair[1]);option.value=pair[0];});
 var subcat=add(categories,'select','pd-catalog-select');
 function updateSubcat(preferred){
  subcat.replaceChildren();var first=add(subcat,'option','','À classer');first.value='';
  (pdSubcats[cat.value]||[]).forEach(function(label){var o=add(subcat,'option','',label);o.value=label;});
  subcat.value=preferred||'';
 }
 var guess=pdGuess(line.description);cat.value=guess.category;updateSubcat(guess.subcategory);
 cat.addEventListener('change',function(){updateSubcat('');});
 var hint=add(proposal,'small','pd-help','Catégorie suggérée automatiquement si reconnue ; tu peux la corriger. Produit ajouté sans mouvement de stock.');
 var info=add(row,'small','pd-matched','');
 function change(){
  var product=selector.value!==''?productCatalog[Number(selector.value)]:null;
  var unfilled=product&&(!product.unit||product.unit.trim().toLowerCase()==='non précisée');
  var offered=!!(product&&unfilled&&unit.value.trim()&&unit.value.trim().toLowerCase()!=='non précisée');
  checkbox.disabled=!offered;
  if(!offered)checkbox.checked=false;
  updateRow.style.display=offered?'flex':'none';
  if(product){
   info.textContent='Catalogue : '+product.name+' · '+money(product.price)+' HT · '+(product.unit||'unité non précisée')+
    (offered?' · Complément possible':' · Unité existante conservée');
  }else info.textContent='Aucune correspondance enregistrée.';
  var fresh=selector.value===''&&kindSelection()==='facture';
  proposal.style.display=fresh?'grid':'none';createNew.disabled=!fresh;
  if(!fresh)createNew.checked=false;
 }
 selector.addEventListener('change',function(){change();updateSuggestions();});unit.addEventListener('input',change);change();updateSuggestions();
 add(row,'small','pd-warning','Vérifier carton, bouteille, kilo ou litre. Les prix du catalogue ne seront jamais modifiés.');
 return ()=>({data:{description:name.value.trim(),quantity:qty.value===''?null:Number(qty.value),unit:unit.value.trim(),unitPriceHT:price.value===''?null:Number(price.value),reference:ref.value.trim(),lineTotalHT:line.lineTotalHT??null,catalogIndex:selector.value===''?null:Number(selector.value),confidence:line.confidence||'low',receivedQuantity:received.value===''?null:Number(received.value),issueType:kindSelection()==='BL'?issue.value:'',issueNote:kindSelection()==='BL'?issueNote.value.trim():''},updateUnit:!checkbox.disabled&&checkbox.checked,createProduct:!createNew.disabled&&createNew.checked?{category:cat.value,subcategory:subcat.value}:null});
}
async function openOriginal(doc){
 try{var result=await call('GET','?id='+encodeURIComponent(doc.id)+'&original=1');
  var a=document.createElement('a');a.href=result.dataUri;a.download=result.filename||'document';document.body.appendChild(a);a.click();a.remove();
 }catch(err){show(err.message,true);}
}
async function openDocument(id){
 try{
  var response=await call('GET','?id='+encodeURIComponent(id));current=response.document;renderDetail();
 }catch(err){show(err.message,true);}
}
function renderDisputes(host,doc){
 var area=add(host,'section','pd-audit');add(area,'h4','','Litiges de réception · '+doc.disputes.length);
 doc.disputes.forEach(function(d){
  var row=add(area,'div','pd-audit-row');
  add(row,'strong','',d.description+' · '+d.issueType.replaceAll('_',' '));
  add(row,'small','',(d.note||'')+(d.expected!==null?' · Prévu '+d.expected:'')+(d.received!==null?' · Reçu '+d.received:''));
  var select=add(row,'select','pd-dispute-status');
  ['à signaler','signalé','avoir demandé','résolu'].forEach(x=>{var o=add(select,'option','',x);o.value=x;});
  select.value=d.status||'à signaler';
  select.addEventListener('change',async function(){
   try{var response=await call('POST','',{action:'dispute_status',id:doc.id,lineIndex:d.lineIndex,status:select.value});current=response.document;show('État du litige enregistré.');}
   catch(err){show(err.message,true);renderDetail();}
  });
 });
}
function renderPriceChanges(host,doc){
 var panel=add(host,'section','pd-audit');add(panel,'h4','','Variations de prix constatées');
 doc.priceChanges.forEach(function(change){
  var row=add(panel,'div','pd-audit-row');add(row,'strong','',change.description);
  var delta=add(row,'span',change.percent>0?'pd-price-up':'pd-price-down',(change.percent>0?'+':'')+change.percent.toLocaleString('fr-FR')+' %');
  add(row,'small','',money(change.previous)+' → '+money(change.current)+' HT / '+(change.unit||'unité')+' · précédent : '+change.previousDate);
 });
}
function renderReconciliation(host,doc){
 var area=add(host,'section','pd-audit');
 add(area,'h4','','Rapprochement avec '+doc.linkedBLs.length+' bon(s) de livraison');
 var rows=doc.reconciliation||[];
 if(!rows.length){add(area,'p','pd-help','Aucun écart détecté sur les informations comparables. Ceci ne remplace pas la vérification des marchandises.');return;}
 add(area,'p','pd-warning',rows.length+' point(s) à contrôler avant clôture commerciale.');
 rows.forEach(function(item){
  var row=add(area,'div','pd-audit-row');
  if(item.kind==='litige'){
   add(row,'strong','','BL '+(item.blNumber||'sans numéro')+' · '+item.description+' · '+item.issueType.replaceAll('_',' '));
   add(row,'small','',(item.note||'')+' · État : '+item.status);
  }else{
   add(row,'strong','','Écart de quantités · '+(item.description||item.key));
   add(row,'small','','Facturé : '+item.quantityBilled+' · Reçu sur BL liés : '+item.quantityReceived);
   add(row,'small','',item.note);
  }
 });
}
async function loadBLMatches(doc,host){
 if(doc.kind!=='facture'||doc.status==='validé')return;
 var area=add(host,'section','pd-audit'),heading=add(area,'h4','','Rapprochement avec les bons de livraison');
 add(area,'p','pd-help','Sélectionne les BL liés à cette facture. Les correspondances restent à confirmer.');
 selectedBLs=[];
 try{
  var result=await call('POST','',{action:'suggest_matches',id:doc.id});
  var matches=result.matches||[];
  if(!matches.length){add(area,'p','pd-help','Aucun BL validé correspondant dans l’historique.');return;}
  matches.forEach(function(m){
   var line=add(area,'label','pd-bl-match'),checkbox=add(line,'input','');checkbox.type='checkbox';
   add(line,'span','',(m.documentNumber||'BL sans numéro')+' · '+m.date+' · '+m.supplier+' · '+(m.disputes||0)+' litige(s) · '+m.score+' pts');
   checkbox.addEventListener('change',function(){if(checkbox.checked)selectedBLs.push(m.id);else selectedBLs=selectedBLs.filter(x=>x!==m.id);});
  });
 }catch(err){add(area,'p','pd-warning','Rapprochement indisponible : '+err.message);}
}
function renderDetail(){
 var host=root.querySelector('.pd-detail');if(!host)return;host.replaceChildren();
 if(!current){add(host,'p','pd-help','Sélectionne un document pour consulter son détail.');return;}
 var doc=current,header=add(host,'div','pd-detail-title');
 add(header,'h4','',doc.filename);
 var close=add(header,'button','pd-link','Fermer');close.onclick=()=>{current=null;renderDetail();};
 var actions=add(host,'div','pd-detail-actions');
 var original=add(actions,'button','pd-action pd-secondary','Voir le fichier original');original.onclick=()=>openOriginal(doc);
 if(doc.status!=='validé'){
  var analyze=add(actions,'button','pd-action','✦ Lire avec l’IA');
  analyze.disabled=busy;
  analyze.onclick=async()=>{
   if(busy)return;busy=true;analyze.disabled=true;show('Lecture IA en cours — aucun tarif ne sera modifié.');
   try{var r=await call('POST','',{action:'analyze',id:doc.id});current=r.document;await refresh();renderDetail();show('Lecture effectuée. Vérifie les informations avant validation.');}
   catch(err){show(err.message,true);}finally{busy=false;analyze.disabled=false;}
  };
 }
 if(doc.analysisError)add(host,'p','pd-warning','Analyse précédente : '+doc.analysisError);
 if(doc.status==='validé')add(host,'p','pd-approved','✓ Document validé et classé. '+(doc.catalogProductsCreated||0)+' produit(s) ajouté(s), '+(doc.catalogUnitsUpdated||0)+' unité(s) enrichie(s).');
 if(doc.kind==='BL'&&doc.disputes?.length)renderDisputes(host,doc);
 if(doc.kind==='facture'&&doc.priceChanges?.length)renderPriceChanges(host,doc);
 if(doc.kind==='facture'&&doc.linkedBLs?.length)renderReconciliation(host,doc);
 var form=add(host,'div','pd-review');
 var supplier=valueInput(form,'Fournisseur',doc.supplier||'');
 var date=valueInput(form,'Date du document',doc.date||'','date');
 var number=valueInput(form,'Numéro BL / facture',doc.documentNumber||'');
 var kindWrap=add(form,'label','pd-field');add(kindWrap,'span','','Type de document');var kind=add(kindWrap,'select','');
 ['BL','facture','inventaire','autre'].forEach(function(v){var o=add(kind,'option','',v);o.value=v;if(doc.kind===v)o.selected=true;});
 if(doc.kind==='facture'&&doc.status!=='validé')loadBLMatches(doc,host);
 var desc=add(host,'h5','','Lignes reconnues ('+doc.lines.length+')');
 if(!doc.lines.length)add(host,'p','pd-warning','Aucune ligne reconnue. Le document est archivé ; relance la lecture ou renseigne les informations indispensables.');
 window.__pdReceiveBindings=[];var lines=[],lineHost=add(host,'div','pd-lines');
 doc.lines.forEach((item,i)=>lines.push(lineInput(lineHost,item,i)));
 kind.addEventListener('change',function(){window.__pdReceiveBindings.forEach(fn=>fn());});
 if(doc.status!=='validé'){
  var note=add(host,'p','pd-help','Après validation, les nouveaux produits explicitement cochés seront ajoutés au catalogue avec leur catégorie suggérée et vérifiée. Aucune quantité en stock n’est créée, et les prix des produits existants restent inchangés.');
  var approve=add(host,'button','pd-action pd-approve','✓ Valider et classer');
  approve.onclick=async()=>{
   if(!supplier.value.trim()||!date.value){show('Indique le fournisseur et la date du document avant de valider.',true);return;}
   var checkedLines=lines.map(f=>f());var proposals=checkedLines.map((row,lineIndex)=>row.updateUnit?{lineIndex:lineIndex,catalogIndex:row.data.catalogIndex}:null).filter(Boolean);
   var newProducts=checkedLines.map((row,lineIndex)=>row.createProduct?{lineIndex:lineIndex,category:row.createProduct.category,subcategory:row.createProduct.subcategory}:null).filter(Boolean);
   if(newProducts.some(p=>!p.category)){show('Choisis une catégorie pour chaque nouveau produit coché.',true);return;}
   if(!confirm('Valider ce document, ajouter '+newProducts.length+' nouveau(x) produit(s) et enrichir '+proposals.length+' unité(s) ? Aucun stock ne sera ajouté automatiquement.'))return;
   approve.disabled=true;try{var r=await call('POST','',{action:'confirm',id:doc.id,supplier:supplier.value,date:date.value,documentNumber:number.value,kind:kind.value,lines:checkedLines.map(r=>r.data),catalogUnitUpdates:proposals,newCatalogProducts:newProducts,linkedBLs:selectedBLs});current=r.document;await refresh();renderDetail();show('Document validé · '+(r.document.catalogProductsCreated||0)+' produit(s) créé(s), '+(r.document.catalogUnitsUpdated||0)+' unité(s) enrichie(s).');}
   catch(err){show(err.message,true);}finally{approve.disabled=false;}
  };
 }else{
  supplier.disabled=true;date.disabled=true;number.disabled=true;kind.disabled=true;
  lineHost.querySelectorAll('input').forEach(x=>x.disabled=true);
 }
}
function install(){
 var page=document.getElementById('module-suppliers');if(!page)return;
 var holder=page.querySelector('.module-shell');if(!holder)return;
 root=add(holder,'div','pd-root');uploadCard();
 add(root,'div','pd-list');add(root,'div','pd-detail');renderList();renderDetail();
 var observer=new MutationObserver(function(){if(page.classList.contains('open'))refresh();});
 observer.observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('open'))refresh();
}
window.addEventListener('locean-purchase-section',function(event){
 activeType=event.detail?.kind==='facture'?'facture':'BL';
 current=null;selectedBLs=[];renderList();renderDetail();refresh();
});
var css=e('style');
css.textContent='.pd-create-proposal{display:grid;gap:7px;grid-column:1/-1;border:1px solid #d5e5dc;background:#f5faf7;border-radius:8px;padding:9px}.pd-new-product-selects{display:flex;flex-wrap:wrap;gap:7px}.pd-new-product-selects select{flex:1;min-width:135px}.pd-root{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-top:18px}.pd-root>section{grid-column:1/-1}.pd-card,.pd-list,.pd-detail{border:1px solid #e7e8e4;border-radius:11px;background:#fff;padding:17px;min-width:0}.pd-heading h3{font-size:16px;color:#0A3D62;margin:0 0 7px}.pd-heading p{font-size:12px;color:#71808b;line-height:1.5}.pd-upload-actions,.pd-detail-actions{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}.pd-action{display:inline-flex;gap:6px;align-items:center;justify-content:center;border:0;border-radius:8px;background:#0A3D62;color:#fff;padding:11px 13px;font:650 12px system-ui;cursor:pointer}.pd-action:disabled{opacity:.5;cursor:wait}.pd-secondary{background:#f3f5f4;color:#0A3D62;border:1px solid #e0e5e3}.pd-hidden{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none}.pd-help,.pd-status{font-size:11px;color:#71808b;line-height:1.5;margin:10px 0 0}.pd-list-title,.pd-detail-title{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:12px}.pd-list-title h4,.pd-detail-title h4{margin:0;color:#0A3D62;font-size:14px}.pd-list-title span{color:#83919c;font-size:11px}.pd-doc{display:flex;align-items:center;justify-content:space-between;gap:7px;border:0;border-bottom:1px solid #f0f1ef;padding:12px 0;background:white;width:100%;text-align:left;cursor:pointer}.pd-doc-body{display:flex;flex-direction:column;gap:5px;min-width:0}.pd-doc-body strong{font-size:12px;color:#293f4e;overflow-wrap:anywhere}.pd-doc-body small{color:#7f8992;font-size:10px}.pd-doc-badge{font-size:10px;background:#f5eee0;border-radius:7px;color:#8a651c;padding:5px;white-space:nowrap}.pd-doc-badge.confirmed{background:#e6f1e9;color:#24603e}.pd-link{background:none;border:none;color:#0A3D62;cursor:pointer}.pd-review{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pd-field{display:flex;flex-direction:column;gap:5px;color:#5b6d7a;font-size:10px;min-width:0}.pd-field input,.pd-field select{width:100%;max-width:100%;min-width:0;padding:9px;border:1px solid #dce0df;border-radius:7px;color:#263c48;box-sizing:border-box;font-size:12px}.pd-line{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px;margin:10px 0;border:1px solid #e9ece8;border-radius:8px}.pd-line>strong,.pd-line>small{grid-column:1/-1}.pd-line>strong{color:#0A3D62;font-size:12px}.pd-lines{max-height:440px;overflow-y:auto}.pd-warning{font-size:11px;color:#a06a30}.pd-approved{font-size:11px;color:#24603e}.pd-detail h5{font-size:13px;margin:17px 0 0}.pd-approve{margin-top:12px}.pd-matched{font-size:10px;color:#206a48}@media(max-width:940px){.pd-root{grid-template-columns:1fr}.pd-review{grid-template-columns:1fr}}';
css.textContent+=' .pd-match-area{grid-column:1/-1;border-top:1px solid #ecede9;padding-top:10px}.pd-match-title{display:block;font-size:11px;color:#0A3D62;margin-bottom:9px}.pd-match-suggestions{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:9px}.pd-match-proposal{flex:1 1 180px;min-width:0;border:1px solid #d9e2de;background:#f8fbfa;text-align:left;padding:10px;border-radius:8px;display:flex;flex-direction:column;gap:5px;cursor:pointer}.pd-match-proposal.selected{border-color:#2e7662;background:#edf7f2}.pd-match-proposal-name{font-size:11px;font-weight:700;color:#244659}.pd-match-proposal small{font-size:10px;color:#66737c}.pd-match-proposal-tag{font-size:10px;color:#55796e}.pd-match-empty{color:#89929a;font-size:11px}.pd-catalog-search{width:100%;border:1px solid #dce0de;border-radius:7px;padding:9px;font-size:12px;box-sizing:border-box;margin-bottom:8px}';
css.textContent+=' .pd-reception-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border:1px solid #eee7d9;background:#fffcf6;border-radius:9px;padding:9px;margin-top:7px}.pd-audit{border:1px solid #e5e8e4;padding:14px;margin:12px 0;border-radius:10px;background:#fafbf9}.pd-audit h4{font-size:14px;margin:0 0 10px}.pd-audit-row{display:flex;flex-direction:column;gap:5px;border-bottom:1px solid #ebece8;padding:9px 0;font-size:12px}.pd-audit-row small{color:#68737c}.pd-price-up{color:#af4134;font-weight:750}.pd-price-down{color:#237453;font-weight:750}.pd-dispute-status{max-width:200px;padding:7px}.pd-bl-match{display:flex;gap:9px;padding:8px;font-size:11px;cursor:pointer}.pd-bl-match input{accent-color:#0A3D62}@media(max-width:720px){.pd-reception-fields{grid-template-columns:1fr}}';
css.textContent+=' .pd-catalog-link{grid-column:1/-1}.pd-catalog-select{font-size:12px!important}.pd-unit-update{grid-column:1/-1;display:flex;align-items:center;gap:8px;background:#f8f3ed;padding:10px;border:1px solid #eae0d3;border-radius:8px;color:#332823;font-size:11px;cursor:pointer}.pd-unit-update input{width:17px;height:17px;accent-color:#806d61}.pd-unit-update span{flex:1}';document.head.appendChild(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();