/* L'Océan — Catalogue privé Achats & Fournisseurs (lecture et import CSV). */
(function(){
'use strict';
var all=[],ready=false,reference='',savedAt='',query='',category='Tous',offset=0,root;
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
function renderTable(){
 var host=root.querySelector('.purchases-results');host.replaceChildren();
 if(!ready){append(host,'p','purchases-empty','Aucun catalogue privé importé pour L’Océan. Le fichier reste sur ton appareil jusqu’à validation de l’import.');return;}
 var matches=all.filter(x=>(category==='Tous'||x.category===category)&&normalize(x.name).includes(normalize(query)));
 var heading=append(host,'div','purchases-count',matches.length+' référence(s) · prix d’achat HT · '+(reference||'inventaire'));
 var wrapper=append(host,'div','purchases-scroll'),table=append(wrapper,'table','purchases-table');
 var thead=append(table,'thead'),tr=append(thead,'tr');
 ['Produit','Pôle','Prix HT','Unité / conditionnement','Source'].forEach(v=>append(tr,'th','',v));
 var tbody=append(table,'tbody');
 matches.slice(offset,offset+50).forEach(function(p){
  var row=append(tbody,'tr');append(row,'td','purchases-name',p.name);append(row,'td','',p.category);
  append(row,'td','purchases-price',euro.format(p.price));
  append(row,'td','',p.unit||'Non précisée');append(row,'td','purchases-source',(p.source||'Feuil4')+(p.sourceRow?' · ligne '+p.sourceRow:''));
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
 append(title,'p','','Référentiel HT négocié · inventaire de septembre 2026 · consultation sécurisée');
 var stats=append(root,'div','purchases-stats');
 ['Bar','Cuisine','Hygiène'].forEach(function(cat){var box=append(stats,'div','purchases-stat');
 append(box,'small','',cat);append(box,'strong','',ready?String(all.filter(x=>x.category===cat).length):'—');});
 var tools=append(root,'div','purchases-tools');
 var search=append(tools,'input','purchases-search');search.type='search';search.placeholder='Rechercher un produit…';search.value=query;search.setAttribute('aria-label','Rechercher une référence');
 search.addEventListener('input',function(){query=this.value;offset=0;renderTable();});
 var filter=append(tools,'select','purchases-filter');
 ['Tous','Bar','Cuisine','Hygiène'].forEach(function(label){var opt=append(filter,'option','',label);opt.value=label;opt.selected=category===label;});
 filter.addEventListener('change',function(){category=this.value;offset=0;renderTable();});
 var upload=append(root,'div','purchases-upload');
 var row=append(upload,'div','purchases-upload-row');
 var input=append(row,'input','purchases-file');input.type='file';input.accept='.csv,text/csv';input.setAttribute('aria-label','Sélectionner le catalogue CSV');
 var btn=append(row,'button','purchases-primary',ready?'Remplacer le catalogue privé':'Importer le catalogue privé');btn.type='button';
 var status=append(upload,'p','purchases-state',ready?'Catalogue privé chargé'+(savedAt?' · enregistré le '+new Date(savedAt).toLocaleDateString('fr-FR'):''):'Charge le CSV extrait de ton inventaire pour activer le catalogue.');
 append(upload,'p','purchases-disclaimer','Import réservé aux comptes autorisés. Les prix ne sont pas publiés dans GitHub. Les conditionnements absents de la source restent indiqués comme non précisés.');
 btn.addEventListener('click',async function(){
  if(!input.files?.[0]){status.textContent='Sélectionne d’abord le CSV du catalogue.';return;}
  if(!confirm('Importer les prix HT dans le stockage privé ? Cela remplacera la version précédente du catalogue.'))return;
  btn.disabled=true;status.textContent='Vérification et import sécurisé…';
  try{var text=await input.files[0].text(),items=fromCSV(text);
   status.textContent=items.length+' références CSV vérifiées. Enregistrement privé en cours…';
   var result=await request('POST',{establishment:'LOCEAN',products:items});
   status.textContent=result.count+' références enregistrées dans le stockage privé.';await load();
  }catch(err){showError(err);console.error('Prism catalogue import',err);}finally{btn.disabled=false;}
 });
 append(root,'div','purchases-results');renderTable();
}
async function load(){
 try{var r=await request('GET');ready=r.ready;all=r.products||[];reference=r.reference||'';savedAt=r.savedAt||'';render();}
 catch(err){ready=false;all=[];render();showError(err);}
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
document.head.appendChild(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();