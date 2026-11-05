import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
const adminList=()=>String(process.env.PRISM_PAYROLL_ADMIN_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
const legacyKey="remunerations-2026-09-v1";
const validPeriod=s=>/^20\\d{2}-(0[1-9]|1[0-2])$/.test(String(s||""));
const validNum=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<100000;
const legacyTotals={OCEAN:{count:40,gross:80922.78,net:58727.72,employer_cost:97641.01},ESCALE:{count:25,gross:43894.69,net:51204.63,employer_cost:51204.63}};
const periodKey=p=>"remunerations-"+p+"-v1";
function validate(data){
 if(!["prism-private-payroll-v1","prism-private-payroll-v2"].includes(data?.schema)||!validPeriod(data.period)||!Array.isArray(data.rows)||!data.rows.length||data.rows.length>150)throw Error("Format de paie inattendu");
 const seen=new Set();
 for(const p of data.rows){
  if(!["OCEAN","ESCALE"].includes(p.establishment)||!/^\\d{5}$/.test(p.employee_id)||typeof p.name!=="string"||!p.name.trim()||p.name.length>100)throw Error("Ligne d'identité invalide");
  const id=p.establishment+"|"+p.employee_id;if(seen.has(id))throw Error("Matricule en doublon : "+id);seen.add(id);
  for(const k of ["gross","net","employer_cost"])if(!validNum(p[k]))throw Error("Montant de paie invalide");
  p.record_id=id;p.status=p.status==="archived"?"archived":"visible";
 }
 if(data.period==="2026-09"&&data.schema==="prism-private-payroll-v1"){
  if(data.rows.length!==65)throw Error("Effectif septembre incohérent");
  const expected={OCEAN:{count:40,gross:80922.78,net:58727.72,employer_cost:97641.01},ESCALE:{count:25,gross:43894.69,net:32604.10,employer_cost:51204.63}};
  for(const [site,exp] of Object.entries(expected)){
   const list=data.rows.filter(x=>x.establishment===site);if(list.length!==exp.count)throw Error("Effectif incohérent "+site);
   for(const k of ["gross","net","employer_cost"]){
    const total=Math.round(list.reduce((a,p)=>a+p[k],0)*100)/100;
    if(Math.abs(total-exp[k])>.01)throw Error("Total "+k+" incohérent "+site);
   }
  }
 }
 if(data.period!=="2026-09"&&data.schema!=="prism-private-payroll-v2")throw Error("Format v2 requis pour les nouveaux mois");
 for(const [site,expected] of Object.entries(data.aggregates||{})){
  if(!["OCEAN","ESCALE"].includes(site))throw Error("Établissement inconnu dans les totaux");
  const list=data.rows.filter(p=>p.establishment===site);
  for(const k of ["gross","net","employer_cost"]){
   if(expected[k]===undefined)continue;
   if(!validNum(expected[k]))throw Error("Total de contrôle invalide");
   const total=Math.round(list.reduce((a,p)=>a+p[k],0)*100)/100;
   if(Math.abs(total-expected[k])>.02)throw Error("Somme des fiches différente du total de contrôle MySilae pour "+site+" ("+k+")");
  }
 }
}
export default async function(request){
 let user;try{user=await getUser()}catch(_){}
 if(!user?.email)return respond({error:"Connexion Prism requise"},401);
 const admins=adminList();
 if(!admins.length)return respond({error:"Dossier salaires verrouillé : configurez PRISM_PAYROLL_ADMIN_EMAILS côté Netlify"},503);
 if(!admins.includes(user.email.toLowerCase()))return respond({error:"Réservé à l'administration"},403);
 let store;try{store=getStore({name:"prism-private-payroll",consistency:"strong"})}catch(e){return respond({error:"Stockage privé indisponible"},503)}
 const month=new URL(request.url).searchParams.get("month")||"2026-09";
 if(!validPeriod(month))return respond({error:"Mois invalide (AAAA-MM)"},400);
 const key=periodKey(month);
 try{
  if(request.method==="GET"){const data=(await store.get(key,{type:"json"}))||(month==="2026-09"?await store.get(legacyKey,{type:"json"}):null);return respond({ok:true,configured:true,period:month,rows:data?.rows||[],ready:!!data});}
  if(request.method==="POST"){
   const txt=await request.text();if(txt.length>1000000)return respond({error:"Fichier trop volumineux"},413);
   const body=JSON.parse(txt);
   if(body.action==="import"){
    if(body.document?.period!==month)return respond({error:"Le fichier ne correspond pas au mois sélectionné"},400);
    const old=(await store.get(key,{type:"json"}))||(month==="2026-09"?await store.get(legacyKey,{type:"json"}):null);if(old?.rows?.length)return respond({error:"Paie déjà importée : ne pas écraser les archives. Demander un import versionné."},409);
    validate(body.document);
    const data={...body.document,importedAt:new Date().toISOString(),importedBy:user.email};
    await store.setJSON(key,data);return respond({ok:true,count:data.rows.length});
   }
   if(body.action==="archive"){
    const data=(await store.get(key,{type:"json"}))||(month==="2026-09"?await store.get(legacyKey,{type:"json"}):null);if(!data?.rows)return respond({error:"Importer d'abord les paies"},404);
    if(typeof body.record_id!=="string"||!["visible","archived"].includes(body.status))return respond({error:"Modification invalide"},400);
    const rec=data.rows.find(r=>r.record_id===body.record_id);if(!rec)return respond({error:"Salarié introuvable"},404);
    rec.status=body.status;rec.updatedAt=new Date().toISOString();rec.updatedBy=user.email;
    await store.setJSON(key,data);return respond({ok:true,record_id:rec.record_id,status:rec.status});
   }
   return respond({error:"Action inconnue"},400);
  }
  return respond({error:"Méthode interdite"},405);
 }catch(e){console.error("PRISM private payroll:",e);return respond({error:"Opération impossible : "+e.message},400)}
}