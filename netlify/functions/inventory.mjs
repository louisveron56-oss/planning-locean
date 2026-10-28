import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const store=()=>getStore({name:"locean-private-inventory",consistency:"strong"});
const catalog=()=>getStore({name:"locean-private-purchase-catalog",consistency:"strong"});
const clean=(v,n=160)=>String(v??"").trim().slice(0,n);
const quantity=(v)=>v===null||v===undefined||v===""?null:Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=1000000?Number(v):NaN;
const money=(v)=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=1000000?Number(v):NaN;
const zoneNames=["Bar","Cave","Réserve","Cuisine","Chambre froide","Autre"];
function sameId(a,b){return String(a)===String(b);}
function safeLine(row,product){
 const sealed=quantity(row.sealed),open=quantity(row.open),openPct=quantity(row.openPct),unitPrice=money(row.unitPriceHT);
 if(!product||![sealed,open,openPct,unitPrice].every(Number.isFinite)||openPct>100)return null;
 return {productId:clean(row.productId,100),name:clean(product.name),category:clean(product.category),
 unit:clean(product.unit,100),sealed,open,openPct,unitPriceHT:unitPrice,
 quantity:Math.round((sealed+open*openPct/100)*10000)/10000,
 valueHT:Math.round((sealed+open*openPct/100)*unitPrice*100)/100,
 unitConfirmed:row.unitConfirmed===true,note:clean(row.note,220)};
}
async function authorize(){
 let user;try{user=await getUser();}catch(_){}
 if(!user?.email)return {error:respond({error:"Connexion requise"},401)};
 const allowed=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowed.includes(user.email.toLowerCase()))return {error:respond({error:"Accès refusé"},403)};
 return {user};
}
export default async function(req){
 if(!["GET","POST"].includes(req.method))return respond({error:"Méthode interdite"},405);
 const auth=await authorize();if(auth.error)return auth.error;
 try{
  const db=store(),id=new URL(req.url).searchParams.get("id");
  if(req.method==="GET"){
   if(id){
    if(!/^[a-f0-9-]{36}$/.test(id))return respond({error:"Identifiant invalide"},400);
    const session=await db.get("session/"+id,{type:"json",consistency:"strong"});
    return session?respond({session}):respond({error:"Inventaire introuvable"},404);
   }
   const list=await db.get("index",{type:"json",consistency:"strong"})||[];
   return respond({sessions:list.slice(0,250),zones:zoneNames});
  }
  const text=await req.text();if(text.length>1000000)return respond({error:"Données trop volumineuses"},413);
  let p;try{p=JSON.parse(text);}catch(_){return respond({error:"Données invalides"},400);}
  if(p.establishment!=="LOCEAN")return respond({error:"Établissement incorrect"},400);
  if(p.action==="save"){
   if(!zoneNames.includes(p.zone)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date||""))return respond({error:"Date et zone requises"},400);
   if(!Array.isArray(p.lines)||p.lines.length>1500)return respond({error:"Liste de produits trop volumineuse"},400);
   const existing=p.id?await db.get("session/"+p.id,{type:"json",consistency:"strong"}):null;
   if(p.id&&!existing)return respond({error:"Inventaire non retrouvé. Actualise."},404);
   if(existing?.status==="validated")return respond({error:"Inventaire validé : modification interdite. Crée un inventaire correctif."},409);
   if(existing&&p.version!==existing.version)return respond({error:"Inventaire modifié dans une autre session. Recharge avant d'enregistrer."},409);
   const products=(await catalog().get("ocean/latest",{type:"json",consistency:"strong"}))?.products||[];
   function legacyId(x){const key=[x.category,x.name,x.sourceRow||""].map(v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()).join("|");let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return "prd-"+(h>>>0).toString(36);}
   const byId=new Map(products.map(x=>[String(x.id||legacyId(x)),x]));
   const seen=new Set(),lines=[];
   for(const row of p.lines){
    if(seen.has(row.productId))return respond({error:"Produit compté plusieurs fois"},400);
    seen.add(row.productId);
    const line=safeLine(row,byId.get(String(row.productId)));
    if(!line)return respond({error:"Ligne invalide ou référence absente du catalogue"},400);
    lines.push(line);
   }
   const now=new Date().toISOString(),session={
    id:existing?.id||crypto.randomUUID(),establishment:"LOCEAN",zone:p.zone,date:p.date,
    label:clean(p.label,100),notes:clean(p.notes,500),status:"draft",zoneComplete:p.zoneComplete===true,version:(existing?.version||0)+1,
    lines,createdAt:existing?.createdAt||now,updatedAt:now,createdBy:existing?.createdBy||auth.user.email,
    updatedBy:auth.user.email,validatedAt:null,validatedBy:null,
    valueHT:Math.round(lines.reduce((n,l)=>n+l.valueHT,0)*100)/100,
    unconfirmedUnits:lines.filter(l=>!l.unitConfirmed).length
   };
   await db.setJSON("session/"+session.id,session);
   const index=await db.get("index",{type:"json",consistency:"strong"})||[];
   const row={id:session.id,zone:session.zone,date:session.date,label:session.label,status:session.status,valueHT:session.valueHT,
    lines:session.lines.length,unconfirmedUnits:session.unconfirmedUnits,updatedAt:session.updatedAt};
   const updated=[row,...index.filter(x=>x.id!==row.id)].sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt)).slice(0,250);
   await db.setJSON("index",updated);
   return respond({ok:true,session,summary:updated});
  }
  if(p.action==="validate"){
   if(!/^[a-f0-9-]{36}$/.test(p.id||""))return respond({error:"Identifiant invalide"},400);
   const existing=await db.get("session/"+p.id,{type:"json",consistency:"strong"});
   if(!existing)return respond({error:"Inventaire introuvable"},404);
   if(existing.status==="validated")return respond({error:"Inventaire déjà validé"},409);
   if(existing.version!==p.version)return respond({error:"Inventaire modifié : recharge avant de valider"},409);
   if(!existing.lines.length)return respond({error:"Ajoute au moins une ligne"},400);
   if(!existing.zoneComplete)return respond({error:"Confirme que le comptage de la zone est complet avant validation."},400);
   if(existing.unconfirmedUnits)return respond({error:"Confirme les unités et prix de toutes les lignes avant de valider"},400);
   const now=new Date().toISOString(),session={...existing,status:"validated",version:existing.version+1,validatedAt:now,validatedBy:auth.user.email,updatedAt:now};
   await db.setJSON("session/"+session.id,session);
   const index=await db.get("index",{type:"json",consistency:"strong"})||[];
   const updated=index.map(row=>row.id===session.id?{...row,status:"validated",updatedAt:now}:row);
   await db.setJSON("index",updated);
   return respond({ok:true,session,summary:updated});
  }
  return respond({error:"Action inconnue"},400);
 }catch(error){console.error("Inventaires Prism",error);return respond({error:"Service inventaire indisponible"},503);}
}