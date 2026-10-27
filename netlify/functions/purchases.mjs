import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const store=()=>getStore({name:"locean-private-purchase-catalog",consistency:"strong"});
const normalize=(x)=>String(x??"").trim().slice(0,250);
export default async function(req){
 if(!["GET","POST"].includes(req.method))return send({error:"Méthode non autorisée"},405);
 let user;
 try{user=await getUser();}catch(_){return send({error:"Session indisponible"},401);}
 if(!user?.email)return send({error:"Connexion requise"},401);
 const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(user.email.toLowerCase()))return send({error:"Accès interdit"},403);
 try{
  const db=store();
  if(req.method==="GET"){
   const saved=await db.get("ocean/latest",{type:"json",consistency:"strong"});
   return send({ready:!!saved,reference:saved?.reference||null,savedAt:saved?.savedAt||null,products:saved?.products||[]});
  }
  const raw=await req.text();
  if(raw.length>1700000)return send({error:"Fichier trop volumineux"},413);
  let payload;try{payload=JSON.parse(raw);}catch(_){return send({error:"JSON invalide"},400);}
  if(payload?.establishment!=="LOCEAN"||!Array.isArray(payload.products)||payload.products.length<1||payload.products.length>5000)return send({error:"Catalogue invalide"},400);
  const products=[];
  for(const entry of payload.products){
   const name=normalize(entry.name),category=normalize(entry.category),price=Number(entry.price);
   if(!name||!["Bar","Cuisine","Hygiène"].includes(category)||!Number.isFinite(price)||price<0||price>100000)return send({error:"Référence invalide dans le catalogue"},400);
   products.push({name,category,price,inventoryQuantity:Number.isFinite(Number(entry.inventoryQuantity))?Number(entry.inventoryQuantity):null,unit:normalize(entry.unit),source:normalize(entry.source),sourceRow:normalize(entry.sourceRow)});
  }
  const saved={reference:"Inventaire L’Océan · septembre 2026",savedAt:new Date().toISOString(),products};
  await db.setJSON("ocean/latest",saved);
  return send({ok:true,count:products.length,savedAt:saved.savedAt});
 }catch(error){console.error("Catalogue achats",error);return send({error:"Stockage du catalogue indisponible"},503);}
}