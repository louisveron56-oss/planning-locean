/* PRISM — Consultation et import manuel de l'historique privé des factures */
(function(){
"use strict";
const API="/.netlify/functions/purchase-history", cash=new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"});
const norm=x=>String(x??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const el=(t,text,cls)=>{const n=document.createElement(t);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const st=document.createElement("style");st.textContent=`
.ph-overlay{position:fixed;z-index:99999;inset:0;background:#121a27bb;display:flex;align-items:center;justify-content:center;padding:14px}
.ph-panel{font:14px system-ui,sans-serif;position:relative;background:#fff;color:#182333;border-radius:16px;width:min(1050px,96vw);height:min(850px,94vh);overflow:auto;padding:24px;box-shadow:0 20px 80px #0004}
.ph-panel h2{font-size:23px;margin:0 0 12px}.ph-panel p{line-height:1.5}.ph-panel button,.ph-panel input,.ph-panel select{font:inherit;padding:9px 11px;border-radius:8px;border:1px solid #ccd3dc;background:#fff;color:#142237}
.ph-panel button{cursor:pointer}.ph-panel button.ph-primary{background:#243852;color:#fff}.ph-panel .ph-close{float:right}
.ph-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.ph-note{color:#9b2525;font-size:12px}
.ph-grid{display:grid;grid-template-columns:minmax(230px,1fr) 2fr;gap:18px}.ph-list{max-height:530px;overflow:auto;border:1px solid #ddd;border-radius:9px}
.ph-list button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #eee;border-radius:0}
.ph-list small{display:block;color:#657184}.ph-list button:hover{background:#eef3f9}
.ph-table{border-collapse:collapse;width:100%;font-size:12px}.ph-table td,.ph-table th{padding:8px;border-bottom:1px solid #e8ebef;text-align:left}
.ph-warning{color:#a12f28;font-weight:600}.ph-ok{color:#187348}.ph-stat{background:#f4f6f9;padding:12px;border-radius:9px}
.ph-chart{width:100%;height:220px;border:1px solid #eceef1;border-radius:8px}.ph-map{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:7px;margin:15px 0}
.ph-map label{display:flex;flex-direction:column;gap:4px}.ph-secondary{font-size:12px;color:#687583}
@media(max-width:720px){.ph-grid{grid-template-columns:1fr}.ph-list{max-height:170px}.ph-map{grid-template-columns:1fr}}
`;document.head.appendChild(st);
let overlay,panel,status,listHost,detailHost,products=[],history=[];
async function request(method,body,query=""){
 const u=window.netlifyIdentity?.currentUser();if(!u)throw Error("Connecte-toi à PRISM pour accéder aux factures.");
 const token=await u.jwt(),r=await fetch(API+query,{method,headers:{"Authorization":"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify({...body,establishment:"LOCEAN"}):undefined,cache:"no-store"});
 const json=await r.json();if(!r.ok)throw Error(json.error||"Erreur serveur "+r.status);return json;
}
function info(msg,error=false){status.textContent=msg;status.className=error?"ph-warning":"ph-secondary";}
function open(){if(overlay)return;overlay=el("div",undefined,"ph-overlay");panel=el("div",undefined,"ph-panel");overlay.appendChild(panel);document.body.appendChild(overlay);
 const close=el("button","Fermer ×","ph-close");close.onclick=()=>{overlay.remove();overlay=null;};panel.appendChild(close);
 panel.appendChild(el("h2","Historique des achats · L'Océan"));
 panel.appendChild(el("p","Courbes et lignes de factures datées. Tous les montants sont en HT ; les données incertaines restent signalées. Ce module ne modifie aucun prix du catalogue ni aucun ratio."));
 const actions=el("div",undefined,"ph-actions"),search=el("input");search.placeholder="Rechercher produit, fournisseur ou référence";search.style.flex="1";actions.appendChild(search);
 const importBtn=el("button","Importer un CSV","ph-primary");actions.appendChild(importBtn);panel.appendChild(actions);
 status=el("p","Chargement…","ph-secondary");panel.appendChild(status);
 const grid=el("div",undefined,"ph-grid");listHost=el("div",undefined,"ph-list");detailHost=el("div");grid.append(listHost,detailHost);panel.appendChild(grid);
 search.oninput=()=>renderList(search.value);importBtn.onclick=importFlow;
 load().catch(e=>info(e.message,true));
}
async function load(){const d=await request("GET");products=d.products||[];
 info(d.ready?d.rowCount.toLocaleString("fr-FR")+" lignes historiques privées · "+products.length.toLocaleString("fr-FR")+" références · dernier import : "+new Date(d.importedAt).toLocaleDateString("fr-FR"):"Aucun historique importé. Utilise le CSV exporté depuis le classeur.");
 renderList("");}
function renderList(query){listHost.replaceChildren();const q=norm(query),matched=products.filter(p=>norm(p.description+" "+p.supplier+" "+p.reference).includes(q)).slice(0,200);
 for(const p of matched){const btn=el("button",p.description);btn.appendChild(el("small",p.supplier+" · "+p.reference+" · "+p.count+" achat(s)"+(p.issues?" · "+p.issues+" à vérifier":"")));
  btn.onclick=()=>loadProduct(p).catch(e=>info(e.message,true));listHost.appendChild(btn);}
 if(!matched.length)listHost.appendChild(el("p","Aucune référence correspondante."));}
function chart(rows){
 const valid=rows.filter(r=>r.priceHT!==null&&r.priceHT>0).sort((a,b)=>a.date.localeCompare(b.date));
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 740 220");svg.setAttribute("class","ph-chart");svg.setAttribute("role","img");svg.setAttribute("aria-label","Évolution chronologique des prix HT de chaque facture");
 if(!valid.length)return svg;
 const vals=valid.map(x=>Number(x.priceHT)),min=Math.min(...vals),max=Math.max(...vals),low=min===max?min*.9:min,high=min===max?max*1.1:max;
 const t=valid.map(x=>Date.parse(x.date+"T12:00:00Z"));const t0=Math.min(...t),t1=Math.max(...t);
 const x=i=>38+(t1===t0?0:(t[i]-t0)/(t1-t0))*665,y=v=>185-(v-low)/(high-low||1)*150;
 for(let i=0;i<4;i++){const line=document.createElementNS(svg.namespaceURI,"line");line.setAttribute("x1",38);line.setAttribute("x2",710);line.setAttribute("y1",35+i*50);line.setAttribute("y2",35+i*50);line.setAttribute("stroke","#e4e7ec");svg.appendChild(line);}
 const poly=document.createElementNS(svg.namespaceURI,"polyline");poly.setAttribute("fill","none");poly.setAttribute("stroke","#334c73");poly.setAttribute("stroke-width",2);poly.setAttribute("points",valid.map((r,i)=>x(i)+","+y(r.priceHT)).join(" "));svg.appendChild(poly);
 valid.forEach((r,i)=>{const circle=document.createElementNS(svg.namespaceURI,"circle");circle.setAttribute("cx",x(i));circle.setAttribute("cy",y(r.priceHT));circle.setAttribute("r",r.verified?3:4);circle.setAttribute("fill",r.verified?"#26456e":"#b83d32");const tip=document.createElementNS(svg.namespaceURI,"title");tip.textContent=r.date+" · "+cash.format(r.priceHT)+"/"+(r.unit||"unité inconnue")+(r.issues.length?" · "+r.issues.join(", "):"");circle.appendChild(tip);svg.appendChild(circle);});
 return svg;
}
async function loadProduct(p){
 const d=await request("GET",null,"?mode=product&key="+encodeURIComponent(p.key));history=d.rows||[];detailHost.replaceChildren();
 detailHost.appendChild(el("h3",p.description));detailHost.appendChild(el("p",p.supplier+" · réf. "+p.reference+" · "+history.length+" achats"));
 const clean=history.filter(r=>r.verified);const unique=[...new Set(clean.map(x=>x.unit))],comparable=unique.length===1&&clean.length>=2;
 const first=clean[0],last=clean[clean.length-1],change=comparable&&first.priceHT>0?(last.priceHT/first.priceHT-1)*100:null;
 detailHost.appendChild(el("p",change===null?"⚠ Variation non calculable de façon fiable : unités, factures ou lectures à vérifier.":"Variation sur achats comparables : "+(change>0?"+":"")+change.toFixed(1)+" %",change===null?"ph-warning":"ph-stat"));
 detailHost.appendChild(chart(history));
 detailHost.appendChild(el("p","Rouge : observation avec alerte · Bleu : ligne sans alerte. Les points datés d'achats isolés restent visibles, sans inventer de prix intermédiaires.","ph-secondary"));
 const table=el("table",undefined,"ph-table"),head=el("thead"),tr=el("tr");["Date","Prix HT","Quantité","Unité","Facture / source","Fiabilité"].forEach(t=>tr.appendChild(el("th",t)));head.appendChild(tr);table.appendChild(head);
 const body=el("tbody");
 for(const r of history){const row=el("tr");[r.date,cash.format(r.priceHT),r.quantity??"—",r.unit||"—",r.invoice||r.document||r.source||"—",r.issues.join("; ")||"Sans alerte"].forEach((t,i)=>{const td=el("td",String(t));if(i===5)td.className=r.issues.length?"ph-warning":"ph-ok";row.appendChild(td);});body.appendChild(row);}
 table.appendChild(body);const sc=el("div");sc.style.cssText="overflow:auto;max-height:340px";sc.appendChild(table);detailHost.appendChild(sc);
}
function parseCSV(s){
 s=s.replace(/^\uFEFF/,"");const first=s.slice(0,s.indexOf("\n")<0?s.length:s.indexOf("\n"));const delim=[";","\t",","].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
 const out=[],row=[];let item="",quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){item+='"';i++;}else quoted=!quoted;}else if(!quoted&&c===delim){row.push(item);item="";}else if(!quoted&&(c==="\n"||c==="\r")){if(c==="\r"&&s[i+1]==="\n")i++;row.push(item);if(row.some(v=>v.trim()))out.push(row.slice());row.length=0;item="";}else item+=c;}
 row.push(item);if(row.some(v=>v.trim()))out.push(row);return out;
}
async function importFlow(){
 const input=el("input");input.type="file";input.accept=".csv,text/csv";input.onchange=async()=>{
  try{
   const file=input.files?.[0];if(!file)return;const rows=parseCSV(await file.text()),headers=rows.shift();if(!headers||!rows.length)throw Error("CSV vide");
   detailHost.replaceChildren();detailHost.appendChild(el("h3","Correspondance des colonnes"));
   detailHost.appendChild(el("p","Sélectionne les colonnes du CSV : aucun prix n'est publié avant validation de l'import. Export CSV UTF-8 depuis Excel si nécessaire."));
   const mapping=el("div",undefined,"ph-map");detailHost.appendChild(mapping);
   const fields={supplier:["fournisseur","supplier"],reference:["codeproduit","referenceproduit","reference","code","ref"],description:["designation","produit","description","libelle"],date:["datefacture","date","dateachat"],priceHT:["prixunitaireht","prixht","puht","unitpriceht","prixachatht"],quantity:["quantite","qte","quantity"],unit:["unite","unit"],invoice:["numerofacture","facture","invoice"],document:["fichiersource","cheminfacture","document"],source:["source"],reading:["modelecture","lecture","ocr"],invoiceStatus:["statutfacture","controlefacture","completude"]};
   const selects={};for(const [field,hints] of Object.entries(fields)){
    const label=el("label",field),sel=el("select");sel.appendChild(new Option("— Non renseigné —",""));
    headers.forEach((h,i)=>sel.appendChild(new Option(h,i+"")));
    const found=headers.findIndex(h=>hints.includes(norm(h)));if(found>=0)sel.value=String(found);
    selects[field]=sel;label.appendChild(sel);mapping.appendChild(label);
   }
   const submit=el("button","Contrôler puis importer","ph-primary");detailHost.appendChild(submit);
   submit.onclick=async()=>{
    submit.disabled=true;try{
     const mandatory=["supplier","reference","description","date","priceHT"];
     if(mandatory.some(x=>selects[x].value===""))throw Error("Il manque une colonne obligatoire : fournisseur, référence, désignation, date ou prix HT.");
     const mapped=rows.map(r=>Object.fromEntries(Object.keys(fields).map(f=>[f,selects[f].value===""?"":r[Number(selects[f].value)]??""])));
     if(!confirm("Importer "+mapped.length+" lignes dans le stockage privé de PRISM ? Les prix du catalogue et les ratios ne seront pas modifiés.")){submit.disabled=false;return;}
     const run="historique-"+Date.now(),existing=products.length>0;
     await request("POST",{action:"begin",run,replace:existing});
     let done=0;
     for(let i=0;i<mapped.length;i+=200){const batch=mapped.slice(i,i+200);await request("POST",{action:"batch",run,batch:Math.floor(i/200),rows:batch});done+=batch.length;info("Import privé : "+done.toLocaleString("fr-FR")+" / "+mapped.length.toLocaleString("fr-FR")+" lignes");}
     await request("POST",{action:"publish",run,expectedRows:mapped.length});
     info("Historique importé. Rechargement…");detailHost.replaceChildren();await load();
    }catch(e){info("Import interrompu : "+e.message+" — aucun nouvel historique publié si les lots sont incomplets.",true);submit.disabled=false;}
   };
  }catch(e){info(e.message,true);}
 };input.click();
}
function init(){
 const host=document.getElementById("module-suppliers")||document.body;
 if(document.getElementById("prism-purchase-history-open"))return;
 const button=el("button","Historique achats 2024–2026");button.id="prism-purchase-history-open";button.type="button";
 button.style.cssText="margin:10px;padding:10px 14px;border-radius:9px;background:#263d58;color:white;border:0;cursor:pointer";
 button.onclick=open;host.prepend(button);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
