/* Prism : exercices fiscaux centralisés, L'Océan 01/10 -> 30/09. */
(function(){"use strict";
const config=Object.freeze({establishment:"L'Océan",startMonth:10});
function fiscalYear(x){const s=String(x||"");if(!/^\d{4}-(0[1-9]|1[0-2])/.test(s))return NaN;return Number(s.slice(0,4))+(Number(s.slice(5,7))>=10?1:0)}
function range(y){y=Number(y);if(!Number.isInteger(y)||y<2000||y>2100)throw Error("Année fiscale invalide");return {start:(y-1)+"-10-01",end:y+"-09-30",title:"Exercice "+y+" · 01/10/"+(y-1)+" – 30/09/"+y}}
function quarter(x){return Math.floor((Number(String(x).slice(5,7))+2)%12/3)+1}
function label(x,mode){const y=fiscalYear(x);return !Number.isFinite(y)?"":mode==="year"?String(y):mode==="quarter"?y+"-T"+quarter(x):String(x).slice(0,7)}
function months(y){return Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(Number(y)-1,9+i,1));return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")})}
window.PrismFiscal=Object.freeze({config,fiscalYear,range,quarter,label,months});
})();