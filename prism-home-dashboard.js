/* Prism — première page d'accueil, lecture seule. */
(function(){
'use strict';
var loading=false,loaded=false;
function el(tag,cls,txt){var x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;}
function num(v){if(typeof v==='number')return Number.isFinite(v)?v:0;return Number(String(v??'').replace(/[\s\u00a0\u202f€]/g,'').replace(',','.'))||0;}
function dt(v){var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=String(v||'').match(/^(\d\d?)\/(\d\d?)\/(\d{4})/);return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';}
var euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}),decimals=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
function valueCard(label,value,detail){var c=el('div','prism-home-card');c.append(el('span','prism-home-card-label',label),el('strong','prism-home-card-value',value),el('span','prism-home-card-hint',detail));return c;}
function navButton(label,route,icon){var b=el('button','prism-home-action');b.type='button';b.append(el('span','prism-home-action-icon',icon),el('span','',label),el('span','prism-home-action-end','›'));b.onclick=()=>window.navigateApp(route);return b;}
async function refresh(){
 if(loading)return;var host=document.querySelector('#module-dashboard .module-placeholder');if(!host)return;loading=true;
 host.replaceChildren();host.classList.add('prism-home-root');
 var head=el('div','prism-home-head');head.append(el('h3','','Aujourd’hui dans votre établissement'),el('p','','Derniers chiffres enregistrés et accès aux opérations importantes.'));host.appendChild(head);
 var cards=el('div','prism-home-cards');cards.append(valueCard('CA TTC','—','Dernière clôture'),valueCard('Couverts','—','Dernière clôture'),valueCard('Ticket moyen','—','Dernière clôture'),valueCard('Comparaison N-1','—','Même date de référence'));host.appendChild(cards);
 var status=el('p','prism-home-status','Récupération des derniers Z de caisse…');host.appendChild(status);
 var section=el('div','prism-home-shortcuts');section.appendChild(el('h4','','Accès rapide'));var actions=el('div','prism-home-actions');
 [['Ventes','sales','↗'],['Bons de livraison','delivery-notes','▣'],['Factures','purchase-invoices','▤'],['Planning','planning','▦'],['Fournisseurs','supplier-directory','☷'],['Inventaires','inventory','◫']].forEach(v=>actions.appendChild(navButton(...v)));
 section.appendChild(actions);host.appendChild(section);
 try{
  var user=window.netlifyIdentity?.currentUser();if(!user)throw Error('Connectez-vous pour afficher les derniers chiffres.');
  var jwt=await user.jwt(),res=await fetch('/.netlify/functions/sales',{headers:{Authorization:'Bearer '+jwt},cache:'no-store',signal:AbortSignal.timeout(20000)});
  var body=await res.json();if(!res.ok||!Array.isArray(body.rows))throw Error(body.error||'Données de vente indisponibles.');
  var days=new Map();
  body.rows.forEach(r=>{var d=dt(r.date);if(!d)return;var list=days.get(d)||[];list.push(r);days.set(d,list);});
  var dates=[...days.keys()].sort(),latest=dates[dates.length-1];if(!latest){status.textContent='Aucun Z disponible pour le moment.';return;}
  var rows=days.get(latest),ca=rows.reduce((n,r)=>n+num(r.ca_ttc),0),covers=rows.reduce((n,r)=>n+num(r.couverts),0);
  var weighted=covers?rows.reduce((n,r)=>n+num(r.ticket_moyen)*num(r.couverts),0)/covers:0;
  // Comparaison N-1 seulement si une date identique est réellement enregistrée.
  var previous=String(Number(latest.slice(0,4))-1)+latest.slice(4),prior=days.get(previous),priorCa=prior?.reduce((n,r)=>n+num(r.ca_ttc),0);
  var pretty=new Date(latest+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  cards.replaceChildren(valueCard('CA TTC',euro.format(ca),'Dernier Z · '+latest),valueCard('Couverts',String(Math.round(covers)),pretty),valueCard('Ticket moyen',covers?decimals.format(weighted)+' €':'—','Moyenne pondérée'),valueCard('CA N-1',prior?.length&&priorCa>0?((ca>=priorCa?'+':'')+decimals.format((ca/priorCa-1)*100)+' %'):'—',prior?.length?'Même date, année précédente':'Historique non disponible'));
  status.textContent='Données de caisse du '+pretty+' · Pas de suivi en temps réel.';
  loaded=true;
 }catch(err){status.textContent='Indicateurs indisponibles : '+err.message+' Les modules restent accessibles ci-dessous.';}
 finally{loading=false;}
}
function init(){
 var page=document.getElementById('module-dashboard');if(!page)return;
 new MutationObserver(()=>{if(page.classList.contains('open')&&!loading&&!loaded)refresh();}).observe(page,{attributes:true,attributeFilter:['class']});
 if(page.classList.contains('open'))refresh();
}
var css=el('style');css.textContent=
'#module-dashboard .prism-home-root{text-align:left!important;display:block!important;padding:clamp(18px,3vw,28px)!important;min-height:0!important}.prism-home-head h3{font-size:18px;color:#332823;margin:0 0 6px}.prism-home-head p{font-size:12px;color:#857467;margin:0 0 19px}.prism-home-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.prism-home-card{border:1px solid #e7ddd0;background:#fff;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}.prism-home-card-label{font-size:11px;color:#77675b}.prism-home-card-value{font-size:clamp(20px,2.2vw,30px);color:#332823;letter-spacing:-.04em;overflow-wrap:anywhere}.prism-home-card-hint{font-size:10px;color:#85766b;line-height:1.4}.prism-home-status{font-size:11px;color:#85766b;margin:12px 0 20px}.prism-home-shortcuts{border-top:1px solid #e5d9ce;padding-top:17px}.prism-home-shortcuts h4{font-size:13px;margin:0 0 13px;color:#332823}.prism-home-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.prism-home-action{display:flex;align-items:center;gap:9px;padding:13px;text-align:left;border:1px solid #e5d9cf;background:#fff;border-radius:9px;color:#332823;font-size:12px;cursor:pointer}.prism-home-action:hover{background:#f7efe6}.prism-home-action-icon{color:#926c55}.prism-home-action-end{margin-left:auto;color:#927665}@media(max-width:950px){.prism-home-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.prism-home-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.prism-home-card{padding:12px}.prism-home-card-value{font-size:22px}}';
document.head.appendChild(css);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();