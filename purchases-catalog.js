/* L'Océan — Catalogue privé Achats & Fournisseurs (lecture et import CSV). */
(function(){
'use strict';
var all=[],ready=false,reference='',savedAt='',query='',category='Tous',subcategory='Tous',offset=0,root,importBusy=false,selectedFile=null,importConfirmed=false;
var euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:2});
function e(tag,cls,text){var x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
function append(p,tag,cls,text){var x=e(tag,cls,text);p.appendChild(x);return x;}
async function userToken(){
 var u=window.netlifyIdentity&&window.netlifyIdentity.currentUser();
 if(!u)throw Error('Session : connecte-toi dans Prism avant d’importer le catalogue.');
 try{
  var jwt=await u.jwt();
  if(typeof jwt==='string'&&jwt.split('.').length===3)return jwt;
  throw Error('Jeton de session invalide');
 }catch(err){
  // Certains navigateurs iOS renvoient une DOMException peu explicite
  // au rafraîchissement Identity. Un access token encore valide reste acceptable.
  var cached=u.token;
  if(cached&&cached.access_token&&Number(cached.expires_at||0)*(Number(cached.expires_at||0)<1e11?1000:1)>Date.now()+30000&&cached.access_token.split('.').length===3)return cached.access_token;
  throw Error('Session : impossible de renouveler la connexion sécurisée. Déconnecte-toi puis reconnecte-toi dans Prism. ('+(err.message||'erreur navigateur')+')');
 }
}
async function request(method,data){
 var token=await userToken(),url=new URL('/.netlify/functions/purchases',window.location.origin);
 var response;
 try{
  response=await fetch(url.href,{method:method,headers:{'Authorization':'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store',signal:AbortSignal.timeout(25000)});
 }catch(err){
  throw Error('Connexion Netlify : '+(err.name==='TimeoutError'?'délai dépassé':err.message||'requête refusée')+'. Vérifie le déploiement de test et ta connexion.');
 }
 var payload;
 try{payload=await response.json();}catch(_){throw Error('Service Netlify : réponse non JSON (HTTP '+response.status+'). Vérifier le déploiement des fonctions.');}
 if(!response.ok)throw Error('Serveur Netlify (HTTP '+response.status+') : '+(payload.error||'import refusé'));
 return payload;
}
function normalize(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
const SUBCATS={
 Bar:['Vins rouges','Vins blancs','Vins rosés','Champagnes & effervescents','Spiritueux','Bières & cidres','Softs & eaux','Cafés, thés & boissons chaudes','Sirops & ingrédients bar','Autres boissons'],
 Cuisine:['Viandes & volailles','Poissons & fruits de mer','Fruits & légumes','Crèmerie & fromages','Épicerie salée','Épicerie sucrée','Surgelés','Pain & boulangerie','Autres cuisine'],
 Hygiène:['Entretien','Consommables & emballages','Hygiène corporelle','Autres hygiène']
};
const LOCATIONS=['Bar','Cave','Réserve','Cuisine','Chambre froide','Autre'];
function productMatches(p){return (category==='Tous'||p.category===category)&&(subcategory==='Tous'||(subcategory==='À classer'?!p.subcategory:p.subcategory===subcategory))&&normalize(p.name).includes(normalize(query));}
function numeric(v){var n=Number(String(v??'').trim().replace(/\s|\u00a0/g,'').replace(',','.'));return Number.isFinite(n)?n:NaN;}
function csvRows(text){
 text=String(text||'').replace(/^\uFEFF/,'');var lines=[],line=[],value='',quoted=false;
 for(var i=0;i<text.length;i++){var c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(c===';'||c==='\t')){line.push(value);value='';}
  else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;line.push(value);if(line.some(Boolean))lines.push(line);line=[];value='';}
  else value+=c;
 }
 line.push(value);if(line.some(Boolean))lines.push(line);
 return lines;
}
function fromCSV(text){
 var rows=csvRows(text),header=(rows.shift()||[]).map(normalize);
 if(header[0]!=='pole'||header[1]!=='produit'||!header[2].includes('prix achat ht'))throw Error('Format CSV inattendu : utilise le fichier Catalogue_prix_HT_Ocean_import.csv.');
 var products=rows.map(function(r){
  return {category:r[0]==='Hygiène'?'Hygiène':r[0],name:(r[1]||'').trim(),price:numeric(r[2]),inventoryQuantity:numeric(r[3]),unit:r[4]||'Non précisée',source:r[5]||'Feuil4',sourceRow:r[6]||''};
 }).filter(p=>p.name);
 if(products.length<1||products.some(x=>!Number.isFinite(x.price)))throw Error('Prix HT manquant ou invalide dans le fichier.');
 return products;
}
function showError(err){var status=root&&root.querySelector('.purchases-state');if(status)status.textContent=err.message||String(err);}

function validHistory(p){return (p.priceHistory||[]).filter(h=>!h.invalidatedAt&&Number.isFinite(Number(h.price))).sort((a,b)=>String(a.at).localeCompare(String(b.at)));}
function priceChange(p){
 var entries=validHistory(p).filter(h=>normalize(h.unit)===normalize(p.unit));
 if(entries.length<2)return null;
 var prev=entries[entries.length-2],last=entries[entries.length-1];
 if(Number(prev.price)<=0)return null;
 return (Number(last.price)/Number(prev.price)-1)*100;
}
function badge(p){
 var change=priceChange(p),tag=e('span','purchases-delta');
 if(change===null){tag.textContent='—';tag.title='Pas encore de variation tarifaire comparable';return tag;}
 tag.textContent=(change>0?'+':'')+change.toLocaleString('fr-FR',{maximumFractionDigits:1})+' %';
 tag.classList.add(change>0?'is-up':change<0?'is-down':'is-flat');
 tag.title='Évolution par rapport au prix précédent, à conditionnement identique';
 return tag;
}
function openProduct(id,editFirst){
 var product=all.find(p=>p.id===id);if(!product)return;
 var overlay=e('div','purchases-detail-overlay'),panel=e('section','purchases-detail-panel');
 overlay.appendChild(panel);document.body.appendChild(overlay);
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Fiche produit : '+product.name);
 var prevFocus=document.activeElement;
 function close(){overlay.remove();document.removeEventListener('keydown',esc);if(prevFocus?.isConnected)prevFocus.focus();}
 function esc(ev){if(ev.key==='Escape')close();}
 document.addEventListener('keydown',esc);overlay.addEventListener('click',ev=>{if(ev.target===overlay)close();});
 var header=append(panel,'div','purchases-detail-header'),title=append(header,'div','purchases-detail-titles');
 append(title,'small','',product.category+' · '+(product.subcategory||'À classer')+' · Fiche produit');append(title,'h3','',product.name);
 var exit=append(header,'button','purchases-detail-close','Fermer ×');exit.type='button';exit.onclick=close;
 var tabs=append(panel,'div','purchases-detail-tabs');
 var infoBtn=append(tabs,'button','','Historique des prix'),editBtn=append(tabs,'button','','Modifier le produit');
 infoBtn.type=editBtn.type='button';
 var content=append(panel,'div','purchases-detail-content'),notice=append(panel,'p','purchases-detail-notice','');
 function setNotice(message,error){notice.textContent=message;notice.style.color=error?'#a6382e':'#28704b';}
 function chartView(period){
  var container=e('div','purchases-price-chart');
  var h=validHistory(product).filter(x=>normalize(x.unit)===normalize(product.unit));
  if(!h.length){append(container,'p','purchases-empty','Aucune variation de prix historisée pour ce conditionnement. Les premières observations commencent à leur date réelle d’enregistrement.');return container;}
  // Afficher chaque changement, y compris plusieurs prix au cours d'un même mois.
  var days=period==='month'?31:period==='year'?366:null;
  if(days){
   var since=Date.now()-days*86400000;
   var filtered=h.filter(x=>Date.parse(x.at)>=since);
   var before=h.filter(x=>Date.parse(x.at)<since);
   if(before.length)filtered.unshift(before[before.length-1]); // Prix de référence précédent.
   h=filtered;
  }
  if(!h.length){append(container,'p','purchases-empty','Aucun prix enregistré sur cette période. Essaie une période plus longue.');return container;}
  var points=h.map(x=>({date:period==='month'?new Date(x.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}):new Date(x.at).toLocaleDateString('fr-FR',{month:'2-digit',year:'2-digit'}),price:Number(x.price)}));
  if(points.length<2){append(container,'p','purchases-empty','Une seule observation disponible pour cette période.');}
  var width=620,height=235,left=62,right=22,top=22,bottom=43;
  var vals=points.map(x=>x.price),min=Math.min(...vals),max=Math.max(...vals);
  if(max===min){min=Math.max(0,min*.85);max=max?max*1.15:1;}
  else{var pad=(max-min)*.18;min=Math.max(0,min-pad);max+=pad;}
  var ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('role','img');svg.setAttribute('aria-label','Évolution du prix HT sur la période sélectionnée');
  function line(x1,y1,x2,y2,color,sw){var l=document.createElementNS(ns,'line');[['x1',x1],['y1',y1],['x2',x2],['y2',y2],['stroke',color],['stroke-width',sw]].forEach(([k,v])=>l.setAttribute(k,v));svg.appendChild(l);}
  function txt(x,y,t,anchor){var n=document.createElementNS(ns,'text');n.setAttribute('x',x);n.setAttribute('y',y);n.setAttribute('fill','#746659');n.setAttribute('font-size','11');n.setAttribute('text-anchor',anchor||'start');n.textContent=t;svg.appendChild(n);}
  for(var tick=0;tick<=4;tick++){var v=min+(max-min)*(4-tick)/4,y=top+(height-top-bottom)*tick/4;line(left,y,width-right,y,'#e8dfd5',1);txt(left-9,y+4,euro.format(v),'end');}
  function xPos(i){return left+(width-left-right)*(points.length===1?.5:i/(points.length-1));}
  function yPos(v){return top+(max-v)/(max-min)*(height-top-bottom);}
  var path=document.createElementNS(ns,'path'),d=points.map((p,i)=>(i?'L':'M')+xPos(i)+' '+yPos(p.price)).join(' ');
  path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke','#845a43');path.setAttribute('stroke-width','3');path.setAttribute('stroke-linejoin','round');svg.appendChild(path);
  points.forEach((p,i)=>{var circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',xPos(i));circle.setAttribute('cy',yPos(p.price));circle.setAttribute('r','4');circle.setAttribute('fill','#845a43');svg.appendChild(circle);if(points.length<=9||i===0||i===points.length-1)txt(xPos(i),height-17,p.date,'middle');});
  container.appendChild(svg);return container;
 }
 function history(){
  content.replaceChildren();
  var summary=append(content,'div','purchases-detail-summary');
  [['Prix HT courant',euro.format(product.price)],['Conditionnement',product.unit||'Non précisé'],['Évolution',badge(product).textContent]].forEach(([label,value])=>{var card=append(summary,'div','purchases-detail-stat');append(card,'small','',label);append(card,'strong','',value);});
  var heading=append(content,'div','purchases-history-heading');append(heading,'h4','','Historique tarifaire');
  var period=append(heading,'select','purchases-detail-select');
  [['month','1 mois'],['year','1 an'],['all','Tout l’historique']].forEach(([id,text])=>{var opt=append(period,'option','',text);opt.value=id;});
  var chart=append(content,'div','purchases-history-plot');function draw(){chart.replaceChildren(chartView(period.value));}period.onchange=draw;draw();
  append(content,'p','purchases-help','Chaque point représente une modification de tarif datée. La courbe compare uniquement les prix du même conditionnement ; les erreurs écartées ne sont pas tracées.');
  var rows=append(content,'div','purchases-history-entries');append(rows,'h4','','Journal des prix');
  var list=(product.priceHistory||[]).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  if(!list.length)append(rows,'p','purchases-empty','Aucun historique pour l’instant. La première modification enregistrera le prix de départ puis le nouveau prix.');
  list.forEach(x=>{
   var row=append(rows,'div','purchases-history-row'+(x.invalidatedAt?' is-invalid':'')),info=append(row,'div','purchases-history-info');
   append(info,'strong','',euro.format(Number(x.price))+' / '+(x.unit||'unité non renseignée'));
   append(info,'small','',new Date(x.at).toLocaleDateString('fr-FR')+' · '+(x.reason||x.source||'Prix enregistré'));
   if(x.invalidatedAt){append(info,'small','','Écarté : '+x.invalidatedReason);return;}
   var latest=validHistory(product).at(-1)?.id===x.id;
   if(!latest){
    var invalid=append(row,'button','purchases-history-invalid','Écarter');invalid.type='button';
    invalid.onclick=async()=>{
     var reason=prompt('Pourquoi ce prix est-il erroné ? Il restera dans le journal mais sera exclu des statistiques.');
     if(reason===null)return;if(reason.trim().length<8){setNotice('Indique une raison d’au moins 8 caractères.',true);return;}
     invalid.disabled=true;
     try{var result=await request('PATCH',{establishment:'LOCEAN',action:'invalidate-price',productId:id,entryId:x.id,reason});
      product=result.product;all=all.map(p=>p.id===id?product:p);renderTable();history();setNotice('Prix écarté de la courbe. Correction conservée dans le journal.');
     }catch(err){setNotice(err.message,true);invalid.disabled=false;}
    };
   }
  });
 }
 function edit(){
  content.replaceChildren();var form=append(content,'form','purchases-edit-form');
  function field(label,name,type,value){var wrap=append(form,'label','purchases-edit-field');append(wrap,'span','',label);var input=append(wrap,'input','purchases-edit-input');input.name=name;input.type=type;input.required=name!=='inventoryQuantity';input.value=value??'';return input;}
  var name=field('Nom du produit','name','text',product.name);
  var categoryField=append(form,'label','purchases-edit-field');append(categoryField,'span','','Famille');
  var categorySelect=append(categoryField,'select','purchases-edit-input');categorySelect.name='category';['Bar','Cuisine','Hygiène'].forEach(cat=>{var o=append(categorySelect,'option','',cat);o.value=cat;o.selected=product.category===cat;});
  var subField=append(form,'label','purchases-edit-field');append(subField,'span','','Sous-catégorie');
  var subSelect=append(subField,'select','purchases-edit-input');
  function fillSubs(){subSelect.replaceChildren();var blank=append(subSelect,'option','','À classer');blank.value='';(SUBCATS[categorySelect.value]||[]).forEach(x=>{var o=append(subSelect,'option','',x);o.value=x;});subSelect.value=product.subcategory||'';}
  categorySelect.onchange=fillSubs;fillSubs();
  var locationsWrap=append(form,'div','purchases-edit-field purchases-edit-locations');
  append(locationsWrap,'span','','Emplacements de stockage (plusieurs possibles)');
  var checks=append(locationsWrap,'div','purchases-location-checks');
  var locationControls=LOCATIONS.map(z=>{var lab=append(checks,'label','purchases-location-choice');var box=append(lab,'input');box.type='checkbox';box.value=z;box.checked=(product.locations||[]).includes(z);append(lab,'span','',z);return box;});
  var price=field('Prix d’achat HT (€)','price','number',product.price);price.min='0';price.step='0.0001';
  var unit=field('Unité / conditionnement','unit','text',product.unit);
  var qty=field('Quantité d’inventaire','inventoryQuantity','number',product.inventoryQuantity);qty.min='0';qty.step='any';
  var reason=field('Motif de modification (conseillé)','reason','text','');
  append(form,'p','purchases-help','Les variations de prix et de conditionnement sont historisées. Une correction n’efface jamais la valeur initiale.');
  var save=append(form,'button','purchases-save','Enregistrer les modifications');save.type='submit';
  form.onsubmit=async event=>{
   event.preventDefault();save.disabled=true;setNotice('Enregistrement sécurisé en cours…');
   try{
    var res=await request('PATCH',{establishment:'LOCEAN',action:'update',productId:id,changes:{name:name.value.trim(),category:categorySelect.value,subcategory:subSelect.value,locations:locationControls.filter(x=>x.checked).map(x=>x.value),price:price.value,unit:unit.value.trim(),inventoryQuantity:qty.value},reason:reason.value.trim()});
    product=res.product;all=all.map(p=>p.id===id?product:p);render();title.querySelector('h3').textContent=product.name;setActive('history');setNotice('Produit mis à jour et historique conservé.');
   }catch(err){save.disabled=false;setNotice(err.message,true);}
  };
 }
 function setActive(which){infoBtn.classList.toggle('active',which==='history');editBtn.classList.toggle('active',which==='edit');which==='edit'?edit():history();}
 infoBtn.onclick=()=>setActive('history');editBtn.onclick=()=>setActive('edit');setActive(editFirst?'edit':'history');exit.focus();
}

function renderTable(){
 var host=root.querySelector('.purchases-results');host.replaceChildren();
 if(!ready){append(host,'p','purchases-empty','Aucun catalogue privé importé pour L’Océan. Le fichier reste sur ton appareil jusqu’à validation de l’import.');return;}
 var matches=all.filter(productMatches);
 var heading=append(host,'div','purchases-count',matches.length+' référence(s) · prix d’achat HT · '+(reference||'inventaire'));
 var wrapper=append(host,'div','purchases-scroll'),table=append(wrapper,'table','purchases-table');
 var thead=append(table,'thead'),tr=append(thead,'tr');
 ['Produit','Catégorie','Prix HT','Évolution','Conditionnement','Modifier'].forEach(v=>append(tr,'th','',v));
 var tbody=append(table,'tbody');
 var mobileCards=append(host,'div','purchases-mobile-cards');
 matches.slice(offset,offset+50).forEach(function(p){
  var row=append(tbody,'tr');var nameCell=append(row,'td','purchases-name');var productLink=append(nameCell,'button','purchases-product-link',p.name);productLink.type='button';productLink.onclick=()=>openProduct(p.id,false);append(row,'td','',p.subcategory||'À classer');
  append(row,'td','purchases-price',euro.format(p.price));
  var diff=append(row,'td','');diff.appendChild(badge(p));
  append(row,'td','',p.unit||'Non précisée');var editCell=append(row,'td','');var editAction=append(editCell,'button','purchases-edit-trigger','Modifier');editAction.type='button';editAction.onclick=()=>openProduct(p.id,true);
  var tile=append(mobileCards,'article','purchases-mobile-item');
  var top=append(tile,'div','purchases-mobile-top');
  var mobileLink=append(top,'button','purchases-product-link purchases-mobile-name',p.name);mobileLink.type='button';mobileLink.onclick=()=>openProduct(p.id,false);
  append(top,'span','purchases-mobile-category',p.subcategory||'À classer');
  var cells=append(tile,'div','purchases-mobile-fields');
  var cost=append(cells,'div','purchases-mobile-field');append(cost,'small','','Prix d’achat HT');append(cost,'b','',euro.format(p.price));
  var units=append(cells,'div','purchases-mobile-field');append(units,'small','','Conditionnement');append(units,'span','',p.unit||'Non précisée');
  var foot=append(tile,'div','purchases-mobile-source');foot.appendChild(badge(p));var editMobile=append(foot,'button','purchases-edit-trigger','Modifier');editMobile.type='button';editMobile.onclick=()=>openProduct(p.id,true);
 });
 if(!matches.length)append(host,'p','purchases-empty','Aucune référence trouvée.');
 if(matches.length>50){var nav=append(host,'div','purchases-pages');var prev=append(nav,'button','','← Précédent');prev.disabled=offset===0;prev.onclick=()=>{offset=Math.max(0,offset-50);renderTable();};
 append(nav,'span','',(Math.floor(offset/50)+1)+' / '+Math.ceil(matches.length/50));
 var next=append(nav,'button','','Suivant →');next.disabled=offset+50>=matches.length;next.onclick=()=>{offset+=50;renderTable();};}
}
function render(){
 root.replaceChildren();
 var title=append(root,'div','purchases-heading');
 append(title,'h3','','Catalogue des prix d’achat — L’Océan');
 append(title,'p','','Référentiel de gestion · familles, catégories et emplacements · prix HT historisés');
 var stats=append(root,'div','purchases-stats');
 ['Bar','Cuisine','Hygiène'].forEach(function(cat){var box=append(stats,'div','purchases-stat');
 append(box,'small','',cat);append(box,'strong','',ready?String(all.filter(x=>x.category===cat).length):'—');});
 var shelf=append(root,'div','purchases-category-shelf');
 ['Tous','Bar','Cuisine','Hygiène'].forEach(function(cat){
  var card=append(shelf,'button','purchases-category-card'+(category===cat?' active':''));card.type='button';
  append(card,'strong','',cat==='Tous'?'Tous les produits':cat);
  append(card,'small','',ready?String(all.filter(x=>cat==='Tous'||x.category===cat).length)+' références':'—');
  card.onclick=function(){category=cat;subcategory='Tous';offset=0;render();};
 });
 var subs=append(root,'div','purchases-subcategory-nav');
 var subopts=category==='Tous'?[]:SUBCATS[category]||[];
 ['Tous',...subopts,'À classer'].forEach(function(label){
  if(category==='Tous'&&label!=='Tous')return;
  var count=all.filter(x=>(category==='Tous'||x.category===category)&&(label==='Tous'||(label==='À classer'?!x.subcategory:x.subcategory===label))).length;
  var chip=append(subs,'button','purchases-subcategory-chip'+(subcategory===label?' active':''),label+(label==='Tous'?'':' · '+count));
  chip.type='button';chip.onclick=function(){subcategory=label;offset=0;render();};
 });
 var unclassified=all.filter(x=>!x.subcategory).length;
 if(ready&&unclassified)append(root,'p','purchases-classification-note',unclassified+' produit(s) encore à classer. Les références existantes n’ont pas été recatégorisées automatiquement : ouvre Modifier pour choisir leur catégorie.');
 var tools=append(root,'div','purchases-tools');
 var search=append(tools,'input','purchases-search');search.type='search';search.placeholder='Rechercher un produit…';search.value=query;search.setAttribute('aria-label','Rechercher une référence');
 search.addEventListener('input',function(){query=this.value;offset=0;renderTable();});
 var filter=append(tools,'select','purchases-filter');
 ['Tous','Bar','Cuisine','Hygiène'].forEach(function(label){var opt=append(filter,'option','',label);opt.value=label;opt.selected=category===label;});
 filter.addEventListener('change',function(){category=this.value;subcategory='Tous';offset=0;render();});
 var upload=append(root,'div','purchases-upload');
 var row=append(upload,'div','purchases-upload-row');
 var input=append(row,'input','purchases-file');input.type='file';input.accept='.csv,text/csv,text/plain';input.setAttribute('aria-label','Sélectionner le catalogue CSV');input.addEventListener('change',function(){selectedFile=this.files&&this.files[0]||null;importConfirmed=false;var b=root.querySelector('.purchases-primary');if(b)b.textContent=ready?'Remplacer le catalogue privé':'Importer le catalogue privé';var st=root.querySelector('.purchases-state');if(st&&selectedFile)st.textContent='Fichier sélectionné : '+selectedFile.name+' · Cliquer sur Importer.';});
 var btn=append(row,'button','purchases-primary',ready?'Remplacer le catalogue privé':'Importer le catalogue privé');btn.type='button';
 var status=append(upload,'p','purchases-state',ready?'Catalogue privé chargé'+(savedAt?' · enregistré le '+new Date(savedAt).toLocaleDateString('fr-FR'):''):'Charge le CSV extrait de ton inventaire pour activer le catalogue.');
 append(upload,'p','purchases-disclaimer','Import réservé aux comptes autorisés. Les prix ne sont pas publiés dans GitHub. Les conditionnements absents de la source restent indiqués comme non précisés.');
 btn.addEventListener('click',async function(event){
  event.preventDefault();
  if(importBusy)return;
  var file=selectedFile||(input.files&&input.files[0]);
  if(!file){status.textContent='Choisis d’abord le fichier CSV puis appuie sur Importer.';return;}
  if(ready&&!importConfirmed){
   importConfirmed=true;btn.textContent='Confirmer le remplacement';status.textContent='Un catalogue existe déjà. Appuie une seconde fois pour le remplacer. Les unités enrichies peuvent être perdues.';
   return;
  }
  importBusy=true;btn.disabled=true;status.textContent='Lecture du fichier CSV sur ton appareil…';
  try{
   var raw=await file.text(),items=fromCSV(raw);
   status.textContent=items.length+' références reconnues. Vérification de la session…';
   // Send securely only after the CSV has been fully validated.
   var result=await request('POST',{establishment:'LOCEAN',products:items});
   selectedFile=null;importConfirmed=false;
   ready=true;reference='Inventaire L’Océan · septembre 2026';savedAt=result.savedAt||'';all=result.products||items;offset=0;
   render();var success=root.querySelector('.purchases-state');
   if(success)success.textContent='✓ '+result.count+' références enregistrées et disponibles dans le catalogue privé.';
  }catch(err){
   status.textContent='Import non terminé : '+(err.message||String(err));
   console.error('Prism catalogue import',err);
  }finally{importBusy=false;btn.disabled=false;}
 });
 append(root,'div','purchases-results');renderTable();
}
async function load(){
 if(importBusy)return;
 try{var r=await request('GET');if(importBusy)return;ready=r.ready;all=r.products||[];reference=r.reference||'';savedAt=r.savedAt||'';render();}
 catch(err){if(importBusy)return;ready=false;all=[];render();showError(err);}
}
function install(){
 var page=document.getElementById('module-suppliers');if(!page)return;root=page.querySelector('.module-placeholder');if(!root)return;
 root.classList.add('purchases-root');root.style.textAlign='left';root.style.display='block';
 render();
 var observer=new MutationObserver(function(){if(page.classList.contains('open')){observer.disconnect();load();}});
 observer.observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('open'))load();
}
var css=e('style');
css.textContent='.purchases-root{padding:0!important;max-width:100%!important}.purchases-heading h3{font-size:20px;color:#0A3D62;margin:5px 0}.purchases-heading p,.purchases-disclaimer{font-size:11px;color:#71808b;line-height:1.6}.purchases-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:22px 0}.purchases-stat{border:1px solid #e6e8e6;border-radius:10px;padding:15px;background:white;display:flex;flex-direction:column;gap:5px}.purchases-stat small{color:#78818c}.purchases-stat strong{font-size:25px;color:#0A3D62}.purchases-tools{display:flex;gap:10px;margin-bottom:15px}.purchases-search,.purchases-filter,.purchases-file{border:1px solid #dce0de;border-radius:8px;padding:11px;font-size:12px;background:#fff}.purchases-search{flex:1;min-width:0}.purchases-upload{padding:14px 17px;background:#f8f9f7;border:1px solid #e6e8e5;border-radius:10px;margin:12px 0 20px}.purchases-upload-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.purchases-file{max-width:340px}.purchases-primary{background:#0A3D62;color:#fff;border:0;border-radius:8px;padding:12px 14px;cursor:pointer;font-size:12px}.purchases-primary:disabled{opacity:.6}.purchases-state{font-size:12px;color:#314a5d;margin:11px 0 0}.purchases-results{margin-top:10px}.purchases-count{font-size:11px;color:#70808a;margin-bottom:9px}.purchases-scroll{overflow-x:auto;border:1px solid #e5e8e6;border-radius:10px;background:#fff}.purchases-table{width:100%;border-collapse:collapse;text-align:left;font-size:12px}.purchases-table th{background:#f4f6f5;color:#62707b;font-weight:700;font-size:10px;white-space:nowrap}.purchases-table th,.purchases-table td{padding:12px 13px;border-bottom:1px solid #eceeeb}.purchases-name{font-weight:650;color:#233e51}.purchases-price{font-weight:700;color:#0A3D62;white-space:nowrap}.purchases-source{font-size:10px;color:#8b949b}.purchases-empty{font-size:12px;color:#71808b;padding:15px}.purchases-pages{display:flex;gap:15px;align-items:center;justify-content:center;margin:15px}.purchases-pages button{border:1px solid #ddd;background:#fff;border-radius:7px;padding:8px 11px;cursor:pointer}@media(max-width:650px){.purchases-stats{gap:7px}.purchases-tools{flex-direction:column}.purchases-upload-row{align-items:stretch}.purchases-file{max-width:100%}}';
css.textContent+="\n.purchases-mobile-cards{display:none}\n@media(max-width:760px){\n #module-suppliers .purchases-scroll{display:none!important}\n #module-suppliers .purchases-mobile-cards{display:flex;flex-direction:column;gap:10px;width:100%;box-sizing:border-box}\n #module-suppliers .purchases-results{min-width:0}\n #module-suppliers .purchases-mobile-item{background:#FFFCF7;border:1px solid #D7C8B8;border-radius:14px;padding:15px;min-width:0;box-shadow:0 3px 12px rgba(51,40,35,.035)}\n #module-suppliers .purchases-mobile-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}\n #module-suppliers .purchases-mobile-name{font-size:15px;line-height:1.35;color:#2B211D;overflow-wrap:anywhere;flex:1;min-width:0}\n #module-suppliers .purchases-mobile-category{font-size:10px;font-weight:750;color:#655448;background:#EDE1D3;border-radius:99px;padding:5px 9px;white-space:nowrap}\n #module-suppliers .purchases-mobile-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:13px;padding-top:12px;border-top:1px solid #EAE0D3}\n #module-suppliers .purchases-mobile-field{display:flex;flex-direction:column;gap:6px;min-width:0}\n #module-suppliers .purchases-mobile-field small{font-size:10px;color:#786A5D}\n #module-suppliers .purchases-mobile-field b{font-size:19px;color:#332823;letter-spacing:-.03em}\n #module-suppliers .purchases-mobile-field span{font-size:12px;color:#42362D;overflow-wrap:anywhere;line-height:1.45}\n #module-suppliers .purchases-mobile-source{margin-top:12px;font-size:10px;color:#806D61}\n #module-suppliers .purchases-count{font-size:12px;line-height:1.5;color:#52453A;margin:15px 0 12px}\n}\n";
css.textContent += '\n/* Fiche produit et historique de prix — responsive Prism */\n'
+'.purchases-product-link{background:none;border:0;padding:0;text-align:left;cursor:pointer;font:inherit;font-weight:700;color:#4e3327;text-decoration:underline;text-decoration-color:#c9b7a9;text-underline-offset:3px}.purchases-product-link:hover{color:#946045}.purchases-edit-trigger{border:1px solid #d4c3b2;background:#fffaf5;color:#513c30;font-size:11px;font-weight:750;border-radius:8px;padding:8px 11px;cursor:pointer}.purchases-mobile-source{display:flex;align-items:center;justify-content:space-between;gap:10px}.purchases-delta{display:inline-block;border-radius:6px;padding:5px 7px;background:#f2ede7;color:#786c61;font-size:11px;font-weight:750;white-space:nowrap}.purchases-delta.is-up{background:#fbefeb;color:#a54737}.purchases-delta.is-down{background:#e9f5ed;color:#287a51}.purchases-delta.is-flat{background:#f2ede7;color:#7a6d61}'
+'.purchases-detail-overlay{position:fixed;inset:0;z-index:100002;background:rgba(35,25,20,.7);display:flex;justify-content:center;align-items:center;padding:15px;box-sizing:border-box}.purchases-detail-panel{background:#fffdf9;color:#332823;width:min(100%,740px);max-height:94dvh;overflow-y:auto;border-radius:16px;padding:22px;box-shadow:0 14px 55px rgba(0,0,0,.24)}.purchases-detail-header{display:flex;gap:12px;justify-content:space-between;align-items:start}.purchases-detail-titles{min-width:0}.purchases-detail-titles small{font-size:11px;color:#847467}.purchases-detail-titles h3{font-size:21px;color:#332823;margin:5px 0 12px;overflow-wrap:anywhere}.purchases-detail-close{border:1px solid #e0d2c3;background:#f5eee7;color:#45362c;border-radius:8px;padding:9px 12px;cursor:pointer;white-space:nowrap}.purchases-detail-tabs{display:flex;gap:8px;border-bottom:1px solid #e9ded1;padding-bottom:11px;margin:9px 0 17px}.purchases-detail-tabs button{border:1px solid #dfd0c1;background:transparent;color:#55473c;border-radius:7px;padding:10px;font-size:12px;cursor:pointer}.purchases-detail-tabs button.active{background:#332823;color:white;border-color:#332823}'
+'.purchases-detail-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.purchases-detail-stat{display:flex;flex-direction:column;gap:6px;background:#f5eee6;border-radius:9px;padding:12px;min-width:0}.purchases-detail-stat small{font-size:11px;color:#796b60}.purchases-detail-stat strong{font-size:15px;color:#332823;overflow-wrap:anywhere}.purchases-history-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:21px 0 8px}.purchases-history-heading h4,.purchases-history-entries h4{font-size:13px;color:#332823;margin:0}.purchases-detail-select{border:1px solid #dacbbd;border-radius:7px;background:white;padding:8px;color:#332823}.purchases-price-chart{background:#fff;border:1px solid #e9ded2;border-radius:10px;padding:9px;min-height:155px}.purchases-price-chart svg{display:block;width:100%;height:auto}.purchases-help{font-size:11px;color:#89776a;line-height:1.6;margin:10px 0}.purchases-history-entries{margin:21px 0 0}.purchases-history-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid #eee5dc}.purchases-history-info{display:flex;flex-direction:column;gap:5px;min-width:0}.purchases-history-info strong{font-size:12px}.purchases-history-info small{font-size:11px;color:#7f7064}.purchases-history-row.is-invalid{opacity:.6}.purchases-history-row.is-invalid strong{text-decoration:line-through}.purchases-history-invalid{border:1px solid #e3b9b3;background:#fff6f5;color:#9c4338;border-radius:7px;font-size:11px;padding:8px 11px;cursor:pointer;white-space:nowrap}'
+'.purchases-edit-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.purchases-edit-field{display:flex;flex-direction:column;gap:6px;min-width:0}.purchases-edit-field span{font-size:11px;font-weight:700;color:#6a594e}.purchases-edit-input{width:100%;box-sizing:border-box;background:#fff;color:#332823;border:1px solid #d9c8b7;border-radius:7px;font-size:13px;padding:11px}.purchases-save{border:0;border-radius:8px;background:#332823;color:white;padding:12px 16px;cursor:pointer;font-weight:700;font-size:12px}.purchases-save:disabled{opacity:.5}.purchases-detail-notice{font-size:12px;min-height:16px;margin:15px 0 0}'
+'@media(max-width:600px){.purchases-detail-panel{padding:15px}.purchases-detail-titles h3{font-size:18px}.purchases-detail-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.purchases-edit-form{grid-template-columns:1fr}.purchases-detail-tabs button{font-size:11px}}';
css.textContent+='\n.purchases-category-shelf{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0 10px}.purchases-category-card{background:#fffcf7;border:1px solid #ded0c1;border-radius:12px;padding:14px 12px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;text-align:left;color:#332823;cursor:pointer}.purchases-category-card strong{font-size:13px}.purchases-category-card small{font-size:11px;color:#78695c}.purchases-category-card.active{border-color:#71503b;background:#eee1d2;box-shadow:inset 0 0 0 1px #71503b}.purchases-subcategory-nav{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:10px 0 15px}.purchases-subcategory-chip{border:1px solid #d9c8b9;color:#554235;background:#fffdf9;border-radius:99px;padding:8px 11px;font-size:11px;cursor:pointer}.purchases-subcategory-chip.active{background:#332823;color:#fff;border-color:#332823}.purchases-classification-note{font-size:11px;color:#76634e;margin:4px 0 13px}.purchases-edit-locations{grid-column:1/-1}.purchases-location-checks{display:flex;flex-wrap:wrap;gap:8px}.purchases-location-choice{display:flex;align-items:center;gap:6px;background:#f5eee6;border:1px solid #e3d7c9;border-radius:8px;padding:8px 10px;font-size:11px;color:#4b3a30}.purchases-location-choice input{accent-color:#6b4b36}@media(max-width:760px){.purchases-category-shelf{grid-template-columns:repeat(2,minmax(0,1fr))}.purchases-category-card{padding:12px}.purchases-subcategory-chip{padding:9px 11px}}';
document.head.appendChild(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();