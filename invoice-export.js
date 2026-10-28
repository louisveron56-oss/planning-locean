/* Prism : exports comptables privés. Fichiers originaux + index CSV. */
(function(){
'use strict';
function el(t,c,v){var x=document.createElement(t);if(c)x.className=c;if(v!==undefined)x.textContent=v;return x;}
function norm(v){return String(v||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function safe(v){return String(v||'document').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_.-]+/g,'_').slice(0,110);}
function quote(v){return '"'+String(v??'').replace(/"/g,'""').replace(/\r|\n/g,' ')+'"';}
var enc=new TextEncoder(),table=Array.from({length:256},(_,n)=>{for(var k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(data){var c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function w16(n){return new Uint8Array([n&255,n>>>8&255]);}
function w32(n){return new Uint8Array([n&255,n>>>8&255,n>>>16&255,n>>>24&255]);}
function combine(parts){var output=new Uint8Array(parts.reduce((n,x)=>n+x.length,0)),i=0;for(const item of parts){output.set(item,i);i+=item.length;}return output;}
function zip(files){
 var parts=[],center=[],offset=0;
 for(const f of files){
  var name=enc.encode(f.name),length=f.bytes.length,check=crc(f.bytes);
  var local=combine([w32(0x04034b50),w16(20),w16(0x800),w16(0),w16(0),w16(0),w32(check),w32(length),w32(length),w16(name.length),w16(0),name]);
  var dir=combine([w32(0x02014b50),w16(20),w16(20),w16(0x800),w16(0),w16(0),w16(0),w32(check),w32(length),w32(length),w16(name.length),w16(0),w16(0),w16(0),w16(0),w32(0),w32(offset),name]);
  parts.push(local,f.bytes);center.push(dir);offset+=local.length+length;
 }
 var central=combine(center),end=combine([w32(0x06054b50),w16(0),w16(0),w16(files.length),w16(files.length),w32(central.length),w32(offset),w16(0)]);
 return new Blob([...parts,...center,end],{type:'application/zip'});
}
async function token(){var u=window.netlifyIdentity?.currentUser();if(!u)throw Error('Connexion requise.');return u.jwt();}
async function api(query){var jwt=await token(),r=await fetch('/.netlify/functions/purchase-documents'+(query||''),{headers:{Authorization:'Bearer '+jwt},cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'Document indisponible');return data;}
function getBytes(data){var uri=String(data.dataUri||''),type=data.mime;if(!uri.startsWith('data:'+type+';base64,'))throw Error('Document original invalide.');var binary=atob(uri.split(',')[1]),out=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;}
function download(blob,name){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function ext(m){return m==='application/pdf'?'.pdf':m==='image/png'?'.png':m==='image/webp'?'.webp':'.jpg';}
function manifest(docs){var header=['Établissement','Fournisseur','Date','Numéro facture','Nom de fichier','Statut','Identifiant','Commentaire'];var rows=[header.map(quote).join(';')];docs.forEach(d=>rows.push(['LOCEAN',d.supplier,d.date,d.documentNumber,d.filename,d.status,d.id,'Montants HT, TVA et TTC : non certifiés dans Prism'].map(quote).join(';')));return enc.encode('\ufeff'+rows.join('\r\n')+'\r\n');}
function modal(opts){
 var all=[],isBusy=false,screen=el('div','px-shade'),panel=el('section','px-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Export de factures');screen.appendChild(panel);document.body.appendChild(screen);
 var top=el('div','px-top');top.appendChild(el('h3','','Export comptable'));var close=el('button','px-light','Fermer');top.appendChild(close);panel.appendChild(top);
 panel.appendChild(el('p','px-muted','Factures validées · L’Océan · archives originales'));
 function field(label,type){var wrap=el('label','px-field');wrap.appendChild(el('span','',label));var input=el(type==='select'?'select':'input','px-input');if(type!=='select')input.type=type;wrap.appendChild(input);panel.appendChild(wrap);return {wrap,input};}
 var scope=field('Périmètre','select'),supplier=field('Fournisseur','select'),invoice=field('Facture','select'),dates=el('div','px-dates');
 var f=el('label','px-field'),t=el('label','px-field');f.appendChild(el('span','','Du'));t.appendChild(el('span','','Au'));var from=el('input','px-input'),to=el('input','px-input');from.type=to.type='date';f.appendChild(from);t.appendChild(to);dates.append(f,t);panel.appendChild(dates);
 [['all','Toutes les factures'],['supplier','Un fournisseur'],['single','Une facture']].forEach(([v,l])=>{var o=el('option','',l);o.value=v;scope.input.appendChild(o);});
 var status=el('p','px-status','Chargement des factures…');status.setAttribute('aria-live','polite');panel.appendChild(status);
 var go=el('button','px-go','Télécharger');go.disabled=true;panel.appendChild(go);
 var previous=document.activeElement;function dismiss(){if(isBusy)return;document.removeEventListener('keydown',esc);screen.remove();if(previous?.isConnected)previous.focus();}
 function esc(ev){if(ev.key==='Escape')dismiss();}document.addEventListener('keydown',esc);close.onclick=dismiss;screen.addEventListener('click',ev=>{if(ev.target===screen)dismiss();});close.focus();
 function options(){
  var previousSupplier=supplier.input.value,names=[...new Map(all.map(d=>[norm(d.supplier),d.supplier])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'fr'));
  supplier.input.replaceChildren();names.forEach(([k,name])=>{var o=el('option','',name);o.value=k;supplier.input.appendChild(o);});
  if(names.some(x=>x[0]===previousSupplier))supplier.input.value=previousSupplier;
  if(opts?.supplier&&!supplier.input.dataset.initialized&&names.some(x=>x[0]===norm(opts.supplier)))supplier.input.value=norm(opts.supplier);
  supplier.input.dataset.initialized='1';
  invoice.input.replaceChildren();
  all.filter(d=>scope.input.value!=='supplier'||norm(d.supplier)===supplier.input.value).sort((a,b)=>String(b.date).localeCompare(String(a.date))).forEach(d=>{var o=el('option','',(d.date||'Sans date')+' · '+d.supplier+' · '+(d.documentNumber||d.filename));o.value=d.id;invoice.input.appendChild(o);});
  if(opts?.id&&!invoice.input.dataset.initialized&&all.some(d=>d.id===opts.id))invoice.input.value=opts.id;
  invoice.input.dataset.initialized='1';
  supplier.wrap.hidden=scope.input.value!=='supplier';invoice.wrap.hidden=scope.input.value!=='single';dates.hidden=scope.input.value==='single';
 }
 scope.input.onchange=options;supplier.input.onchange=options;
 go.onclick=async()=>{
  if(isBusy)return;
  var docs=all.filter(d=>scope.input.value==='single'?d.id===invoice.input.value:(scope.input.value==='all'||norm(d.supplier)===supplier.input.value)&&(!from.value||(d.date&&d.date>=from.value))&&(!to.value||(d.date&&d.date<=to.value)));
  if(scope.input.value!=='single'&&(!from.value||!to.value||from.value>to.value)){status.textContent='Sélectionne une période valide.';return;}
  if(!docs.length){status.textContent='Aucune facture validée sur cette période.';return;}
  isBusy=true;go.disabled=true;close.disabled=true;
  try{
   if(scope.input.value==='single'){
    var d=docs[0],result=await api('?id='+encodeURIComponent(d.id)+'&original=1');
    download(new Blob([getBytes(result)],{type:result.mime}),safe((d.date||'sans_date')+'_'+d.supplier+'_'+(d.documentNumber||d.id))+ext(result.mime));
    status.textContent='Facture originale téléchargée.';
   }else{
    var common=safe('PRISM_LOCEAN_'+(scope.input.value==='supplier'?supplier.input.options[supplier.input.selectedIndex]?.textContent:'TOUTES')+'_'+from.value+'_'+to.value);
    var chunk=[],metadata=[],weight=0,n=0,errors=[],done=0;
    async function flush(){
     if(!chunk.length)return;
     n++;download(zip([...chunk,{name:'index_factures.csv',bytes:manifest(metadata)}]),common+(n>1?'_partie_'+n:'')+'.zip');
     chunk=[];metadata=[];weight=0;
    }
    for(const d of docs){
     status.textContent='Récupération : '+(++done)+' / '+docs.length+' factures…';
     try{
      var original=await api('?id='+encodeURIComponent(d.id)+'&original=1'),bytes=getBytes(original);
      if(chunk.length>=10||weight+bytes.length>15000000)await flush();
      chunk.push({name:safe((d.date||'sans_date')+'_'+d.supplier+'_'+(d.documentNumber||d.id))+'_'+d.id.slice(0,8)+ext(original.mime),bytes});metadata.push(d);weight+=bytes.length;
     }catch(err){errors.push((d.documentNumber||d.filename)+': '+err.message);}
    }
    await flush();
    status.textContent=n+' archive(s) ZIP téléchargée(s), '+(docs.length-errors.length)+' facture(s).'+(errors.length?' Échecs : '+errors.slice(0,3).join(' ; '):'');
   }
  }catch(err){status.textContent=err.message;}finally{isBusy=false;go.disabled=false;close.disabled=false;}
 };
 api('').then(data=>{
  all=(data.documents||[]).filter(d=>d.kind==='facture'&&d.status==='validé'&&d.establishment==='LOCEAN');
  scope.input.value=opts?.id?'single':opts?.supplier?'supplier':'all';
  options();var today=new Date(),y=today.getFullYear(),m=String(today.getMonth()+1).padStart(2,'0'),day=String(today.getDate()).padStart(2,'0');from.value=y+'-'+m+'-01';to.value=y+'-'+m+'-'+day;
  status.textContent=all.length+' facture(s) validée(s) accessibles. Les lots importants sont répartis en plusieurs ZIP.';go.disabled=false;
 }).catch(err=>{status.textContent=err.message;});
}
window.PrismInvoiceExport={open:modal};
function init(){
 var btn=el('button','px-launch','Exporter des factures');btn.type='button';btn.onclick=()=>modal({});
 function attach(){var shell=document.querySelector('#module-purchase-invoices .module-shell');if(!shell)return false;shell.insertBefore(btn,shell.children[3]||null);return true;}
 if(!attach()){var observer=new MutationObserver(()=>{if(attach())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
}
var styles=el('style');styles.textContent='.px-launch{border:0;border-radius:8px;background:#332823;color:white;padding:11px 15px;margin:15px 0;cursor:pointer;font-weight:700}.px-shade{position:fixed;inset:0;z-index:100001;background:rgba(20,15,10,.72);display:flex;align-items:center;justify-content:center;padding:16px}.px-panel{background:#fffcf7;border-radius:14px;padding:23px;width:min(100%,540px);max-height:92vh;overflow:auto;box-sizing:border-box}.px-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.px-top h3{font-size:20px;margin:0}.px-light{border:1px solid #d9c9b9;border-radius:7px;background:#f3ebe2;padding:8px 12px;cursor:pointer}.px-muted{font-size:12px;color:#77685a}.px-field{display:flex;flex-direction:column;gap:5px;margin:13px 0;flex:1;min-width:0}.px-field span{font-size:12px;font-weight:650;color:#756357}.px-field[hidden],.px-dates[hidden]{display:none!important}.px-input{width:100%;box-sizing:border-box;padding:10px;font-size:12px;background:#fff;color:#332823;border:1px solid #d9c9b9;border-radius:8px}.px-dates{display:flex;gap:12px}.px-status{font-size:12px;color:#856b54;min-height:22px}.px-go{background:#332823;border:0;border-radius:8px;padding:12px 18px;color:#fff;font-weight:700;cursor:pointer}.px-go:disabled{opacity:.5}@media(max-width:550px){.px-dates{flex-direction:column}}';document.head.appendChild(styles);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();