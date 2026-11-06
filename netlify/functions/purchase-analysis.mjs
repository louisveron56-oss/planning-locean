/* PRISM — Analyse mensuelle des volumes d'achats et simulation de négociation.
 * Lecture seule des factures privées. Aucun ratio, prix catalogue ou vente modifié.
 * Pagination par lots physiques afin de rester réactif sur les gros historiques.
 */
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const store=()=>getStore({name:"locean-private-purchase-history-v1",consistency:"strong"});
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
const n=v=>{if(v===null||v===undefined||String(v).trim()==="")return null;const x=Number(String(v).replace(/[\s\u00a0\u202f€]/g,"").replace(",","."));return Number.isFinite(x)?x:null;};
const norm=v=>String(v??"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
const canonicalSupplier=s=>{
 const a=norm(s).replace(/[^a-z0-9 ]/g,"").trim();
 if(/^(ouest|auray) boissons?$/.test(a))return "Ouest / Auray Boissons";
 if(/^(red|west) boissons?$/.test(a))return "Red / West Boisson";
 return String(s||"Fournisseur à identifier").trim();
};
const billedUnit=u=>{
 const x=norm(u).replace(/[.\s]/g,"");
 const map={kg:"kg",kil:"kg",kilogramme:"kg",g:"g",gramme:"g",l:"L",lt:"L",litre:"L",cl:"cl",ml:"ml",piece:"pièce",pieces:"pièce",unite:"pièce",unites:"pièce",u:"pièce",pc:"pièce",pcs:"pièce",pce:"pièce",uni:"pièce",car:"carton",ct:"carton",crt:"carton",carton:"carton",boi:"boîte",bte:"boîte",boite:"boîte",fut:"fût",cai:"caisse",caisse:"caisse",btl:"bouteille",bouteille:"bouteille",paq:"paquet",paquet:"paquet",pk:"pack",pack:"pack",col:"colis",colis:"colis",lot:"lot",sac:"sac",dz:"douzaine",boc:"bocal",bar:"barquette"};
 if(!x||["nonprecisee","nonprecise","averifier","inconnue","inconnu"].includes(x))return {unit:"pièce (défaut)",assumed:true};
 return {unit:map[x]||String(u).trim(),assumed:!map[x]};
};
const round=x=>Math.round((x+Number.EPSILON)*10000)/10000;

export default async function(req){
 if(req.method!=="GET")return reply({error:"Méthode interdite"},405);
 let user;try{user=await getUser();}catch(_){}
 if(!user?.email)return reply({error:"Connexion requise"},401);
 const allow=(process.env.SALES_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allow.includes(user.email.toLowerCase()))return reply({error:"Accès interdit"},403);
 try{
  const db=store(),manifest=await db.get("active",{type:"json",consistency:"strong"});
  if(!manifest)return reply({ready:false,entries:[],totalBatches:0,rowCount:0});
  // Les imports ciblés Ouest/Auray conservent les lots des runs précédents.
  const buckets=new Map();
  for(const p of Object.values(manifest.products||{})){
   const run=String(p.chunkRun||manifest.run);
   if(!/^[a-z0-9-]{12,80}$/i.test(run))continue;
   for(const index of p.chunks||[]){
    if(!Number.isSafeInteger(index)||index<0||index>500)continue;
    const id=run+":"+index;
    if(!buckets.has(id))buckets.set(id,{run,index});
   }
  }
  const batches=[...buckets.values()].sort((a,b)=>a.run.localeCompare(b.run)||a.index-b.index);
  const url=new URL(req.url);
  if(url.searchParams.get("mode")==="manifest")return reply({ready:true,rowCount:manifest.rowCount||0,totalBatches:batches.length,importedAt:manifest.importedAt||"",salesConnected:false});
  const offset=Number(url.searchParams.get("offset")||0);
  const limit=Number(url.searchParams.get("limit")||12);
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>24)return reply({error:"Pagination invalide"},400);
  const selected=batches.slice(offset,offset+limit);
  const payloads=await Promise.all(selected.map(b=>db.get("runs/"+b.run+"/batches/"+b.index,{type:"json",consistency:"strong"})));
  const grouped=new Map(),ignored={invalidDate:0,invalidQuantity:0,invalidPrice:0,missingBatch:0};
  payloads.forEach((part,i)=>{
   if(!Array.isArray(part)){ignored.missingBatch++;return;}
   for(const r of part){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(r.date||""))){ignored.invalidDate++;continue;}
    const qty=n(r.quantity),price=n(r.priceHT);
    if(qty===null||qty<=0){ignored.invalidQuantity++;continue;}
    if(price===null||price<0){ignored.invalidPrice++;continue;}
    const unit=billedUnit(r.unit);
    const supplier=canonicalSupplier(r.supplier),reference=String(r.reference||"").trim();
    const year=String(r.date).slice(0,4),month=String(r.date).slice(5,7);
    const key=[norm(supplier),norm(reference),norm(unit.unit),year,month].join("|");
    let agg=grouped.get(key);
    if(!agg){agg={key,supplier,reference,description:String(r.description||"Sans désignation"),unit:unit.unit,unitAssumed:unit.assumed,year:Number(year),month:Number(month),quantity:0,amountHT:0,lines:0,flagged:0,sourceNames:[],dutyMissing:0};grouped.set(key,agg);}
    agg.quantity+=qty;
    agg.amountHT+=qty*price;
    agg.lines++;
    if((r.issues||[]).length||unit.assumed)agg.flagged++;
    if(norm(r.supplier)&&!agg.sourceNames.includes(r.supplier))agg.sourceNames.push(r.supplier);
    if(/^(ouest|auray) boissons?$/.test(norm(r.supplier))&&r.priceBasis!=="PU avec drt HT")agg.dutyMissing++;
   }
  });
  return reply({ready:true,offset,nextOffset:offset+selected.length,done:offset+selected.length>=batches.length,totalBatches:batches.length,rowCount:manifest.rowCount||0,importedAt:manifest.importedAt||"",entries:[...grouped.values()].map(p=>({...p,quantity:round(p.quantity),amountHT:round(p.amountHT)})),ignored,salesConnected:false});
 }catch(e){console.error("Analyse achats",e);return reply({error:"Lecture des factures impossible"},503);}
}
