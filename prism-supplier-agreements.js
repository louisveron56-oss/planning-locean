/* Prism - accords fournisseurs, phase 1. Pas de mutation des factures. */
(function(){
"use strict";
var key="prism-accords-fournisseurs-v1";
function el(id){return document.getElementById(id)}
function n(id){return Number((el(id).value||"0").replace(",","."))}
function money(v){return Number.isFinite(v)?v.toLocaleString("fr-FR",{style:"currency",currency:"EUR"}):"—"}
function load(){try{return JSON.parse(localStorage.getItem(key)||"[]")}catch(e){return []}}
function calc(p,q,g,r){return {theory:p*q/(q+g),confirmed:r===null?null:p*q/(q+r)}}
function mount(){
 var nav=document.querySelector(".prism-native-nav [data-page=suppliers]");
 if(nav&&!document.querySelector("[data-page=agreements]")){
  var b=document.createElement("button");b.type="button";b.className="app-nav-item";b.dataset.page="agreements";b.innerHTML='<span class="app-nav-icon">◇</span>Accords fournisseurs';b.onclick=function(){navigateApp("agreements")};nav.after(b);
 }
 if(el("module-agreements"))return;
 var sec=document.createElement("section");sec.id="module-agreements";sec.className="module-page no-print";sec.dataset.module="agreements";
 sec.innerHTML=[
 '<div class="module-shell prism-agreements"><div class="module-kicker">Achats & Stocks</div><div class="module-title">Accords fournisseurs</div>',
 '<p>Gratuités négociées et coût net réel, sans modifier les factures.</p>',
 '<p class="ag-caution">Phase 1 : sauvegarde dans ce navigateur uniquement. Pas encore de synchronisation avec les autres appareils, les BL ou les factures.</p>',
 '<div class="ag-layout"><form id="agForm" class="ag-panel"><h3>Nouvel accord</h3><div class="ag-fields">',
 '<label>Produit<input id="agProduct" required value="Quincy 75 cl"></label>',
 '<label>Fournisseur<input id="agSupplier" placeholder="Nom du fournisseur"></label>',
 '<label>Prix facturé HT (€)<input id="agPrice" type="number" required min="0.0001" step="0.0001" value="7.58"></label>',
 '<label>Unités payées<input id="agPaid" type="number" required min="1" step="1" value="5"></label>',
 '<label>Unités offertes prévues<input id="agFree" type="number" required min="0" step="1" value="1"></label>',
 '<label>Unités offertes vérifiées<input id="agReceived" type="number" min="0" step="1" placeholder="Non vérifiées"></label>',
 '</div><div class="ag-prices"><div>Facturé HT<strong id="agBilled"></strong></div><div>Net théorique HT<strong id="agTheory"></strong></div><div>Net confirmé HT<strong id="agConfirmed"></strong></div></div>',
 '<p class="ag-note">Le net confirmé nécessite la vérification des gratuités réellement livrées, sur un lot comparable.</p>',
 '<button class="ag-save" type="submit">Enregistrer l’accord</button><span id="agMessage" role="status"></span></form>',
 '<div class="ag-panel"><h3>Accords enregistrés</h3><div class="ag-scroll"><table><thead><tr><th>Produit</th><th>Facturé</th><th>Théorique</th><th>Confirmé</th><th>Statut</th><th></th></tr></thead><tbody id="agRows"></tbody></table></div></div></div></div>'
 ].join("");
 var before=el("module-stocks")||el("module-suppliers");before.parentNode.insertBefore(sec,before);
 var style=document.createElement("style");style.textContent='.prism-agreements{max-width:1400px}.prism-agreements>p{margin:10px 0}.ag-caution{padding:12px;border:1px solid #8d7048;border-radius:8px;color:#dbbd80}.ag-layout{display:grid;grid-template-columns:1fr 1.3fr;gap:16px}.ag-panel{background:#26282a;color:#f5f5f5;border:1px solid #444;border-radius:12px;padding:18px;min-width:0}.ag-panel h3{font-size:15px;margin-bottom:16px}.ag-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ag-fields label{font-size:11px;color:#bec0c4;display:flex;flex-direction:column;gap:6px}.ag-fields input{background:#1e2022;border:1px solid #52565a;border-radius:7px;padding:9px;color:#fff;width:100%}.ag-prices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.ag-prices div{background:#181b1d;padding:12px;border-radius:8px;font-size:10px;color:#abb0b5}.ag-prices strong{display:block;color:#fff;font-size:17px;margin-top:7px}.ag-note{font-size:11px;color:#c0c0c0;margin-bottom:15px}.ag-save{border:0;border-radius:7px;background:#e8dbc6;padding:11px 14px;cursor:pointer;font-weight:700}.ag-scroll{overflow:auto}.ag-panel table{width:100%;border-collapse:collapse;font-size:11px}.ag-panel th,.ag-panel td{border-bottom:1px solid #484a4c;padding:10px 5px;text-align:left}.ag-panel th{color:#b5b7ba}.ag-panel small{display:block;color:#b5b7ba}.ag-panel td button{border:0;background:none;color:#e9b5b5;cursor:pointer}@media(max-width:990px){.ag-layout{grid-template-columns:1fr}}@media(max-width:520px){.ag-fields,.ag-prices{grid-template-columns:1fr}}';document.head.appendChild(style);
 ["agPrice","agPaid","agFree","agReceived"].forEach(function(id){el(id).addEventListener("input",preview)});
 el("agForm").addEventListener("submit",save);
 el("agRows").addEventListener("click",function(e){var b=e.target.closest("button[data-id]");if(!b||!confirm("Supprimer cet accord local ?"))return;var list=load().filter(function(a){return a.id!==b.dataset.id});localStorage.setItem(key,JSON.stringify(list));render()});
 preview();render();
}
function values(){
 var p=n("agPrice"),q=n("agPaid"),g=n("agFree"),raw=el("agReceived").value;
 var r=raw===""?null:Number(raw);
 var valid=p>0&&Number.isFinite(p)&&Number.isInteger(q)&&q>0&&Number.isInteger(g)&&g>=0&&(r===null||(Number.isInteger(r)&&r>=0&&r<=g));
 return {p:p,q:q,g:g,r:r,valid:valid};
}
function preview(){var a=values(),v=a.valid?calc(a.p,a.q,a.g,a.r):{};el("agBilled").textContent=money(a.p);el("agTheory").textContent=money(v.theory);el("agConfirmed").textContent=v.confirmed==null?"Non vérifié":money(v.confirmed)}
function save(e){
 e.preventDefault();var a=values();if(!a.valid){el("agMessage").textContent=" Données invalides";return}
 var name=el("agProduct").value.trim();if(!name)return;
 var rows=load();rows.push({id:String(Date.now()),product:name,supplier:el("agSupplier").value.trim(),price:a.p,paid:a.q,free:a.g,received:a.r});
 try{localStorage.setItem(key,JSON.stringify(rows));el("agMessage").textContent=" Enregistré localement";render()}catch(e){el("agMessage").textContent=" Échec sauvegarde"}
}
function render(){
 var rows=load(),body=el("agRows");body.textContent="";
 if(!rows.length){var tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="Aucun accord sauvegardé. Le Quincy à gauche est un exemple.";tr.appendChild(td);body.appendChild(tr);return}
 rows.forEach(function(a){
 var v=calc(a.price,a.paid,a.free,a.received),tr=document.createElement("tr");
 var vals=[a.product+(a.supplier?" — "+a.supplier:""),money(a.price),money(v.theory),v.confirmed===null?"—":money(v.confirmed),a.received===null?"À vérifier":"Vérifié sur le lot"];
 vals.forEach(function(s){var td=document.createElement("td");td.textContent=s;tr.appendChild(td)});
 var td=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.dataset.id=a.id;btn.textContent="Supprimer";td.appendChild(btn);tr.appendChild(td);body.appendChild(tr)
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();