import { getUser } from "@netlify/identity";
const send=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const September={month:"2026-09",siteId:"OCEAN",gross:80922.78,patronales:19680.58,charged:100603.36,source:"Journal de paie MySilae"};
export default async function(req){
 if(req.method!=="GET")return send({error:"Méthode interdite"},405);
 let user;try{user=await getUser();}catch(_){}
 if(!user?.email)return send({error:"Connexion requise"},401);
 const allow=(process.env.RH_ALLOWED_EMAILS||process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allow.includes(user.email.toLowerCase()))return send({error:"Accès refusé"},403);
 return send({ok:true,month:September.month,payroll:September,sourceStatus:"journal MySilae disponible",reconciliationStatus:"à contrôler"});
}
