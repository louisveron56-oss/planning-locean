import { getUser } from "@netlify/identity";

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const allowedSheets={
 products:{tab:"Produits",required:["fournisseur","code","designation","famille","prix_actuel_ht","prix_debut_ht","date_dernier_achat","evolution","nb_achats","fiable"]},
 suppliers:{tab:"Fournisseurs",required:["fournisseur","nb_produits","nb_factures","achats_ht_2024","achats_ht_2025","achats_ht_2026"]},
 purchases:{tab:"Achats",required:["date","fournisseur","categorie","ht","numero","source","mois","ttc"]},
 ratios:{tab:"Ratios",required:["mois","ca_ht","achats_alim_ht","achats_boissons_ht","matiere_ht","ratio_matiere"]}
};
async function sheetPage(url,secret,tab,startRow){
 const response=await fetch(url,{method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({secret,action:"readSheet",sheet:tab,startRow,limit:1000})});
 if(!response.ok)throw Error("Google Sheets HTTP "+response.status);
 const payload=await response.json();
 if(!payload.ok||!Array.isArray(payload.rows))throw Error(payload.error||"Réponse Google Sheets incorrecte");
 return payload;
}
export default async function(request){
 if(request.method!=="GET")return json({error:"Méthode non autorisée"},405);
 let user;try{user=await getUser();}catch(_){}
 if(!user?.email)return json({error:"Connexion requise"},401);
 const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(user.email.toLowerCase()))return json({error:"Accès interdit"},403);
 const type=new URL(request.url).searchParams.get("type");
 const spec=allowedSheets[type];
 if(!spec)return json({error:"Type de données inconnu"},400);
 const url=process.env.LOCEAN_SHEETS_API_URL,secret=process.env.LOCEAN_SHEETS_API_SECRET;
 if(!url||!secret)return json({error:"Connexion Google Sheets non configurée"},503);
 try{
  const first=await sheetPage(url,secret,spec.tab,1),headers=first.rows[0]||[];
  if(!spec.required.every(x=>headers.includes(x)))return json({error:"Colonnes manquantes dans l'onglet "+spec.tab},422);
  const total=Number(first.totalRows)||first.rows.length;
  if(total>25000)return json({error:"Onglet trop volumineux pour cette synchronisation"},422);
  const raw=first.rows.slice(1);
  for(let start=1001;start<=total;start+=1000){
   const page=await sheetPage(url,secret,spec.tab,start);
   raw.push(...page.rows);
  }
  const rows=raw.filter(row=>row.some(v=>String(v??"").trim())).map(row=>Object.fromEntries(headers.map((key,i)=>[String(key),row[i]??""])));
  return json({ok:true,source:"LOCEAN_DATA_API",tab:spec.tab,rows,count:rows.length,readAt:new Date().toISOString()});
 }catch(error){
  console.error("Prism Sheets achats",spec.tab,error);
  return json({error:"Lecture de l'onglet "+spec.tab+" impossible. Vérifie la publication Apps Script et les autorisations."},502);
 }
}
