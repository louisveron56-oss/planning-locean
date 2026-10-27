import { getUser } from "@netlify/identity";
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
 if(!["Services","Familles","Paiements"].includes(sheet)||!Number.isInteger(start)||start<1||start>20001||start!==1&&(start-1)%1000!==0)return response({error:"Paramètres invalides"},400);
 try{
  const api=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},redirect:"follow",body:JSON.stringify({secret,action:"readSheet",sheet,startRow:start,limit:1000}),signal:AbortSignal.timeout(23000)});
  if(!api.ok)throw new Error("Erreur de passerelle HTTP "+api.status);
  const data=await api.json();if(!data.ok)throw new Error(data.error||"Erreur Apps Script");
  const rows=data.rows||[];
  return response({sheet,start,totalRows:data.totalRows,rows});
 }catch(err){console.error("Détail ventes",sheet,err);return response({error:"Lecture du détail Google Sheets indisponible"},502);}
}
