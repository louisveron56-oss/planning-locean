/* PRISM — Audit guidé des anomalies : dictée navigateur facultative, validation humaine. */
(function(){
"use strict";
const API="/.netlify/functions/purchase-audit";
let root,items=[],cursor=0,run="",summary;
const node=(tag,label)=>{const x=document.createElement(tag);if(label!==undefined)x.textContent=label;return x;};
async function api(method,data){
 const user=window.netlifyIdentity?.currentUser();if(!user)throw Error("Connecte-toi d'abord.");
 const token=await user.jwt();
 const r=await fetch(API,{method,headers:{Authorization:"Bearer "+token,...(data?{"Content-Type":"application/json"}:{})},body:data?JSON.stringify(data):undefined,cache:"no-store"});
 const j=await r.json();if(!r.ok)throw Error(j.error||"Erreur "+r.status);return j;
}
async function open(){
 const layer=node("div");layer.style.cssText="position:fixed;inset:0;background:#111b2dcc;display:grid;place-items:center;z-index:100002;padding:12px";
 root=node("section");root.style.cssText="max-width:780px;width:100%;max-height:90vh;overflow:auto;background:white;border-radius:17px;padding:24px;color:#182536;font:15px system-ui";
 layer.appendChild(root);document.body.appendChild(layer);
 const exit=node("button","Fermer ×");exit.style.cssText="float:right;padding:8px;border:1px solid #ddd;border-radius:8px;background:white";exit.onclick=()=>layer.remove();root.appendChild(exit);
 root.appendChild(node("h2","Audit guidé des factures"));
 root.appendChild(node("p","15 références maximum par série. Tu peux dicter tes réponses avec le micro si ton navigateur le permet. Rien ne modifie automatiquement les prix ou les ratios."));
 summary=node("p","Chargement...");root.appendChild(summary);
 try{await refresh()}catch(e){summary.textContent=e.message}
}
async function refresh(){
 const d=await api("GET");run=d.run;items=d.questions||[];cursor=0;
 summary.textContent=d.ready?d.pending+" références encore à examiner · "+d.answered+" réponses enregistrées":"Importer d’abord l’historique privé des factures.";
 draw();
}
function draw(){
 let old=root.querySelector("#prism-audit-question");if(old)old.remove();
 if(!items.length){const p=node("p","Aucune question dans cette série.");p.id="prism-audit-question";root.appendChild(p);return}
 const a=items[cursor],host=node("div");host.id="prism-audit-question";host.style.cssText="padding:18px;border:1px solid #ddd;border-radius:12px";
 root.appendChild(host);
 const index=node("p","Question "+(cursor+1)+" / "+items.length);index.style.cssText="font-size:12px;color:#697586";host.appendChild(index);
 host.appendChild(node("h3",a.description));host.appendChild(node("p",a.supplier+" · Réf. "+a.reference));
 host.appendChild(node("p",a.purchaseCount+" achats · "+a.anomalyCount+" lignes à vérifier · "+a.first+" → "+a.last));
 const warn=node("p",a.question);warn.style.color="#a4322e";host.appendChild(warn);
 const area=node("textarea");area.rows=5;area.placeholder="Exemple : carton de 5 kg. On conserve l'historique et on doit vérifier les factures qui diffèrent.";area.style.cssText="width:100%;box-sizing:border-box;border-radius:8px;border:1px solid #c7cdd7;padding:12px;font:inherit";host.appendChild(area);
 const actions=node("div");actions.style.cssText="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px";host.appendChild(actions);
 const microphone=node("button","🎙 Dicter la réponse");microphone.type="button";actions.appendChild(microphone);
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(SR){microphone.onclick=()=>{const rec=new SR();rec.lang="fr-FR";rec.continuous=true;rec.interimResults=false;microphone.textContent="Micro activé…";rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)area.value+=(area.value?" ":"")+e.results[i][0].transcript;};rec.onerror=()=>microphone.textContent="Dictée indisponible";rec.onend=()=>microphone.textContent="🎙 Dicter la réponse";rec.start();};}
 else{microphone.disabled=true;microphone.title="La dictée vocale de ce navigateur n'est pas disponible. Utilise le micro du clavier ou ChatGPT.";}
 const save=(label,status)=>{const b=node("button",label);b.style.cssText="padding:9px 12px;border:1px solid #bbc6d1;border-radius:8px;background:#f7f8fb";b.onclick=async()=>{b.disabled=true;try{await api("POST",{action:"answer",run,key:a.key,answer:area.value,status});items.splice(cursor,1);cursor=Math.min(cursor,items.length-1);await refresh();}catch(e){warn.textContent=e.message;b.disabled=false;}};actions.appendChild(b);};
 save("📝 Enregistrer l’explication","explication_fournie");
 save("🔴 À vérifier sur facture","a_verifier");
 save("✓ Résolution confirmée","resolution_confirmee");
 const skip=node("button","Passer");skip.onclick=()=>{cursor=(cursor+1)%items.length;draw()};actions.appendChild(skip);
 const note=node("p","Une explication n’est jamais appliquée automatiquement à tous les achats. La validation des corrections reste une étape distincte.");note.style.cssText="font-size:12px;color:#697586";host.appendChild(note);
}
function init(){
 const host=document.querySelector("#module-purchase-invoices .module-shell")||document.body;
 if(document.getElementById("prism-purchase-audit-open"))return;
 const b=node("button","Audit des factures · vocal");b.id="prism-purchase-audit-open";b.type="button";
 b.style.cssText="margin:10px;padding:10px 14px;border-radius:9px;background:#783f33;color:white;border:0;cursor:pointer";
 b.onclick=open;host.prepend(b);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
