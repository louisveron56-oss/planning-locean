import { getUser } from "@netlify/identity";
import { readSheetCached, wantsRefresh, cacheInfo } from "./lib/sheet-cache.mjs";
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const parse=v=>{const x=String(v??"").replace(/[\s\u00a0\u202f€]/g,"").replace(",",".");return x===""?null:Number.isFinite(Number(x))?Number(x):null};
export default async function(request){
 if(request.method!=="GET")return reply({error:"Méthode non autorisée"},405);
 let user;try{user=await getUser()}catch(_){}
 if(!user?.email)return reply({error:"Connexion requise"},401);
 const allowed=(process.env.RH_ALLOWED_EMAILS||process.env.SALES_ALLOWED_EMAILS||"").split(",").map(v=>v.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(user.email.toLowerCase()))return reply({error:"Accès RH interdit"},403);
 const url=process.env.LOCEAN_SHEETS_API_URL,secret=process.env.LOCEAN_SHEETS_API_SECRET;
 if(!url||!secret)return reply({error:"Connexion RH Sheets non configurée"},503);
 try{
  const sheet=await readSheetCached({url,secret,sheet:"RH_Mensuel",maxRows:5000,refresh:wantsRefresh(request)}),headers=sheet.rows[0]||[];
  const keys=["mois","etablissement","brut","charges_patronales","cout_charge","cout_global_mysilae","avantages_nourriture","compte_641","comptes_633_645","ecart_641","ecart_charges","statut_rapprochement"];
  if(!keys.every(k=>headers.includes(k)))throw new Error("RH_Mensuel : colonnes obligatoires manquantes");
  const values=sheet.rows.slice(1);
  const cols=Object.fromEntries([...keys,"indemnites_649","cout_comptable","note_rapprochement"].map(k=>[k,headers.indexOf(k)])),seen=new Set(),months=[],duplicates=[],invalid=[];
  for(const r of values){
   const month=String(r[cols.mois]||"").trim(),site=String(r[cols.etablissement]||"");
   if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(month)||!site.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes("ocean"))continue;
   const id="OCEAN|"+month;if(seen.has(id)){duplicates.push(month);continue}seen.add(id);
   const numeric=["brut","charges_patronales","cout_charge","cout_global_mysilae","avantages_nourriture","compte_641","comptes_633_645","ecart_641","ecart_charges"];
   const out={month,siteId:"OCEAN",status:String(r[cols.statut_rapprochement]||"a_rapprocher")};
   for(const k of numeric)out[k]=parse(r[cols[k]]);
   out.indemnites_649=cols.indemnites_649>=0?parse(r[cols.indemnites_649]):null;
   out.cout_comptable=cols.cout_comptable>=0?parse(r[cols.cout_comptable]):null;
   out.note_rapprochement=cols.note_rapprochement>=0?String(r[cols.note_rapprochement]||"").slice(0,800):"";
   if(out.brut===null||out.charges_patronales===null||out.cout_charge===null||Math.abs(out.brut+out.charges_patronales-out.cout_charge)>.02){invalid.push(month);continue}
   months.push(out);
  }
  months.sort((a,b)=>a.month.localeCompare(b.month));
  const specific=new URL(request.url).searchParams.get("month");
  if(specific){const found=months.find(x=>x.month===specific);return reply({ok:true,available:!!found,month:specific,payroll:found?{gross:found.brut,patronales:found.charges_patronales,charged:found.cout_comptable??found.cout_charge,status:found.status}:null,duplicates,invalid,cache:cacheInfo(sheet)})}
  return reply({ok:true,months,duplicates,invalid,source:"Google Sheets / RH_Mensuel",definition:"Par défaut brut + charges patronales ; si compte 649 rapproché, coût comptable net documenté explicitement (sans double ajout de provisions)",cache:cacheInfo(sheet)});
 }catch(err){console.error("RH monthly:",err);return reply({error:"Impossible de lire RH_Mensuel : "+err.message},502)}
}
