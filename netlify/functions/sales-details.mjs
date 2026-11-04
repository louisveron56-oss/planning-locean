import { getUser } from "@netlify/identity";
import { readSheetCached, wantsRefresh, cacheInfo } from "./lib/sheet-cache.mjs";
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export default async function(req){
 if(req.method!=="GET")return response({error:"Méthode non autorisée"},405);
 let user;
 try{user=await getUser();}catch(_){return response({error:"Session indisponible"},401);}
 if(!user?.email)return response({error:"Connexion requise"},401);
 const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(s=>s.trim().toLowerCase());
 if(!allowed.includes(user.email.toLowerCase()))return response({error:"Accès refusé"},403);
 const url=process.env.LOCEAN_SHEETS_API_URL,secret=process.env.LOCEAN_SHEETS_API_SECRET;
 if(!url||!secret)return response({error:"Configuration Sheets manquante"},503);
 const args=new URL(req.url).searchParams,sheet=args.get("sheet"),start=Number(args.get("start")||1);
 if(!["Services","Familles","Paiements","Contexte"].includes(sheet)||!Number.isInteger(start)||start<1||start>20001||start!==1&&(start-1)%1000!==0)return response({error:"Paramètres invalides"},400);
 try{
  const cached=await readSheetCached({url,secret,sheet,maxRows:21000,refresh:wantsRefresh(req)});
  const rows=cached.rows.slice(start-1,start-1+1000);
  return response({sheet,start,totalRows:cached.totalRows,rows,cache:cacheInfo(cached)});
 }catch(err){console.error("Détail ventes",sheet,err);return response({error:"Lecture du détail Google Sheets indisponible"},502);}
}
