import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const store=()=>getStore({name:"locean-private-purchase-catalog",consistency:"strong"});
const clean=(v,max=250)=>String(v??"").trim().slice(0,max);
const norm=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const number=v=>{const x=Number(clean(v).replace(/[\u202f\u00a0\s]/g,"").replace(",","."));return Number.isFinite(x)&&x>=0&&x<=100000?x:null;};
function classify(family){
 const f=norm(family);
 if(/vin|champagne|spiritueux|biere|cidre|soft|eau|jus|sirops/.test(f))return {category:"Bar",subcategory:/biere|cidre/.test(f)?"Bières & cidres":/vin/.test(f)?"Autres boissons":/soft|eau|jus/.test(f)?"Softs & eaux":"Autres boissons"};
 if(/cafe|the|infusion/.test(f))return {category:"Bar",subcategory:"Cafés, thés & boissons chaudes"};
 if(/entretien|hygiene|nettoyage/.test(f))return {category:"Hygiène",subcategory:"Entretien"};
 if(/emballage|consommable/.test(f))return {category:"Hygiène",subcategory:"Consommables & emballages"};
 if(/viande|charcuterie|volaille/.test(f))return {category:"Cuisine",subcategory:"Viandes & volailles"};
 if(/poisson|crustace|fruit de mer/.test(f))return {category:"Cuisine",subcategory:"Poissons & fruits de mer"};
 if(/legume|fruit/.test(f))return {category:"Cuisine",subcategory:"Fruits & légumes"};
 if(/cremerie|fromage|oeuf|lait/.test(f))return {category:"Cuisine",subcategory:"Crèmerie & fromages"};
 if(/epicerie/.test(f))return {category:"Cuisine",subcategory:"Épicerie salée"};
 if(/surgel/.test(f))return {category:"Cuisine",subcategory:"Surgelés"};
 if(/pain|boulangerie/.test(f))return {category:"Cuisine",subcategory:"Pain & boulangerie"};
 return {category:"À classer",subcategory:""};
}
async function readPage(url,secret,startRow){
 const r=await fetch(url,{method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({secret,action:"readSheet",sheet:"Produits",startRow,limit:1000})});
 if(!r.ok)throw Error("Erreur de connexion Google Sheets");
 const data=await r.json();if(!data.ok||!Array.isArray(data.rows))throw Error("Réponse Sheets invalide");return data;
}
async function sourceRows(){
 const url=process.env.LOCEAN_SHEETS_API_URL,secret=process.env.LOCEAN_SHEETS_API_SECRET;
 if(!url||!secret)throw Error("Connexion Google Sheets non configurée");
 const first=await readPage(url,secret,1),headers=first.rows[0]||[];
 const expected=["fournisseur","code","designation","famille","unite","prix_actuel_ht","date_dernier_achat","fiable"];
 if(!expected.every(h=>headers.includes(h)))throw Error("Colonnes obligatoires manquantes dans Produits");
 const total=Number(first.totalRows)||first.rows.length;
 if(total>12000)throw Error("Catalogue Sheets trop volumineux");
 const values=first.rows.slice(1);
 for(let i=1001;i<=total;i+=1000){const part=await readPage(url,secret,i);values.push(...part.rows);}
 return values.map(line=>Object.fromEntries(headers.map((h,i)=>[h,line[i]??""])));
}
function indexCatalog(products){
 const byRef=new Map(),ambig=new Set();
 products.forEach((p,i)=>{
  const k=norm(p.supplier)+"|"+norm(p.supplierReference);
  if(k==="|"||!p.supplier||!p.supplierReference)return;
  if(byRef.has(k))ambig.add(k);else byRef.set(k,i);
 });return {byRef,ambig};
}
function priceEntry(price,unit,actor,date){
 return {id:crypto.randomUUID(),price,unit,at:new Date().toISOString(),source:"sheets-pennylane",reason:"Actualisation du prix depuis export Pennylane · dernier achat "+date,actor,invalidatedAt:null,invalidatedBy:null,invalidatedReason:null};
}
export default async function(req){
 if(!["GET","POST"].includes(req.method))return send({error:"Méthode non autorisée"},405);
 let user;try{user=await getUser();}catch(_){}
 if(!user?.email)return send({error:"Connexion requise"},401);
 const allow=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allow.includes(user.email.toLowerCase()))return send({error:"Accès interdit"},403);
 let payload={};if(req.method==="POST"){try{payload=await req.json();}catch(_){return send({error:"Requête invalide"},400);}if(payload.establishment!=="LOCEAN"||payload.confirm!==true)return send({error:"Validation explicite requise"},400);}
 try{
  const records=await sourceRows(),db=store(),saved=await db.get("ocean/latest",{type:"json",consistency:"strong"})||{products:[]};
  const products=Array.isArray(saved.products)?saved.products.slice():[];
  const {byRef,ambig}=indexCatalog(products);
  const seen=new Set(),statistics={source:records.length,eligible:0,newProducts:0,pricesUpdated:0,unchanged:0,skipped:0,ambiguous:0,unclassified:0};
  const samples=[];
  for(const row of records){
   const supplier=clean(row.fournisseur,180),reference=clean(row.code,120),name=clean(row.designation);
   const price=number(row.prix_actuel_ht),date=clean(row.date_dernier_achat,20);
   const reliable=norm(row.fiable)==="oui";
   const k=norm(supplier)+"|"+norm(reference);
   if(!supplier||!reference||!name||price===null||!reliable||seen.has(k)){statistics.skipped++;continue;}
   seen.add(k);statistics.eligible++;
   if(ambig.has(k)){statistics.ambiguous++;continue;}
   const match=byRef.get(k);
   if(match!==undefined){
    const old=products[match];
    if(old.archivedAt||old.sourcePrice==="manuel"){statistics.skipped++;continue;}
    // Never apply a stale export over a newer purchase or a human price correction.
    const priorDate=clean(old.sourceLastPurchaseDate,20);
    const newer=!priorDate||!!date&&date>priorDate;
    const changed=Math.abs(Number(old.price)-price)>0.000001;
    if(!newer||!changed){statistics.unchanged++;continue;}
    statistics.pricesUpdated++;
    if(samples.length<10)samples.push({type:"prix",name,supplier,from:old.price,to:price});
    if(req.method==="POST"){
     const history=Array.isArray(old.priceHistory)?old.priceHistory.slice():[];
     if(!history.length&&Number.isFinite(Number(old.price)))history.push(priceEntry(Number(old.price),clean(old.unit),"Prism",priorDate||"initial"));
     history.push(priceEntry(price,clean(old.unit)||clean(row.unite),user.email,date));
     products[match]={...old,price,priceHistory:history.slice(-500),sourceLastPurchaseDate:date,sourcePrice:"Sheets Pennylane"};
    }
   }else{
    // Only supplier+reference identifies an imported row. Names alone are not merged.
    const classification=classify(row.famille);
    if(classification.category==="À classer")statistics.unclassified++;
    statistics.newProducts++;
    if(samples.length<10)samples.push({type:"nouveau",name,supplier,category:classification.category});
    if(req.method==="POST"){
     products.push({id:"prd-"+crypto.randomUUID(),name,category:classification.category,subcategory:classification.subcategory,
      supplier,supplierReference:reference,unit:clean(row.unite,120)||"Non précisée",
      price,inventoryQuantity:null,locations:[],priceHistory:[priceEntry(price,clean(row.unite),user.email,date)],
      source:"Sheets Pennylane",sourceLastPurchaseDate:date,sourcePrice:"Sheets Pennylane",
      originalFamily:clean(row.famille,100),needsClassification:classification.category==="À classer",
      createdAt:new Date().toISOString(),createdBy:user.email});
     byRef.set(k,products.length-1);
    }
   }
  }
  if(req.method==="POST"){
   await db.setJSON("ocean/latest",{...saved,reference:saved.reference||"Catalogue Prism + import Pennylane",savedAt:new Date().toISOString(),products});
  }
  return send({ok:true,preview:req.method==="GET",...statistics,samples,updatedCatalogCount:req.method==="POST"?products.length:undefined});
 }catch(err){console.error("Prism synchronisation produits",err);return send({error:err.message||"Synchronisation des prix indisponible"},502);}
}
