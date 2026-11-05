import { getUser } from "@netlify/identity";
import { readSheetCached, wantsRefresh, cacheInfo } from "./lib/sheet-cache.mjs";
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const decimal=x=>{const s=String(x??"").replace(/[\s\u00a0\u202f€%]/g,"").replace(",",".");return s===""?null:Number.isFinite(Number(s))?Number(s):null};
export default async function(request){
 if(request.method!=="GET")return send({error:"Méthode non autorisée"},405);
 let user;try{user=await getUser()}catch(_){}
 if(!user?.email)return send({error:"Connexion requise"},401);
 const allow=(process.env.RH_ALLOWED_EMAILS||process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allow.includes(user.email.toLowerCase()))return send({error:"Accès non autorisé"},403);
 const url=process.env.LOCEAN_SHEETS_API_URL,secret=process.env.LOCEAN_SHEETS_API_SECRET;
 if(!url||!secret)return send({error:"Connecteur Sheets non configuré"},503);
 try{
  const sheet=await readSheetCached({url,secret,sheet:"Ratios",maxRows:5000,refresh:wantsRefresh(request)}),header=sheet.rows[0]||[];
  const fields=["mois","ca_ht","achats_alim_ht","achats_boissons_ht","matiere_ht","statut"];
  if(!fields.every(k=>header.includes(k)))throw new Error("Colonnes Ratios introuvables");
  const rows=sheet.rows.slice(1);
  const col=Object.fromEntries(fields.map(k=>[k,header.indexOf(k)])),seen=new Set(),duplicates=[],invalid=[];
  const months=[];
  for(const r of rows){
   const month=String(r[col.mois]||"").trim();if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month))continue;
   if(seen.has(month)){duplicates.push(month);continue;}seen.add(month);
   const ca=decimal(r[col.ca_ht]),food=decimal(r[col.achats_alim_ht]),drinks=decimal(r[col.achats_boissons_ht]),total=decimal(r[col.matiere_ht]);
   if([ca,food,drinks,total].some(x=>x===null)||ca<=0||Math.abs(food+drinks-total)>2){invalid.push(month);continue}
   const status=String(r[col.statut]||"non vérifié");
   const warnings=[];if(status.toLowerCase()!=="ok")warnings.push(status);
   if(food<0||drinks<0||total<0)warnings.push("Montant négatif : avoirs ou imputations à rapprocher");
   if(month>="2026-09")warnings.push("Complétude Pennylane à confirmer");
   months.push({month,ca,food,drinks,total,ratio:total/ca*100,ratioFood:food/ca*100,ratioDrinks:drinks/ca*100,status,warnings,validated:warnings.length===0});
  }
  months.sort((a,b)=>a.month.localeCompare(b.month));
  return send({ok:true,months,duplicates,invalid,source:"LOCEAN_DATA_API / Ratios (achats fournisseurs)",definition:"Achats de matières HT / CA HT ; ne comprend pas la variation de stocks",notConsumption:true,cache:cacheInfo(sheet)});
 }catch(err){console.error("materials:",err);return send({error:"Impossible de lire Ratios : "+err.message},502)}
}