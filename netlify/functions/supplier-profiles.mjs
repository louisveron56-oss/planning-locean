import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const store=()=>getStore({name:"locean-private-supplier-profiles",consistency:"strong"});
const key=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().slice(0,180);
const safe=(x,max=180)=>String(x??"").trim().slice(0,max);
export default async function(req){
 if(!["GET","PATCH"].includes(req.method))return send({error:"Méthode interdite"},405);
 let u;try{u=await getUser();}catch(_){}
 if(!u?.email)return send({error:"Connexion requise"},401);
 const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(u.email.toLowerCase()))return send({error:"Accès interdit"},403);
 try{
  const db=store();
  if(req.method==="GET"){const profiles=await db.get("ocean/profiles",{type:"json",consistency:"strong"})||{};return send({profiles});}
  const body=await req.json(),supplier=safe(body.supplier),id=key(supplier),name=safe(body.displayName),note=safe(body.note,500);
  if(body.establishment!=="LOCEAN"||!id||id.length<2||!name||name.length<2)return send({error:"Fournisseur ou nom invalide"},400);
  const profiles=await db.get("ocean/profiles",{type:"json",consistency:"strong"})||{};
  profiles[id]={sourceName:supplier,displayName:name,note,updatedAt:new Date().toISOString(),updatedBy:u.email};
  await db.setJSON("ocean/profiles",profiles);
  return send({ok:true,profile:profiles[id]});
 }catch(err){console.error("Prism fournisseurs",err);return send({error:"Mise à jour des fiches fournisseurs impossible"},503);}
}
