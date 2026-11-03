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
   if(payload.action==="import-coco-reference"){
    const doc=payload.document;
    if(doc?.schema!=="prism-coco-reference-v1"||doc?.sourceEstablishment!=="COCO"||!Array.isArray(doc.ingredients)||doc.ingredients.length>300||!Array.isArray(doc.recipeLines)||doc.recipeLines.length>1500||!Array.isArray(doc.recipePrices)||doc.recipePrices.length>300)return send({error:"Fichier COCO non reconnu"},400);
    const cleanName=x=>normalize(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr").replace(/\s+/g," ");
    const known=new Set(products.filter(p=>!p.archivedAt).map(p=>cleanName(p.name)));
    const imported=[],already=[],review=[];
    const unique=new Set();
    for(const raw of doc.ingredients){
      const name=normalize(raw.name),category=normalize(raw.category,60),unit=normalize(raw.packageUnit,12),price=priceNumber(raw.packagePrice),qty=Number(raw.packageQuantity);
      const key=cleanName(name);
      if(!key||!name||!["Cuisine","Bar"].includes(category)){review.push({name:normalize(raw.name),reason:"Nom ou catégorie invalide"});continue}
      if(raw.status!=="candidate"||!["kg","L","pièce"].includes(unit)||price===null||!Number.isFinite(qty)||qty<=0){review.push({name,reason:(raw.reviewIssues||[]).join(", ")||"Conditionnement à confirmer"});continue}
      if(unique.has(key)){review.push({name,reason:"Doublon dans le fichier COCO"});continue}
      unique.add(key);
      if(known.has(key)){already.push(name);continue}
      if(products.length>=5000)return send({error:"Catalogue plein"},409);
      const priceUnit=Math.round(price/qty*1000000)/1000000;
      const product={id:"prd-"+crypto.randomUUID(),name,category,subcategory:"",locations:[],price:priceUnit,unit,inventoryQuantity:null,
       packaging:{quantity:qty,unit,purchasePrice:price},yield:Number(raw.yield)||1,
       source:"COCO - fichier référence",sourceEstablishment:"COCO",sourceRow:String(raw.row||""),
       priceStatus:"indicatif_a_rapprocher_facture",sourcePrice:"import COCO",createdAt:now,createdBy:actor,
       priceHistory:[entry(priceUnit,unit,"Prix indicatif du classeur COCO (à rapprocher des factures)",actor,now,"import-coco")],
       archivedAt:null,archivedBy:null};
      products.push(product);known.add(key);imported.push(name);
    }
    const batch={schema:doc.schema,sourceFile:normalize(doc.sourceFile,200),importedAt:now,importedBy:actor,
      ingredients:doc.ingredients,recipeLines:doc.recipeLines,recipePrices:doc.recipePrices,
      summary:{imported:imported.length,existing:already.length,review:review.length}};
    await db.setJSON("ocean/coco-reference",batch);
    await db.setJSON("ocean/latest",{...saved,savedAt:now,products});
    return send({ok:true,created:imported.length,existing:already.length,review:review.length,
      importedNames:imported,existingNames:already,toReview:review,recipes:doc.recipePrices.length,recipeLines:doc.recipeLines.length,
      note:"Tarifs COCO indicatifs, prix fournisseurs existants conservés"},200);
   }
   if(payload.action==="create-from-recipe"){
    const raw=payload.product||{},name=normalize(raw.name,250),category=normalize(raw.category,60);
    const packageQty=Number(raw.packageQuantity),packagePrice=priceNumber(raw.packagePrice),packageUnit=normalize(raw.packageUnit,12);
    if(!name||name.length<2||!["Bar","Cuisine"].includes(category))return send({error:"Nom et famille Bar ou Cuisine obligatoires"},400);
    if(!["kg","L","pièce"].includes(packageUnit)||!Number.isFinite(packageQty)||packageQty<=0||packageQty>100000||packagePrice===null)return send({error:"Indique le conditionnement, sa quantité et son prix d'achat HT"},400);
    const unitPrice=Math.round(packagePrice/packageQty*1000000)/1000000;
    if(!Number.isFinite(unitPrice)||unitPrice>100000)return send({error:"Prix unitaire hors limites"},400);
    const key=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr");
    const match=products.find(p=>!p.archivedAt&&normalize(p.name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr")===key);
    if(match)return send({error:"Produit déjà présent dans le catalogue : "+match.name,existingProductId:match.id||idFor(match)},409);
    if(products.length>=5000)return send({error:"Catalogue plein"},409);
    const product={
     id:"prd-"+crypto.randomUUID(),name,category,subcategory:"",locations:[],
     price:unitPrice,unit:packageUnit,inventoryQuantity:null,
     packaging:{quantity:packageQty,unit:packageUnit,purchasePrice:packagePrice},
     source:"Fiche technique",sourcePrice:"manuel",sourceRow:"",
     priceHistory:[entry(unitPrice,packageUnit,"Création depuis fiche technique — conditionnement "+packageQty+" "+packageUnit+" à "+packagePrice+" € HT",actor,now,"fiche-technique")],
     archivedAt:null,archivedBy:null,createdAt:now,createdBy:actor
    };
    products.push(product);
    await db.setJSON("ocean/latest",{...saved,savedAt:now,products});
    return send({ok:true,product,savedAt:now,created:true},201);
   }
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
    if(!name||!["Bar","Cuisine","Hygiène","À classer"].includes(category)||!unit||price===null)return send({error:"Nom, famille, conditionnement et prix HT valides obligatoires"},400);
    const quantity=changes.inventoryQuantity===""||changes.inventoryQuantity===null?null:Number(changes.inventoryQuantity);
    if(quantity!==null&&(!Number.isFinite(quantity)||quantity<0))return send({error:"Quantité d'inventaire invalide"},400);
    const changedPrice=Number(p.price)!==price||!sameUnit(p.unit,unit);
    const initial=history.length?history:[entry(Number(p.price),p.unit,"Valeur initiale enregistrée au catalogue",actor,saved.importedAt||saved.savedAt||now,"import")];
    const updated={...p,name,category,subcategory:subtype(category,normalize(changes.subcategory,90)),locations:locations(changes.locations),unit,price,inventoryQuantity:quantity,priceHistory:changedPrice?[...initial,entry(price,unit,normalize(payload.reason,200)||"Modification manuelle",actor)]:history,sourcePrice:changedPrice?"manuel":p.sourcePrice};
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
   if(!name||!["Bar","Cuisine","Hygiène","À classer"].includes(category)||price===null)return send({error:"Référence invalide dans le catalogue"},400);
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
   if(!["Facture validée","Sheets Pennylane","Fiche technique","COCO - fichier référence"].includes(prior.source)&&!prior.archivedAt)continue;
   const key=normalize(prior.name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
   if(!importedNames.has(key)){products.push(prior);importedNames.add(key);}
  }
  const record={reference:"Inventaire L’Océan · septembre 2026",savedAt:now,importedAt:now,products};
  await db.setJSON("ocean/latest",record);
  return send({ok:true,count:products.length,savedAt:now,products});
 }catch(error){console.error("Catalogue achats",error);return send({error:"Stockage du catalogue indisponible"},503);}
}