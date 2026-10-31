(function(){
'use strict';
// Phase 1: diagnosis only. Never writes business data or computes KPIs.
const requirements={
 sales:["Z de caisse et couverture des dates","CA HT par famille rapproché des Z","CA restaurant séparé du comptoir"],
 purchase:["Factures datées et affectées à L’Océan","Détail des achats par famille et avoirs"],
 consumption:["Inventaires valorisés ouverture/clôture par zone et période"],
 payroll:["Brut, charges patronales et provisions par mois travaillé"],
 charges:["Charges fixes mensuelles validées","Charges variables et taux de marge sur coûts variables validés"],
 products:["Références fournisseurs classées et unités normalisées","Prix OCR fiables et comparables"]
};
const items=[
 {title:"CA et CA par couvert",page:"sales",deps:["sales"]},
 {title:"Ratio matière sur achats",page:"costs",deps:["sales","purchase"]},
 {title:"Ratio matière consommée",page:"costs",deps:["sales","purchase","consumption"]},
 {title:"Marge brute matière",page:"foodcost",deps:["sales","purchase","consumption"]},
 {title:"Ratio personnel",page:"teamperf",deps:["sales","payroll"]},
 {title:"Prime cost",page:"teamperf",deps:["sales","purchase","consumption","payroll"]},
 {title:"Seuil de rentabilité",page:"reports",deps:["sales","payroll","charges"]},
 {title:"Fiabilité des prix fournisseurs",page:"suppliers",deps:["products"]}
];
let evidence={},busy=false,checkedAt=null;
function status(item){const states=item.deps.map(k=>evidence[k]?.state||'unknown');return states.includes('missing')?'missing':states.includes('unknown')?'unknown':states.includes('review')?'review':'available'}
const make=(tag,cls,txt)=>{let x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
const put=(root,tag,cls,txt)=>{let x=make(tag,cls,txt);root.appendChild(x);return x};
function navigate(page){let b=document.querySelector('.app-nav-item[data-page="'+page+'"]');if(b)b.click();else window.navigateApp?.(page)}
function button(root,label,fn){let b=put(root,'button','dq-button',label);b.type='button';b.onclick=fn;return b}
function sourceLine(root,group){
 let e=evidence[group]||{state:"pending",details:"Source non contrôlée"};
 const line=put(root,'div','dq-line');
 put(line,'span','dq-alert',e.state==='available'?'✓':e.state==='review'?'•':'!');
 const col=put(line,'div','dq-line-content');
 requirements[group].forEach((r,i)=>put(col,'div','',r+(i===0&&e.details?' — '+e.details:'')));
}
function card(root,item,compact){
 const state=status(item),box=put(root,'div','dq-card dq-'+state);
 const h=put(box,'div','dq-heading');
 put(h,'strong','',item.title);
 put(h,'span','dq-badge',state==='available'?'DISPONIBLE':state==='review'?'À RAPPROCHER':state==='missing'?'À COMPLÉTER':'À VÉRIFIER');
 for(let key of item.deps)sourceLine(box,key);
 if(!compact)button(box,'Ouvrir le module →',()=>navigate(item.page));
}
function render(){
 const dash=document.querySelector('#module-dashboard .module-shell');
 if(dash){
  let root=dash.querySelector('#prismDataQuality');
  if(!root){root=put(dash,'section','dq-root');root.id='prismDataQuality'}
  root.replaceChildren();
  put(root,'h3','','Diagnostic de fiabilité · L’Océan');
  put(root,'p','dq-sub',checkedAt?'Contrôle des sources : '+checkedAt.toLocaleString('fr-FR'):'En attente de vérification des sources');
  button(root,busy?'Contrôle en cours…':'Actualiser le diagnostic',run).disabled=busy;
  put(root,'p','dq-warning','Données présentes ≠ validation comptable. Les écarts restent à rapprocher avant présentation externe.');
  const open=items.filter(i=>status(i)!=='available'),ready=items.filter(i=>status(i)==='available');
  put(root,'h4','','Contrôles ouverts ('+open.length+')');const grid=put(root,'div','dq-grid');open.forEach(item=>card(grid,item,false));
  if(ready.length){put(root,'h4','','Indicateurs disponibles ('+ready.length+')');const ok=put(root,'div','dq-grid');ready.forEach(item=>card(ok,item,false));}
  const prio=put(root,'div','dq-priorities');put(prio,'h4','','Données à compléter en priorité');
  Object.entries(requirements).filter(([group])=>evidence[group]?.state!=='available').forEach(([group,labels])=>{
   const row=put(prio,'div','dq-priority');
   const n=items.filter(i=>i.deps.includes(group)).length;
   put(row,'strong','',labels.join(' · '));
   put(row,'small','','Impact sur '+n+' indicateur(s)'+(evidence[group]?.details?' · '+evidence[group].details:''));
  });
  put(root,'p','dq-sub','Disponible = source exploitable ; à rapprocher = chiffres présents, contrôles encore ouverts. Une source inaccessible n’est pas considérée comme absente.');
 }
 const placement={
  'module-sales':['CA et CA par couvert'],
  'module-costs':['Ratio matière sur achats','Ratio matière consommée'],
  'module-foodcost':['Marge brute matière'],
  'module-teamperf':['Ratio personnel','Prime cost'],
  'module-reports':['Seuil de rentabilité'],
  'module-suppliers':['Fiabilité des prix fournisseurs']
 };
 Object.entries(placement).forEach(([id,names])=>{
  const shell=document.querySelector('#'+id+' .module-shell');if(!shell)return;
  let zone=shell.querySelector('.dq-inline');
  if(!zone)zone=put(shell,'section','dq-inline');
  zone.replaceChildren();
  put(zone,'h4','','Conditions avant validation');
  items.filter(x=>names.includes(x.title)&&status(x)!=='available').forEach(x=>card(zone,x,true));
  if(!zone.querySelector('.dq-card'))put(zone,'p','dq-sub','Source exploitable. Voir les contrôles comptables dans Rapports.');
  button(zone,'Voir toutes les données manquantes →',()=>navigate('dashboard'));
 });
}
async function fetchJson(url,token){
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 const j=await r.json();if(!r.ok)throw Error(j.error||'HTTP '+r.status);return j;
}
async function run(){
 if(busy)return;busy=true;render();
 const user=window.netlifyIdentity?.currentUser?.();
 if(!user){Object.keys(requirements).forEach(k=>evidence[k]={state:'unknown',details:'Connexion Prism requise pour contrôler la source'});busy=false;checkedAt=new Date();render();return;}
 let token;try{token=await user.jwt()}catch(_){busy=false;render();return}
 const endpoints=[
 ['sales','/.netlify/functions/sales'],
 ['purchases','/.netlify/functions/purchase-sheets?type=purchases'],
 ['products','/.netlify/functions/purchase-sheets?type=products'],
 ['catalog','/.netlify/functions/purchases'],
 ['inventory','/.netlify/functions/inventory'],
 ['payroll','/.netlify/functions/rh-monthly'],
 ['materials','/.netlify/functions/materials-monthly']
 ];
 const results=await Promise.allSettled(endpoints.map(async([k,url])=>({key:k,data:await fetchJson(url,token)})));
 const data={};results.forEach((r,i)=>data[endpoints[i][0]]=r.status==='fulfilled'?r.value.data:{error:r.reason?.message||'Connexion indisponible'});
 const sales=data.sales;
 evidence.sales=sales.error?{state:'unknown',details:'Source non vérifiable : '+sales.error}:{state:'review',details:(sales.rows?.length||0)+' jours de ventes lus. Couverture des Z, CA HT familles et ventilation restaurant à valider'};
 const purchases=data.purchases;
 if(purchases.error)evidence.purchase={state:'unknown',details:'Source non vérifiable : '+purchases.error};
 else{
  const lines=purchases.rows||[],unassigned=lines.filter(x=>!String(x.etablissement||'').trim()).length;
  evidence.purchase={state:'review',details:lines.length+' lignes lues ; '+unassigned+' sans établissement. Affectations, avoirs et détail produits non vérifiés'};
 }
 const inv=data.inventory;
 evidence.consumption=inv.error?{state:'unknown',details:'Source non vérifiable : '+inv.error}:{state:'review',details:(inv.sessions?.length||0)+' inventaires repérés ; dates et valeurs ouverture/clôture non rapprochées'};
 const prod=data.products,cat=data.catalog;
 if(prod.error)evidence.products={state:'unknown',details:'Source non vérifiable : '+prod.error};
 else{
  const p=prod.rows||[],unreliable=p.filter(x=>String(x.fiable||'').trim().toLowerCase()!=='oui').length,units=p.filter(x=>!String(x.unite||'').trim()).length;
  evidence.products={state:'review',details:p.length+' références ; '+unreliable+' prix douteux, '+units+' unités manquantes'+(cat.error?' ; catalogue Prism non vérifiable':' ; '+(cat.products?.length||0)+' fiches actives dans Prism')};
 }
 const pay=data.payroll;
 evidence.payroll=pay.error?{state:'unknown',details:'RH indisponible : '+pay.error}:{state:(pay.months||[]).length?'review':'missing',details:(pay.months||[]).length+' mois de paie MySilae disponibles ; rapprochements 641/645, gérance et bilan à finaliser.'};
 const mat=data.materials;
 if(mat.error)evidence.purchase={state:'unknown',details:'Achats non vérifiables : '+mat.error};
 else {const list=mat.months||[];evidence.purchase={state:list.length?'review':'missing',details:list.length+' mois de ratios achats disponibles ; '+list.filter(x=>x.warnings?.length).length+' mois avec réserves de complétude ou affectation'};}
 if(!sales.error){const rows=sales.rows||[],covers=rows.filter(x=>Number(String(x.couverts||'').replace(',','.'))>0).length,tickets=rows.filter(x=>Number(String(x.ticket_moyen||'').replace(',','.'))>0).length;
 evidence.sales={state:rows.length&&covers&&tickets?'review':'missing',details:rows.length+' lignes Z ; couverts renseignés sur '+covers+' lignes, ticket moyen sur '+tickets+'. Indicateurs consultables, rapprochement des dates et familles à contrôler.'};}
 evidence.charges={state:'missing',details:'Pas de table validée de charges fixes/variables et MCV connectée'};
 busy=false;checkedAt=new Date();render();
}
function init(){
 render();
 const target=document.getElementById('module-dashboard');
 if(target){
  let fired=false;
  const observer=new MutationObserver(()=>{
   if(!fired&&target.classList.contains('open')){fired=true;run();}
  });
  observer.observe(target,{attributes:true,attributeFilter:['class']});
 }
}
const style=make('style');
style.textContent=[
 '.dq-root,.dq-inline{margin-top:16px;border:1px solid #e7d4cf;background:#fff;border-radius:12px;padding:16px}',
 '.dq-root h3{font-size:16px;margin-bottom:6px}.dq-root h4,.dq-inline h4{font-size:13px;margin-bottom:10px}',
 '.dq-sub{font-size:11px;color:#796a65;margin:9px 0;line-height:1.5}.dq-warning{font-size:12px;color:#ab2623;font-weight:700;margin:12px 0}',
 '.dq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}',
 '.dq-card{background:#fff8f7;border:1px solid #e6b9b5;border-left:4px solid #bc3430;border-radius:9px;padding:12px;margin-bottom:8px}',
 '.dq-heading{display:flex;gap:8px;align-items:start;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap}',
 '.dq-heading strong{font-size:12px}.dq-badge{font-size:9px;color:#96221f;background:#f8dcda;padding:5px 7px;border-radius:6px;font-weight:800}',
 '.dq-line{display:flex;gap:7px;margin:7px 0;color:#a52e2a;font-size:11px;line-height:1.45}',
 '.dq-alert{font-weight:900}.dq-line-content{display:grid;gap:3px}',
 '.dq-button{border:1px solid #d7b4aa;color:#7f2c29;background:#fff;border-radius:7px;padding:8px 10px;font-size:11px;font-weight:700;cursor:pointer;margin:4px 6px 0 0}',
 '.dq-card.dq-available{background:#f3f8f7;border-color:#cadfda;border-left-color:#4a887e}.dq-available .dq-badge{background:#e1f1ec;color:#286e5f}.dq-card.dq-review{background:#fffcf7;border-color:#e8d9bd;border-left-color:#cc9653}.dq-review .dq-badge{background:#fff0d9;color:#946321}.dq-card.dq-review .dq-line{color:#8d672d}.dq-button:disabled{opacity:.5}.dq-priorities{margin-top:18px}.dq-priority{display:grid;gap:4px;padding:9px 0;border-bottom:1px solid #eee1de}',
 '.dq-priority strong{font-size:11px;color:#9a302b}.dq-priority small{font-size:10px;color:#80645e}',
 '@media(max-width:650px){.dq-root,.dq-inline{padding:11px}}'
].join('');
document.head.appendChild(style);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();