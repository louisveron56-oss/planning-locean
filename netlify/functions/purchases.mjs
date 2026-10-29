import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const store=()=>getStore({name:"locean-private-purchase-catalog",consistency:"strong"});
const normalize=(x,max=250)=>String(x??"").trim().slice(0,max);
const priceNumber=(v)=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100000?Number(v):null;
const subcategories={
 "Bar":["Vins rouges","Vins blancs","Vins rosés","Champagnes & effervescents","Spiritueux","Bières & cidres","Softs & eaux","Cafés, thés & boissons chaudes","Sirops & ingrédients bar","Autres boissons"],
 "Cuisine":["Viandes & volailles","Poissons & fruits de mer","Fruits & légumes","Crèmerie & fromages","Épicerie salée","Épicerie sucrée","Surgelés","Pain & boulangerie","Autres cuisine"],
 "Hygiène":["Entretien","Consommables & emballages","Hygiène corporelle","Autres hygiène"]
};
const zones=["Bar","Cave","Réserve","Cuisine","Chambre froide","Autre"];
const subtype=(category,x)=>subcategories[category]?.includes(x)?x:"";
const locations=(x)=>Array.isArray(x)?[...new Set(x.map(v=>normalize(v,60)).filter(v=>zones.includes(v)))].slice(0,6):[];
const fingerprint=(p)=>[p.category,p.name,p.sourceRow||""].map(v=>normalize(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()).join("|");
function idFor(p){const key=fingerprint(p);let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return "prd-"+(h>>>0).toString(36);}
function entry(price,unit,reason,actor,at=new Date().toISOString(),source="manuel"){
 return {id:crypto.randomUUID(),price:Number(price),unit:normalize(unit,120),at,source,reason:normalize(reason,200),actor:normalize(actor,150),invalidatedAt:null,invalidatedBy:null,invalidatedReason:null};
}
function historyOf(p){return Array.isArray(p.priceHistory)?p.priceHistory.slice(0,500):[];}
function sameUnit(a,b){return normalize(a,120).toLocaleLowerCase("fr")===normalize(b,120).toLocaleLowerCase("fr");}
export default async function(req){
 if(!["GET","POST","PATCH"].includes(req.method))return send({error:"Méthode non autorisée"},405);
 let user;try{user=await getUser();}catch(_){return send({error:"Session indisponible"},401);}
 if(!user?.email)return send({error:"Connexion requise"},401);
 const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(user.email.toLowerCase()))return send({error:"Accès interdit"},403);
 try{
  const db=store(),saved=await db.get("ocean/latest",{type:"json",consistency:"strong"});
  if(req.method==="GET")return send({ready:!!saved,reference:saved?.reference||null,savedAt:saved?.savedAt||null,products:(saved?.products||[]).filter(p=>new URL(req.url).searchParams.get("archived")==="1"?!!p.archivedAt:!p.archivedAt).map(p=>({...p,id:p.id||idFor(p),priceHistory:historyOf(p)}))});
  const raw=await req.text();if(raw.length>1700000)return send({error:"Requête trop volumineuse"},413);
  let payload;try{payload=JSON.parse(raw);}catch(_){return send({error:"JSON invalide"},400);}
  if(payload?.establishment!=="LOCEAN")return send({error:"Établissement incorrect"},400);
  const actor=user.email.toLowerCase(),now=new Date().toISOString();
  if(req.method==="PATCH"){
   if(!saved)return send({error:"Catalogue non importé"},404);
   const products=Array.isArray(saved.products)?saved.products:[];
   const index=products.findIndex(p=>(p.id||idFor(p))===payload.productId);
   if(index<0)return send({error:"Produit introuvable. Actualise le catalogue."},404);
   const p={...products[index],id:products[index].id||idFor(products[index])};
   const history=historyOf(p);
   if(payload.action==="archive"||payload.action==="restore"){
    if(payload.action==="archive"&&p.archivedAt)return send({error:"Produit déjà dans la corbeille"},409);
    if(payload.action==="restore"&&!p.archivedAt)return send({error:"Produit déjà actif"},409);
    const updated={...p,archivedAt:payload.action==="archive"?now:null,archivedBy:payload.action==="archive"?actor:null};
    products[index]=updated;
    await db.setJSON("ocean/latest",{...saved,savedAt:now,products});
    return send({ok:true,product:updated,savedAt:now});
   }
   if(p.archivedAt)return send({error:"Produit archivé : restaure-le avant modification"},409);
   if(payload.action==="update"){
    const changes=payload.changes||{},category=normalize(changes.category,60),unit=normalize(changes.unit,120),name=normalize(changes.name);
    const price=priceNumber(changes.price);
    if(!name||!["Bar","Cuisine","Hygiène"].includes(category)||!unit||price===null)return send({error:"Nom, famille, conditionnement et prix HT valides obligatoires"},400);
    const quantity=changes.inventoryQuantity===""||changes.inventoryQuantity===null?null:Number(changes.inventoryQuantity);
    if(quantity!==null&&(!Number.isFinite(quantity)||quantity<0))return send({error:"Quantité d'inventaire invalide"},400);
    const changedPrice=Number(p.price)!==price||!sameUnit(p.unit,unit);
    const initial=history.length?history:[entry(Number(p.price),p.unit,"Valeur initiale enregistrée au catalogue",actor,saved.importedAt||saved.savedAt||now,"import")];
    const updated={...p,name,category,subcategory:subtype(category,normalize(changes.subcategory,90)),locations:locations(changes.locations),unit,price,inventoryQuantity:quantity,priceHistory:changedPrice?[...initial,entry(price,unit,normalize(payload.reason,200)||"Modification manuelle",actor)]:history};
    products[index]=updated;
    await db.setJSON("ocean/latest",{...saved,savedAt:now,products});
    return send({ok:true,product:updated,savedAt:now});
   }
   if(payload.action==="invalidate-price"){
    const reason=normalize(payload.reason,200);
    if(reason.length<8)return send({error:"Indique la raison de la correction (8 caractères minimum)."},400);
    const at=history.findIndex(h=>h.id===payload.entryId);
    if(at<0)return send({error:"Prix historique introuvable"},404);
    if(history[at].invalidatedAt)return send({error:"Ce prix est déjà écarté"},409);
    const lastValid=[...history].reverse().find(h=>!h.invalidatedAt);
    if(lastValid?.id===payload.entryId)return send({error:"Prix courant : corrige d'abord le prix du produit avant d'écarter cette valeur."},409);
    history[at]={...history[at],invalidatedAt:now,invalidatedBy:actor,invalidatedReason:reason};
    const updated={...p,priceHistory:history};products[index]=updated;
    await db.setJSON("ocean/latest",{...saved,savedAt:now,products});
    return send({ok:true,product:updated,savedAt:now});
   }
   return send({error:"Action inconnue"},400);
  }
  if(!Array.isArray(payload.products)||payload.products.length<1||payload.products.length>5000)return send({error:"Catalogue invalide"},400);
  const previous=new Map((saved?.products||[]).map(p=>[p.id||idFor(p),p]));
  const products=[];
  for(const rawProduct of payload.products){
   const name=normalize(rawProduct.name),category=normalize(rawProduct.category,60),price=priceNumber(rawProduct.price);
   if(!name||!["Bar","Cuisine","Hygiène"].includes(category)||price===null)return send({error:"Référence invalide dans le catalogue"},400);
   const p={name,category,price,inventoryQuantity:Number.isFinite(Number(rawProduct.inventoryQuantity))?Number(rawProduct.inventoryQuantity):null,unit:normalize(rawProduct.unit,120),source:normalize(rawProduct.source),sourceRow:normalize(rawProduct.sourceRow,60)};
   p.id=idFor(p);const old=previous.get(p.id);p.archivedAt=old?.archivedAt||null;p.archivedBy=old?.archivedBy||null;p.subcategory=subtype(category,old?.subcategory);p.locations=locations(old?.locations);p.priceHistory=historyOf(old||{});
   if(old&&(Number(old.price)!==price||!sameUnit(old.unit,p.unit))){
    if(!p.priceHistory.length)p.priceHistory.push(entry(old.price,old.unit,"Valeur précédente du catalogue",actor,saved.importedAt||saved.savedAt||now,"import"));
    p.priceHistory.push(entry(price,p.unit,"Remplacement du catalogue CSV",actor,now,"import"));
   }
   products.push(p);
  }
  // Conserver les références ajoutées depuis les factures validées lors d'un réimport CSV.
  const importedNames=new Set(products.map(p=>normalize(p.name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()));
  for(const prior of saved?.products||[]){
   if(prior.source!=="Facture validée"&&!prior.archivedAt)continue;
   const key=normalize(prior.name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
   if(!importedNames.has(key)){products.push(prior);importedNames.add(key);}
  }
  const record={reference:"Inventaire L’Océan · septembre 2026",savedAt:now,importedAt:now,products};
  await db.setJSON("ocean/latest",record);
  return send({ok:true,count:products.length,savedAt:now,products});
 }catch(error){console.error("Catalogue achats",error);return send({error:"Stockage du catalogue indisponible"},503);}
}