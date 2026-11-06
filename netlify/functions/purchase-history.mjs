/* PRISM — Historique des achats, lecture seule vis-à-vis du catalogue et des ratios.
   Données commerciales dans Netlify Blobs privé, jamais dans GitHub. */
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";
const database=()=>getStore({name:"locean-private-purchase-history-v1",consistency:"strong"});
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const norm=(v,n=240)=>String(v??"").trim().slice(0,n);
const slug=v=>norm(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
const parseNum=v=>{if(v===null||v===undefined||v==="")return null;const a=Number(String(v).replace(/[€\s\u00a0\u202f]/g,"").replace(",","."));return Number.isFinite(a)?a:null;};
const date=v=>{const s=norm(v,30);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const a=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(a)return a[3]+"-"+a[2].padStart(2,"0")+"-"+a[1].padStart(2,"0");if(/^\d{5}(?:\.0+)?$/.test(s)){const num=Number(s);if(num>=20000&&num<=80000)return new Date(Date.UTC(1899,11,30)+Math.round(num)*86400000).toISOString().slice(0,10);}return "";};
const k=(supplier,reference)=>slug(supplier)+"|"+slug(reference);
const ouestAurayDisplay=row=>{
 if(!isOuestAuray(row.supplier))return row;
 const withRights=row.priceBasis==="PU avec drt HT"&&Number.isFinite(Number(row.priceWithDutiesHT));
 const unit=basicUnit(row.unit);
 const issues=[...(row.issues||[])].filter(issue=>!(
  unit&&["Unité absente ou ambiguë","Contenu du conditionnement à confirmer avant conversion","Contenu du conditionnement à confirmer avant conversion"].includes(issue)
 ));
 if(!withRights&&!issues.includes("PU avec drt non disponible : prix d’achat HT provisoire"))issues.push("PU avec drt non disponible : prix d’achat HT provisoire");
 const label=unit||row.unit;
 return {...row,unit:label,priceBasis:withRights?"PU avec drt HT":"PU avec drt non confirmé",unitPriceScope:["carton","boîte","fût","caisse"].includes(unit)?"conditionnement facturé":"unité de facturation",issues,verified:issues.length===0};
};
const promocashUnit=row=>{
 if(slug(row.supplier)!=="promocash"||basicUnit(row.unit))return row;
 // Règle fournisseur confirmée : PUHT par unité commerciale facturée.
 // Le contenu du lot demeure inconnu et l'observation n'est pas certifiée.
 return {...row,unit:"pièce",originalUnit:row.unit||"",unitInterpretation:"unité commerciale facturée (conditionnement à préciser)",verified:false,
  issues:[...new Set([...(row.issues||[]).filter(x=>x!=="Unité absente ou ambiguë"),"Contenu de l'unité commerciale à confirmer"])]};
};
const isOuestAuray=s=>/^(ouest|auray) boissons?$/.test(slug(s));
const basicUnit=u=>{const a=slug(u);if(["kg","kil","kilogramme","kilogrammes"].includes(a))return "kg";if(["g","gramme","grammes"].includes(a))return "g";if(["l","lt","litre","litres"].includes(a))return "L";if(["cl"].includes(a))return "cl";if(["ml"].includes(a))return "ml";if(["piece","pieces","unite","unites","u","pc","pcs","pce","uni"].includes(a))return "pièce";const packs={fut:"fût","fût":"fût",cai:"caisse",caisse:"caisse",caisses:"caisse",boi:"boîte",bte:"boîte",boite:"boîte",boites:"boîte",car:"carton",ct:"carton",crt:"carton",carton:"carton",cartons:"carton",col:"colis",colis:"colis",btl:"bouteille",bouteille:"bouteille",bouteilles:"bouteille",boc:"bocal",bocal:"bocal",paq:"paquet",paquet:"paquet",sac:"sac",dz:"douzaine",douzaine:"douzaine",bar:"barquette",bq:"barquette",barquette:"barquette",emb:"emballage / consigne",emballage:"emballage / consigne","emballage / consigne":"emballage / consigne",pet:"bouteille PET","bouteille pet":"bouteille PET",lot:"lot",pk:"pack",pack:"pack",fl:"flacon",flacon:"flacon",h:"heure",heure:"heure",forfait:"forfait"};return packs[a]||"";};
function clean(r){
 // Ne supprimer aucune facture parce qu'une référence, une unité ou un prix manque.
 const supplier=norm(r.supplier,160)||"Fournisseur à identifier";
 const description=norm(r.description,250)||"Désignation à vérifier";
 const explicitReference=norm(r.reference,140);
 const reference=explicitReference||"sans-ref:"+slug(description).slice(0,110);
 const d=date(r.date),duties=parseNum(r.priceWithDutiesHT),basic=parseNum(r.priceHT);
 const hasDuties=duties!==null&&duties>=0&&duties<=100000;
 const price=hasDuties?duties:basic,quantity=parseNum(r.quantity),unit=norm(r.unit,50);
 const priceBasis=isOuestAuray(supplier)?(hasDuties?"PU avec drt HT":"PU avec drt non confirmé"):"PUHT";
 const reading=slug(r.reading),status=slug(r.invoiceStatus);
 const issues=[];
 if(!explicitReference)issues.push("Référence absente : regroupement provisoire par désignation");
 if(!norm(r.supplier))issues.push("Fournisseur absent");
 if(!norm(r.description))issues.push("Désignation absente");
 if(!d)issues.push("Date non reconnue");
 if(price===null||price<0||price>100000)issues.push("Prix unitaire non exploitable");
 const recognizedUnit=basicUnit(unit);
 if(isOuestAuray(supplier)&&!hasDuties)issues.push("PU avec drt non disponible : prix d’achat HT provisoire");
 if(!recognizedUnit)issues.push("Unité absente ou ambiguë");
 else if(!["kg","g","L","cl","ml","pièce","heure","forfait"].includes(recognizedUnit)&&!isOuestAuray(supplier))issues.push("Contenu du conditionnement à confirmer avant conversion");
 else if(["carton","boîte","fût","caisse"].includes(recognizedUnit)&&!isOuestAuray(supplier))issues.push("Contenu du conditionnement à confirmer avant conversion");
 if(reading.includes("ocr"))issues.push("Lecture OCR");
 if(!status||!["complete","complet","valide","ok"].includes(status))issues.push("Complétude de facture à contrôler");
 if(quantity===null||quantity<=0)issues.push("Quantité à contrôler");
 return {supplier,reference,description,date:d||"",priceHT:price!==null&&price>=0&&price<=100000?price:null,priceBasis,priceWithDutiesHT:hasDuties?duties:null,basePriceHT:basic,quantity,unit,
  document: norm(r.document,180),invoice: norm(r.invoice,100),source: norm(r.source,240),
  reading:norm(r.reading,30),invoiceStatus:norm(r.invoiceStatus,40),
  issues,verified:issues.length===0};
}
export default async function(req){
 if(!["GET","POST"].includes(req.method))return reply({error:"Méthode interdite"},405);
 let user;try{user=await getUser();}catch(_){}if(!user?.email)return reply({error:"Session requise"},401);
 const allow=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allow.includes(user.email.toLowerCase()))return reply({error:"Accès interdit"},403);
 try{
  const db=database(),url=new URL(req.url),current=await db.get("active",{type:"json",consistency:"strong"});
  if(req.method==="GET"){
   if(url.searchParams.get("mode")==="product"){
    const id=norm(url.searchParams.get("key"),400),meta=current?.products?.[id];
    if(!meta)return reply({key:id,rows:[],meta:null});
    const chunks=(meta.chunks||[]).slice(0,250);
    const loaded=await Promise.all(chunks.map(c=>db.get("runs/"+(meta.chunkRun||current.run)+"/batches/"+c,{type:"json",consistency:"strong"})));
    const rows=loaded.flatMap(a=>Array.isArray(a)?a:[]).filter(x=>k(x.supplier,x.reference)===id).map(promocashUnit).map(ouestAurayDisplay).sort((a,b)=>a.date.localeCompare(b.date));
    return reply({key:id,rows,meta});
   }
   return reply({ready:!!current,run:current?.run||null,importedAt:current?.importedAt||null,
    rowCount:current?.rowCount||0,products:Object.entries(current?.products||{}).map(([key,v])=>({key,...v,chunks:undefined}))});
  }
  const raw=await req.text();if(raw.length>550000)return reply({error:"Lot trop volumineux"},413);
  let body;try{body=JSON.parse(raw);}catch(_){return reply({error:"JSON invalide"},400);}
  if(body?.establishment!=="LOCEAN")return reply({error:"Établissement incorrect"},400);
  const action=norm(body.action,40),run=norm(body.run,80);
  if(action==="begin"){
   if(!/^[a-z0-9-]{12,80}$/i.test(run))return reply({error:"Identifiant invalide"},400);
   if(current&&!body.replace&&body.scope!=="ouest-auray")return reply({error:"Un historique existe déjà. Remplacement explicitement requis."},409);
   const pending=await db.get("pending/"+run,{type:"json",consistency:"strong"});
   if(pending)return reply({error:"Import déjà commencé"},409);
   await db.setJSON("pending/"+run,{run,createdAt:new Date().toISOString(),owner:user.email.toLowerCase(),rowCount:0,products:{},batches:0,scope:body.scope==="ouest-auray"?"ouest-auray":"all",baseRun:current?.run||null});
   return reply({ok:true,run});
  }
  if(!/^[a-z0-9-]{12,80}$/i.test(run))return reply({error:"Import inconnu"},400);
  const pending=await db.get("pending/"+run,{type:"json",consistency:"strong"});
  if(!pending||pending.owner!==user.email.toLowerCase())return reply({error:"Import absent ou non autorisé"},404);
  if(action==="batch"){
   const batch=Number(body.batch);
   if(!Number.isInteger(batch)||batch!==pending.batches||batch<0||batch>500)return reply({error:"Ordre des lots invalide"},409);
   if(!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>250)return reply({error:"Lot invalide (1 à 250 lignes)"},400);
   const rows=body.rows.map(clean);
   if(pending.scope==="ouest-auray"&&rows.some(r=>!isOuestAuray(r.supplier)))return reply({error:"Import ciblé : seules les lignes Ouest et Auray Boissons sont autorisées"},422);
   if(rows.some(x=>!x))return reply({error:"Ligne invalide : fournisseur, référence, date, produit ou prix manquant"},422);
   // Écrire le lot avant le manifeste, pour permettre la reprise sans activation partielle.
   await db.setJSON("runs/"+run+"/batches/"+batch,rows);
   const products=pending.products;
   for(const r of rows){
    const key=k(r.supplier,r.reference);
    if(!products[key])products[key]={supplier:r.supplier,reference:r.reference,description:r.description,
      count:0,first:r.date,last:r.date,issues:0,chunks:[]};
    const p=products[key];p.count++;p.first=r.date<p.first?r.date:p.first;p.last=r.date>p.last?r.date:p.last;
    if(r.issues.length)p.issues++;
    if(p.chunks[p.chunks.length-1]!==batch)p.chunks.push(batch);
   }
   pending.rowCount+=rows.length;pending.batches++;
   await db.setJSON("pending/"+run,pending);
   return reply({ok:true,batches:pending.batches,rowCount:pending.rowCount,productCount:Object.keys(products).length});
  }
  if(action==="publish"){
   if(pending.rowCount<1)return reply({error:"Aucune ligne importée"},409);
   if(Number(body.expectedRows)!==pending.rowCount)return reply({error:"Nombre de lignes différent du contrôle import"},409);
   let snapshot={...pending,importedAt:new Date().toISOString()};
   if(pending.scope==="ouest-auray"&&current){
    if(current.run!==pending.baseRun)return reply({error:"Historique modifié pendant l'import : relance le contrôle"},409);
    const existing=Object.fromEntries(Object.entries(current.products||{}).filter(([,p])=>!isOuestAuray(p.supplier))
      .map(([id,p])=>[id,{...p,chunkRun:p.chunkRun||current.run}]));
    const fresh=Object.fromEntries(Object.entries(pending.products).map(([id,p])=>[id,{...p,chunkRun:run}]));
    snapshot={...snapshot,products:{...existing,...fresh},rowCount:Object.values(existing).reduce((n,p)=>n+(p.count||0),0)+pending.rowCount};
   }
   await db.setJSON("active",snapshot);
   return reply({ok:true,rowCount:snapshot.rowCount,productCount:Object.keys(snapshot.products).length});
  }
  return reply({error:"Action inconnue"},400);
 }catch(err){console.error("purchase history",err);return reply({error:"Erreur de stockage privé"},500);}
}
