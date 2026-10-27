/* L'Océan — lecture seule des ventes Google Sheets.
   Ne contient aucune donnée ni identifiant de Google Sheets. */
(function(){
  var loading=false,wasLoaded=false;
  function dateKey(value){
    if(value==null)return null;
    var s=String(value).trim(),m;
    if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))return m[1]+'-'+m[2]+'-'+m[3];
    if((m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/)))return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    if(/^\d{5}$/.test(s))return new Date((Number(s)-25569)*86400000).toISOString().slice(0,10);
    return null;
  }
  var euro=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
  var decimal=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
  function el(tag,cls,txt){var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;}
  function numeric(value){if(typeof value==='number')return Number.isFinite(value)?value:0;var s=String(value==null?'':value).replace(/[\s\u00a0\u202f€]/g,'').replace(',','.');return Number(s)||0;}
  function sum(rows,key){return rows.reduce(function(a,r){return a+numeric(r[key]);},0);}
  function pct(now,prev){return prev?((now-prev)/prev*100):null;}
  function fmtPct(v){return v==null?'—':(v>0?'+':'')+decimal.format(v)+' %';}
  function makeCard(label,value,change){var c=el('div','future-panel');c.appendChild(el('div','fp-label',label));c.appendChild(el('div','fp-value',value));if(change!==undefined)c.appendChild(el('div','fp-sub',change));return c;}
  function render(rows,container){
    var dayMap=new Map();
    rows.forEach(function(r){var k=dateKey(r.date);if(k&&String(r.etablissement||'').toLowerCase().includes('océan'))dayMap.set(k,r);});
    var dates=Array.from(dayMap.keys()).sort();if(!dates.length)throw new Error('Aucune journée valide pour L’Océan.');
    var latest=dates[dates.length-1],end=new Date(latest+'T12:00:00'),start=new Date(end);start.setDate(end.getDate()-6);
    function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
    var current=[],prior=[],days=[];
    for(var i=0;i<7;i++){var day=new Date(start);day.setDate(start.getDate()+i);var key=iso(day),lastYear=new Date(day);lastYear.setDate(day.getDate()-364);var a=dayMap.get(key),b=dayMap.get(iso(lastYear));if(a)current.push(a);if(b)prior.push(b);days.push({key:key,day:day,a:a,b:b});}
    var ca=sum(current,'ca_ttc'),before=sum(prior,'ca_ttc'),covers=sum(current,'couverts'),oldCovers=sum(prior,'couverts');
    var avg=covers?sum(current,'ca_tables')/covers:0;
    if(!avg)avg=covers?current.reduce(function(a,r){return a+(numeric(r.ticket_moyen))*(numeric(r.couverts));},0)/covers:0;
    container.style.display='block';container.style.textAlign='left';
    container.replaceChildren();
    container.appendChild(el('div','module-kicker','DONNÉES DE CAISSE · LECTURE SEULE'));
    container.appendChild(el('h3','module-title','Les 7 derniers jours du fichier'));
    container.appendChild(el('p','module-lead',start.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})+' au '+end.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})+' · '+current.length+'/7 journées avec Z · '+prior.length+'/7 en N-1 (décalage de 52 semaines)'));
    var grid=el('div','future-panel-grid');
    grid.appendChild(makeCard('CA TTC',euro.format(ca),prior.length===current.length?fmtPct(pct(ca,before))+' vs N-1':'Comparaison incomplète'));
    grid.appendChild(makeCard('Couverts',decimal.format(covers),prior.length===current.length?fmtPct(pct(covers,oldCovers))+' vs N-1':'Comparaison incomplète'));
    grid.appendChild(makeCard('Ticket moyen (pondéré)',decimal.format(avg)+' €','Basé sur les tickets moyens journaliers et les couverts'));
    container.appendChild(grid);
    var card=el('div','me-card');card.style.marginTop='14px';card.appendChild(el('h3','','Détail par journée'));
    var wrap=el('div','');wrap.style.overflowX='auto';
    var table=el('table','me-table'),thead=el('thead'),head=el('tr');
    ['Date','CA TTC','Couverts','Ticket moyen','CA N-1'].forEach(function(t){head.appendChild(el('th','',t));});thead.appendChild(head);table.appendChild(thead);
    var body=el('tbody');
    days.forEach(function(x){var tr=el('tr');tr.appendChild(el('td','',x.day.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'})));tr.appendChild(el('td','',x.a?euro.format(numeric(x.a.ca_ttc)):'Z absent'));tr.appendChild(el('td','',x.a?decimal.format(numeric(x.a.couverts)):'—'));tr.appendChild(el('td','',x.a?decimal.format(numeric(x.a.ticket_moyen))+' €':'—'));tr.appendChild(el('td','',x.b?euro.format(numeric(x.b.ca_ttc)):'—'));body.appendChild(tr);});
    table.appendChild(body);wrap.appendChild(table);card.appendChild(wrap);container.appendChild(card);
    container.appendChild(el('p','pointage-footnote','Source : Google Sheets LOCEAN_DATA_API, onglet Jours. Une journée absente est signalée et jamais assimilée à zéro. La comparaison N-1 porte sur les mêmes jours de semaine.'));
  }
  async function loadSalesDashboard(force){
    if(loading||(!force&&wasLoaded))return;
    var page=document.getElementById('module-sales');if(!page)return;
    var container=page.querySelector('.module-placeholder');if(!container)return;
    loading=true;container.replaceChildren(el('p','module-lead','Chargement des ventes sécurisées…'));
    try{
      var user=window.netlifyIdentity&&netlifyIdentity.currentUser();
      if(!user)throw new Error('Connecte-toi à L’Océan pour consulter les ventes.');
      var token=await user.jwt();
      var res=await fetch('/.netlify/functions/sales',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      var data=await res.json().catch(function(){return {};});
      if(!res.ok)throw new Error(data.error||'Erreur serveur '+res.status);
      if(!Array.isArray(data.rows))throw new Error('Format de réponse inattendu');
      render(data.rows,container);wasLoaded=true;
    }catch(e){container.replaceChildren(el('h3','', 'Connexion aux ventes indisponible'),el('p','module-lead',e.message));wasLoaded=false;}
    finally{loading=false;}
  }
  window.loadSalesDashboard=loadSalesDashboard;
  function install(){
    var page=document.getElementById('module-sales');if(!page)return;
    var banner=page.querySelector('.data-source-banner');if(banner){
      var pill=banner.querySelector('.data-source-pill');if(pill)pill.textContent='Lecture sécurisée';
      var btn=el('button','btn btn-outline','↻ Actualiser les ventes');
      btn.type='button';btn.addEventListener('click',function(){loadSalesDashboard(true);});banner.appendChild(btn);
    }
    var observer=new MutationObserver(function(){if(page.classList.contains('open'))loadSalesDashboard(false);});
    observer.observe(page,{attributes:true,attributeFilter:['class']});
    if(page.classList.contains('open'))loadSalesDashboard(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
