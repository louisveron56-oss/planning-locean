/* PRISM — Audit privé des anomalies de factures, sans retouche des prix */
import {getUser} from "@netlify/identity";
import {getStore} from "@netlify/blobs";
const history=()=>getStore({name:"locean-private-purchase-history-v1",consistency:"strong"});
const audits=()=>getStore({name:"locean-private-purchase-audit-v1",consistency:"strong"});
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const safe=(s,max=300)=>String(s??"").trim().slice(0,max);
const validKey=s=>typeof s==="string"&&s.length>0&&s.length<400&&!/[\r\n]/.test(s);
export default async function(req){
 if(!["GET","POST"].includes(req.method))return send({error:"Méthode interdite"},405);
 let user;try{user=await getUser();}catch(_){}
 if(!user?.email)return send({error:"Connexion requise"},401);
 const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(user.email.toLowerCase()))return send({error:"Accès interdit"},403);
 try{
  const active=await history().get("active",{type:"json",consistency:"strong"});
  if(!active)return send({ready:false,questions:[],answered:0});
  const products=Object.entries(active.products||{}).map(([key,p])=>({key,...p})).filter(p=>p.issues>0).sort((a,b)=>b.issues-a.issues||b.count-a.count);
  const audit=audits(),index=await audit.get("responses/"+active.run,{type:"json",consistency:"strong"})||{};
  if(req.method==="GET"){
   const page=Math.max(0,Math.min(500,Number(new URL(req.url).searchParams.get("page"))||0));
   const pending=products.filter(p=>!index[p.key]?.resolved);
   return send({ready:true,run:active.run,total:products.length,pending:pending.length,answered:Object.keys(index).length,page,
    questions:pending.slice(page*15,page*15+15).map(p=>({key:p.key,supplier:p.supplier,reference:p.reference,
    description:p.description,purchaseCount:p.count,anomalyCount:p.issues,first:p.first,last:p.last,
    previous:index[p.key]||null,
    question:"Peux-tu préciser l’unité de facturation et le conditionnement de cette référence, ou dire si les factures doivent être contrôlées ?"}))});
  }
  const raw=await req.text();if(raw.length>30000)return send({error:"Réponse trop volumineuse"},413);
  let body;try{body=JSON.parse(raw)}catch(_){return send({error:"JSON invalide"},400)}
  if(body.action!=="answer"||body.run!==active.run||!validKey(body.key)||!active.products[body.key])return send({error:"Question invalide"},400);
  const answer=safe(body.answer,1800),state=safe(body.status,30);
  if(answer.length<3||!["a_verifier","explication_fournie","resolution_confirmee"].includes(state))return send({error:"Réponse ou état invalide"},400);
  // Aucune correction d’unité ou de prix : on enregistre la réponse pour une validation contrôlée ultérieure.
  index[body.key]={answer,status:state,resolved:state==="resolution_confirmee",at:new Date().toISOString(),by:user.email.toLowerCase()};
  await audit.setJSON("responses/"+active.run,index);
  return send({ok:true,stored:true,priceChanged:false,ratioChanged:false});
 }catch(e){console.error("purchase audit",e);return send({error:"Audit temporairement indisponible"},500)}
}
