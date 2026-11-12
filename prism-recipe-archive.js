/* PRISM : archives recettes 2025-2027, lecture seule, sans prix ni rapprochement KSD automatique. */
(function(){
'use strict';
var SOURCES={
 'ETE25':{name:'Livret cuisine été 2025',type:'Canva / ZIP',period:'Été 2025'},
 'ETE26':{name:'Livret cuisine carte été 2026',type:'Canva / ZIP',period:'Été 2026'},
 'HIV25':{name:'Livret cuisine hiver 2025-2026',type:'PDF',period:'Hiver 2025-2026'},
 'HIV26':{name:'Livret cuisine hiver 2026-2027',type:'PDF',period:'Hiver 2026-2027'}
};
var RAW=[
['ETE25','Planche terroir',2,'Entrées'],['ETE25','Soupe de poissons',3,'Entrées'],['ETE25','Burrata pesto fruits rouges',4,'Entrées'],['ETE25','Ceviche de dorade',5,'Entrées'],['ETE25','Foie gras',6,'Entrées'],['ETE25','Assiette gourmande',7,'Entrées'],['ETE25','Terrine de poisson',8,'Entrées'],['ETE25','Rillettes de cochon',9,'Entrées'],['ETE25','Poireaux vinaigrette',10,'Entrées'],['ETE25','Camembert rôti miel noix',11,'Entrées'],['ETE25','Saumon grillé',13,'Plats'],['ETE25','Bar entier',14,'Plats'],['ETE25','Brochette de saint-jacques',15,'Plats'],['ETE25','Choucroute de la mer',16,'Plats'],['ETE25','Salade nordiste',18,'Salades / snack'],['ETE25','Salade grecque',19,'Salades / snack'],['ETE25','Filet mignon',21,'Plats'],['ETE25','Sauce pour tartare de bœuf',22,'Préparations'],['ETE25','Canard à l’orange',23,'Plats'],['ETE25','Carré de cochon',24,'Plats'],['ETE25','Assiette de fromages',26,'Desserts'],['ETE25','Soupe de fruits rouges',27,'Desserts'],['ETE25','Tiramisu revisité',28,'Desserts'],['ETE25','Brioche perdue',29,'Desserts'],['ETE25','Sauces / préparations',31,'Préparations'],['ETE25','Sauces / préparations',32,'Préparations'],['ETE25','Sauces / préparations',33,'Préparations'],
['ETE26','Tenders de poulet',2,'Entrées'],['ETE26','Croque à deux',2,'Salades / snack'],['ETE26','Rillette de poissons',3,'Entrées'],['ETE26','Tapenade d’olives noires',3,'Préparations'],['ETE26','Planche terroir',5,'Entrées'],['ETE26','Œuf en meurette',6,'Entrées'],['ETE26','Burrata crémeuse',7,'Entrées'],['ETE26','Camembert rôti miel noix',8,'Entrées'],['ETE26','Coquille Saint-Jacques à la bretonne',9,'Entrées'],['ETE26','Soupe de poissons',10,'Entrées'],['ETE26','Terrine de campagne',11,'Entrées'],['ETE26','Tartare de bœuf préparé',13,'Plats'],['ETE26','Demi coquelet',14,'Plats'],['ETE26','Andouillette grillée',15,'Plats'],['ETE26','Fish & Chips',16,'Plats'],['ETE26','Risotto crémeux',17,'Plats'],['ETE26','Choucroute de la mer',18,'Plats'],['ETE26','Noix de Saint-Jacques snackées',19,'Plats'],['ETE26','Saint-Pierre',20,'Plats'],['ETE26','Carré de cochon',21,'Plats'],['ETE26','Salade César',23,'Salades / snack'],['ETE26','Salade méditerranéenne',24,'Salades / snack'],['ETE26','Bowl hawaïen',25,'Salades / snack'],['ETE26','Burger Spicy Chicken',26,'Salades / snack'],['ETE26','Brioche perdue',28,'Desserts'],['ETE26','Vacherin déstructuré',29,'Desserts'],['ETE26','Moelleux au chocolat',30,'Desserts'],['ETE26','Tartelette pistache',31,'Desserts'],['ETE26','Mousse au chocolat noir',32,'Desserts'],['ETE26','Assiette de fromages',33,'Desserts'],['ETE26','Sauces / préparations',35,'Préparations'],['ETE26','Sauces / préparations',36,'Préparations'],['ETE26','Sauces / préparations',37,'Préparations'],
['HIV25','Planche terroir',2,'Entrées'],['HIV25','Assiette gourmande',3,'Entrées'],['HIV25','Soufflé oignons caramélisés & fromage',4,'Entrées'],['HIV25','Foie gras',5,'Entrées'],['HIV25','Soupe à l’oignon',6,'Entrées'],['HIV25','Carpaccio de Saint-Jacques',7,'Entrées'],['HIV25','Camembert rôti',8,'Entrées'],['HIV25','Œuf cocotte',9,'Entrées'],['HIV25','Huîtres / bulots / crevettes',11,'Fruits de mer'],['HIV25','Assiette Océan',12,'Fruits de mer'],['HIV25','Poisson du moment',13,'Plats'],['HIV25','Saumon grillé',14,'Plats'],['HIV25','Aile de raie',15,'Plats'],['HIV25','Fricassée de Saint-Jacques',16,'Plats'],['HIV25','Sole meunière',17,'Plats'],['HIV25','Salade veggie',19,'Salades / snack'],['HIV25','Salade périgourdine',20,'Salades / snack'],['HIV25','Salade César',21,'Salades / snack'],['HIV25','Croques',22,'Salades / snack'],['HIV25','Burger Végé',23,'Salades / snack'],['HIV25','Burger classique',24,'Salades / snack'],['HIV25','Burger montagnard',25,'Salades / snack'],['HIV25','Ris de veau aux morilles',27,'Plats'],['HIV25','Bœuf bourguignon',28,'Plats'],['HIV25','Parmentier de canard',29,'Plats'],['HIV25','Saucisse bretonne',30,'Plats'],['HIV25','Tartare de bœuf préparé',31,'Plats'],['HIV25','Assiette de fromage',33,'Desserts'],['HIV25','Mousse au chocolat noir',34,'Desserts'],['HIV25','Paris-Brest façon éclair',35,'Desserts'],['HIV25','Mille-feuille chocolat blanc et pistache',36,'Desserts'],['HIV25','Baba au rhum et chantilly',37,'Desserts'],['HIV25','Riz au lait vanille et caramel',38,'Desserts'],['HIV25','Affogato',39,'Desserts'],
['HIV26','Vol-au-vent à la volaille',1,'Plats'],['HIV26','Poireaux confits',2,'Entrées'],['HIV26','Œuf cocotte',3,'Entrées'],['HIV26','Huîtres',5,'Fruits de mer'],['HIV26','Poisson du moment',6,'Plats'],['HIV26','Lotte rôtie',7,'Plats'],['HIV26','Saumon grillé',8,'Plats'],['HIV26','Aile de raie',9,'Plats'],['HIV26','Salade veggie',11,'Salades / snack'],['HIV26','Salade chèvre chaud',12,'Salades / snack'],['HIV26','Salade rustique',13,'Salades / snack'],['HIV26','Croques',14,'Salades / snack'],['HIV26','Burger Végé',15,'Salades / snack'],['HIV26','Burger BBQ',16,'Salades / snack'],['HIV26','Poire de bœuf',17,'Plats'],['HIV26','Chou farci',18,'Plats'],['HIV26','Os à moelle rôti',19,'Entrées'],['HIV26','Suprême de volaille façon cordon bleu',20,'Plats'],['HIV26','Crumble pommes-poires',21,'Desserts'],['HIV26','Sauce tzatziki',22,'Préparations'],['HIV26','Sauce béarnaise',22,'Préparations']
];
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
var RECIPES=RAW.map(function(r,i){return {id:'prism-livret-'+r[0].toLowerCase()+'-'+r[2]+'-'+i,source:r[0],name:r[1],page:r[2],category:r[3]};});
function node(t,cls,txt){var e=document.createElement(t);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
function boot(){
 var target=document.querySelector('.prism-native-nav [data-page="menu"]');
 if(!target||document.getElementById('module-recipe-archive'))return;
 var nav=node('button','app-nav-item');nav.type='button';nav.dataset.page='recipe-archive';
 nav.innerHTML='<span class="app-nav-icon">▤</span>Bibliothèque de recettes';
 nav.addEventListener('click',function(){window.navigateApp('recipe-archive')});
 target.insertAdjacentElement('afterend',nav);
 var page=node('section','module-page no-print');page.id='module-recipe-archive';page.dataset.module='recipe-archive';
 var shell=node('div','module-shell prism-recipe-archive');
 shell.append(node('div','module-kicker','CARTE & RECETTES'),node('div','module-title','Bibliothèque de recettes'));
 shell.append(node('p','pra-intro','Archives de production 2025–2027. Recettes conservées par saison, indépendamment de la carte du moment. Aucune quantité manquante ou marge n’est estimée.'));
 var control=node('div','pra-controls'),search=node('input','pra-search'),season=node('select','pra-select'),category=node('select','pra-select');
 search.type='search';search.placeholder='Rechercher une recette ou une préparation';
 [['','Toutes les saisons'],...Object.entries(SOURCES).map(function(e){return [e[0],e[1].period]})].forEach(function(a){var opt=node('option','',a[1]);opt.value=a[0];season.append(opt)});
 ['Toutes les familles','Entrées','Fruits de mer','Plats','Salades / snack','Desserts','Préparations'].forEach(function(s,i){var opt=node('option','',s);opt.value=i?s:'';category.append(opt)});
 control.append(search,season,category);shell.append(control);
 var count=node('p','pra-count'),list=node('div','pra-list');shell.append(count,list);
 function render(){
  var q=norm(search.value),a=RECIPES.filter(function(r){return (!season.value||r.source===season.value)&&(!category.value||r.category===category.value)&&(!q||norm(r.name+' '+r.category+' '+SOURCES[r.source].period).includes(q))});
  count.textContent=a.length+' fiches de livret affichées · '+RECIPES.length+' fiches archivées (une fiche par saison et source)';
  list.replaceChildren();
  a.forEach(function(r){
   var card=node('article','pra-card'),header=node('div','pra-card-top'),name=node('strong','pra-name',r.name),tag=node('span','pra-tag',SOURCES[r.source].period);
   header.append(name,tag);card.append(header);
   card.append(node('div','pra-meta',r.category+' · '+SOURCES[r.source].name+' · page '+r.page));
   card.append(node('p','pra-unverified','Coût matière non calculé · correspondance article KSD non vérifiée'));
   list.append(card);
  });
 }
 [search,season,category].forEach(function(x){x.addEventListener('input',render);x.addEventListener('change',render)});
 var info=node('p','pra-help','Cette bibliothèque est une première indexation des livrets. Les recettes complètes, portions, rendements, photos et codes KSD seront rapprochés progressivement après contrôle humain. Les contenus des livrets d’origine ne sont pas écrasés.');
 shell.append(info);page.append(shell);
 var existing=document.getElementById('module-menu');
 if(existing)existing.insertAdjacentElement('afterend',page);else document.body.append(page);
 var css=node('style');css.textContent='.prism-recipe-archive{max-width:1260px!important}.pra-intro{color:#756c62;font-size:13px;margin:10px 0 20px}.pra-controls{display:flex;gap:10px;margin:18px 0;flex-wrap:wrap}.pra-search,.pra-select{border:1px solid #d8d1c7;background:#fff;color:#2c2926;padding:11px 12px;border-radius:9px;font:inherit;font-size:13px}.pra-search{flex:1;min-width:220px}.pra-count{color:#756c62;font-size:12px;margin:10px 0}.pra-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.pra-card{border:1px solid #ded9d2;border-radius:12px;padding:16px;background:#fff;min-width:0}.pra-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.pra-name{color:#292522;font-size:13px}.pra-tag{font-size:10px;border-radius:20px;background:#eee8df;color:#655648;padding:5px 8px;white-space:nowrap}.pra-meta{font-size:11px;margin-top:9px;color:#746f68}.pra-unverified{font-size:11px;color:#90613f;margin:12px 0 0}.pra-help{font-size:11px;color:#746f68;margin-top:20px}@media(max-width:1080px){.pra-list{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.pra-list{grid-template-columns:1fr}.pra-controls{flex-direction:column}.pra-search{min-width:0}}';document.head.append(css);
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();