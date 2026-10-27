import { getUser } from "@netlify/identity";
import { createSign } from "node:crypto";

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const b64=(v)=>Buffer.from(JSON.stringify(v)).toString("base64url");
async function googleAccessToken(credentials){
  const now=Math.floor(Date.now()/1000);
  const payload={iss:credentials.client_email,scope:"https://www.googleapis.com/auth/spreadsheets.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600};
  const signing=b64({alg:"RS256",typ:"JWT"})+"."+b64(payload);
  const signer=createSign("RSA-SHA256");
  signer.update(signing);signer.end();
  const jwt=signing+"."+signer.sign(credentials.private_key.replace(/\\n/g,"\n")).toString("base64url");
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})});
  const data=await res.json();
  if(!res.ok||!data.access_token)throw new Error("Autorisation Google refusée");
  return data.access_token;
}
export default async function(req){
  if(req.method!=="GET")return json({error:"Méthode non autorisée"},405);
  let user=null;
  try{user=await getUser();}catch(error){return json({error:"Vérification du compte indisponible"},503);}
  if(!user?.email)return json({error:"Connexion requise"},401);
  const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!allowed.length||!allowed.includes(user.email.toLowerCase()))return json({error:"Accès aux ventes non autorisé pour ce compte"},403);
  const sheetId=process.env.SALES_SHEET_ID;
  const serviceJson=process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if(!sheetId||!serviceJson)return json({error:"Connexion Google Sheets à configurer dans Netlify"},503);
  try{
    const cred=JSON.parse(serviceJson);
    if(!cred.client_email||!cred.private_key)throw new Error("Identifiants du compte de service incomplets");
    const accessToken=await googleAccessToken(cred);
    const range=encodeURIComponent("Jours!A1:L");
    const url="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(sheetId)+"/values/"+range+"?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING";
    const response=await fetch(url,{headers:{Authorization:"Bearer "+accessToken}});
    if(!response.ok)throw new Error("Accès Google Sheets refusé ("+response.status+")");
    const values=(await response.json()).values||[];
    const columns=values.shift()||[];
    const fields=["date","etablissement","ca_ttc","couverts","ticket_moyen","ca_ht","nb_tickets"];
    if(!fields.every(x=>columns.includes(x)))throw new Error("Colonnes requises absentes dans Jours");
    const rows=values.map(v=>Object.fromEntries(fields.map(k=>[k,v[columns.indexOf(k)]]))).filter(r=>r.date&&r.ca_ttc!==undefined);
    return json({source:"LOCEAN_DATA_API",rows,updatedAt:new Date().toISOString()});
  }catch(e){console.error("sales read:",e.message);return json({error:"Impossible de lire Google Sheets : "+e.message},502);}
}
