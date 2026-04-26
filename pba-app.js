(function(){
var SB_URL='https://nmsdfuxgsedcfkpgllny.supabase.co/rest/v1';
var SB_KEY='sb_publishable_pT6dL1pvFc4LyhKbstRj4w_bmXM24lL';
var PAGE_SIZE=50;
var allData=[];
var filtered=[];
var currentPage=0;
var sortField='season';
var sortAsc=false;
var longOnly=false;
var pbaFavs=[];
var pbaSlugs={};  // player_name -> pba_slug mapping
var playerStats={}; // aggregated stats per player for tooltips

// Favorites via LocalStorage
function loadFavs(){try{pbaFavs=JSON.parse(localStorage.getItem('pba_favs')||'[]');}catch(e){pbaFavs=[];}}
function loadSlugs(){
  var hdrs={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
  fetch(SB_URL+'/hermie_pba_player_slugs?select=player_name,pba_slug',{headers:hdrs})
  .then(function(r){return r.json();})
  .then(function(data){
    if(Array.isArray(data)){
      for(var i=0;i<data.length;i++){
        pbaSlugs[data[i].player_name]=data[i].pba_slug;
      }
    }
    console.log('Loaded '+Object.keys(pbaSlugs).length+' PBA slugs');
  })
  .catch(function(err){console.log('Slug load error: '+err.message);});
}
// Player Tooltip System
var tooltipEl=null;
var tooltipTimer=null;
function initTooltip(){
  tooltipEl=document.createElement('div');
  tooltipEl.id='pba-tooltip';
  tooltipEl.style.cssText='display:none;position:fixed;z-index:99999;background:#1c2128;border:1px solid rgba(230,126,34,0.4);border-radius:10px;padding:14px 16px;min-width:220px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#e6edf3;pointer-events:none;opacity:0;transition:opacity 0.15s ease';
  document.body.appendChild(tooltipEl);
  // Close on outside click (mobile)
  document.addEventListener('click',function(e){
    if(tooltipEl.style.display==='block'&&!tooltipEl.contains(e.target)&&!e.target.classList.contains('pba-player')){
      hidePlayerTooltip();
    }
  });
}
function buildPlayerStats(){
  playerStats={};
  var catShort={stepladder_finals:'Stepladder',pwba:'PWBA',full_telecast:'Telecast',televised_300:'300 Game',friday_five:'Friday 5',interview:'Interview',nearly_perfect:'Nearly Perf',postgame_show:'Postgame',hall_of_fame:'HOF',qualifying:'Qualifying',player_interview:'Player Int',other:'Sonstige'};
  allData.forEach(function(v){
    if(!v.players||!v.players.length)return;
    v.players.forEach(function(p){
      if(!playerStats[p])playerStats[p]={count:0,cats:{},seasons:{},views:0};
      var s=playerStats[p];
      s.count++;
      var c=v.category||'other';
      if(!s.cats[c])s.cats[c]=0;
      s.cats[c]++;
      var yr=String(v.season);
      if(!s.seasons[yr])s.seasons[yr]=0;
      s.seasons[yr]++;
      s.views+=(v.views||0);
    });
  });
  console.log('Built stats for '+Object.keys(playerStats).length+' players');
}
window.showPlayerTooltip=function(name,el){
  if(tooltipTimer){clearTimeout(tooltipTimer);tooltipTimer=null;}
  var st=playerStats[name];
  if(!st)return;
  var slug=pbaSlugs[name];
  var catNames={stepladder_finals:'Stepladder',pwba:'PWBA',full_telecast:'Komplett',televised_300:'Televised 300',friday_five:'Friday Five',interview:'Interview',nearly_perfect:'Nearly Perfect',postgame_show:'Postgame',hall_of_fame:'Hall of Fame',qualifying:'Qualifying',player_interview:'Spieler-Int',other:'Sonstige'};
  // Build category breakdown
  var catHtml='';
  var sortedCats=Object.keys(st.cats).sort(function(a,b){return st.cats[b]-st.cats[a];});
  for(var i=0;i<sortedCats.length&&i<5;i++){
    var cn=catNames[sortedCats[i]]||sortedCats[i];
    catHtml+='<span style="display:inline-block;background:rgba(230,126,34,0.15);color:#ffa657;padding:1px 6px;border-radius:3px;font-size:0.78em;margin:2px 2px">'+cn+' ('+st.cats[sortedCats[i]]+')</span>';
  }
  // Build seasons
  var seasonKeys=Object.keys(st.seasons).sort(function(a,b){return b-a;});
  var seasonStr=seasonKeys.length>4?seasonKeys.slice(0,4).join(', ')+', ...':seasonKeys.join(', ');
  var html='';
  html+='<div style="font-size:1.1em;font-weight:700;color:#ffa657;margin-bottom:8px">🎳 '+esc(name)+'</div>';
  html+='<div style="margin-bottom:6px">';
  html+='<span style="color:#8b949e;font-size:0.85em">Videos:</span> <strong>'+st.count+'</strong>';
  html+='&nbsp;&nbsp;<span style="color:#8b949e;font-size:0.85em">Aufrufe:</span> <strong>'+fmtNum(st.views)+'</strong>';
  html+='</div>';
  if(catHtml)html+='<div style="margin-bottom:6px">'+catHtml+'</div>';
  html+='<div style="color:#8b949e;font-size:0.82em;margin-bottom:'+(slug?'8':'0')+'px">📅 Saisons: '+seasonStr+'</div>';
  if(slug)html+='<a href="https://www.pba.com/players/'+encodeURIComponent(slug)+'" target="_blank" rel="noopener" style="display:inline-block;background:#e67e22;color:#fff;padding:4px 12px;border-radius:5px;text-decoration:none;font-size:0.85em;font-weight:600;pointer-events:auto" >🔗 PBA-Profil</a>';
  tooltipEl.innerHTML=html;
  tooltipEl.style.display='block';
  // Position near the element
  var rect=el.getBoundingClientRect();
  var tw=tooltipEl.offsetWidth;
  var th=tooltipEl.offsetHeight;
  var left=rect.left+rect.width/2-tw/2;
  var top=rect.bottom+10;
  // Keep in viewport
  if(left<10)left=10;
  if(left+tw>window.innerWidth-10)left=window.innerWidth-tw-10;
  if(top+th>window.innerHeight-10){
    top=rect.top-th-10;
    tooltipEl.style.boxShadow='0 -4px 16px rgba(0,0,0,0.4)';
  }else{
    tooltipEl.style.boxShadow='0 8px 32px rgba(0,0,0,0.5)';
  }
  tooltipEl.style.left=left+'px';
  tooltipEl.style.top=top+'px';
  // Fade in
  setTimeout(function(){tooltipEl.style.opacity='1';},10);
}
window.hidePlayerTooltip=function(){
  tooltipEl.style.opacity='0';
  tooltipTimer=setTimeout(function(){tooltipEl.style.display='none';},150);
}

function saveFavs(){try{localStorage.setItem('pba_favs',JSON.stringify(pbaFavs));}catch(e){}}
window.toggleFav=function(vid){
  var idx=pbaFavs.indexOf(vid);
  if(idx>-1){pbaFavs.splice(idx,1);}else{pbaFavs.push(vid);}
  saveFavs();
  renderPage();
  updateFavFilterCount();
}
function updateFavFilterCount(){
  var opt=document.querySelector('#pba-cat option[value="__favs"]');
  if(opt){
    var cnt=allData.filter(function(v){return pbaFavs.indexOf(v.video_id)>-1;}).length;
    opt.textContent='⭐ Favoriten ('+cnt+')';
  }
}
function isFav(vid){return pbaFavs&&pbaFavs.indexOf(vid)>-1;}

var catLabels={
  stepladder_finals:'Stepladder Finals',
  pwba:'PWBA',
  full_telecast:'Komplett \u00dcbertragung',
  televised_300:'Televised 300',
  friday_five:'Friday Five',
  interview:'Interview',
  nearly_perfect:'Nearly Perfect',
  postgame_show:'Postgame Show',
  hall_of_fame:'Hall of Fame',
  qualifying:'Qualifying',
  player_interview:'Player Interview',
  other:'Sonstige'
};

function esc(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):'';}

function isMobile(){return window.innerWidth<769;}

function fmtNum(n){return n?n.toLocaleString('de-DE'):'--';}

function fmtDate(d){
  if(!d)return'--';
  var p=d.split('-');
  return p[2]+'.'+p[1]+'.'+p[0];
}

function parseDur(d){
  if(!d)return 0;
  var p=d.split(':');
  try{
    if(p.length===3)return parseInt(p[0])*3600+parseInt(p[1])*60+parseInt(p[2]);
    if(p.length===2)return parseInt(p[0])*60+parseInt(p[1]);
  }catch(e){}
  return 0;
}

function durMin(d){var s=parseDur(d);return s?Math.round(s/60):0;}

function fmtPlayers(arr){
  if(!arr||!arr.length)return'<span style="color:#484f58">—</span>';
  var html='';
  for(var i=0;i<arr.length;i++){
    var name=arr[i];
    var slug=pbaSlugs[name];
    var tipAttrs='data-player="'+esc(name)+'" onmouseenter="var _t=this;clearTimeout(this._ht);this._ht=setTimeout(function(){showPlayerTooltip(_t.getAttribute(\'data-player\'),_t)},200)" onmouseleave="clearTimeout(this._ht);hidePlayerTooltip()" onclick="if(window.innerWidth<769){showPlayerTooltip(this.getAttribute(\'data-player\'),this);event.preventDefault();}"';
    if(slug){
      html+='<a href="https://www.pba.com/players/'+encodeURIComponent(slug)+'" target="_blank" rel="noopener" class="pba-player" style="display:inline-block;background:rgba(230,126,34,0.1);color:#e67e22;padding:2px 8px;border:1px solid rgba(230,126,34,0.25);border-radius:4px;font-size:0.80em;margin:2px 4px;white-space:nowrap;line-height:1.4;text-decoration:none;cursor:pointer" title="PBA-Profil: '+esc(name)+'" onmouseover="this.style.background=\'rgba(230,126,34,0.25)\'" onmouseout="this.style.background=\'rgba(230,126,34,0.1)\'" '+tipAttrs+'>'+esc(name)+'</a>';
    }else{
      html+='<span class="pba-player" style="display:inline-block;background:rgba(230,126,34,0.1);color:#e67e22;padding:2px 8px;border:1px solid rgba(230,126,34,0.25);border-radius:4px;font-size:0.80em;margin:2px 4px;white-space:nowrap;line-height:1.4;cursor:help" '+tipAttrs+'>'+esc(name)+'</span>';
    }
  }
  return html;
}

function ytLink(url){
  if(!url)return'—';
  return'<a class="pba-yt" href="'+esc(url)+'" target="_blank" rel="noopener" title="Auf YouTube ansehen">▶</a>';
}

function loadData(){
  var el=document.getElementById('pba-loading');
  el.style.display='block';
  document.getElementById('pba-table').style.display='none';
  var cards=document.getElementById('pba-cards');
  if(cards)cards.style.display='none';

  var hdrs={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
  var offset=0;
  allData=[];

  function fetchPage(){
    fetch(SB_URL+'/hermie_pba_videos?select=video_id,video_title,season,tournament,round,category,date,youtube_url,views,duration,players,tour&limit=1000&offset='+offset+'&order=season.desc,date.desc',{
      headers:hdrs
    }).then(function(r){return r.json();})
    .then(function(batch){
      if(!Array.isArray(batch)||batch.length===0){finishLoad();return;}
      allData=allData.concat(batch);
      if(batch.length<1000){finishLoad();}
      else{offset+=1000;fetchPage();}
    }).catch(function(err){
      el.innerHTML='❌ Fehler: '+esc(err.message);
    });
  }
  fetchPage();
}

function finishLoad(){
  document.getElementById('stat-total').textContent=allData.length.toLocaleString('de-DE');
  var sl=allData.filter(function(v){return v.category==='stepladder_finals'}).length;
  var t3=allData.filter(function(v){return v.category==='televised_300'}).length;
  var f5=allData.filter(function(v){return v.category==='friday_five'}).length;
  document.getElementById('stepladder').textContent=sl.toLocaleString('de-DE');
  document.getElementById('t300').textContent=t3.toLocaleString('de-DE');
  document.getElementById('f5').textContent=f5.toLocaleString('de-DE');
  // PWBA + Interview stats
  var pwbaEl=document.getElementById('pwba-stat');
  var intEl=document.getElementById('int-stat');
  if(pwbaEl){var pwba=allData.filter(function(v){return v.category==='pwba'}).length;pwbaEl.textContent=pwba.toLocaleString('de-DE');}
  if(intEl){var interview=allData.filter(function(v){return v.category==='interview'}).length;intEl.textContent=interview.toLocaleString('de-DE');}

  // Build season dropdown
  var seasons={};
  allData.forEach(function(v){var s=String(v.season);if(!seasons[s])seasons[s]=0;seasons[s]++;});
  var sel=document.getElementById('pba-season');
  var keys=Object.keys(seasons).sort(function(a,b){return b-a;});
  keys.forEach(function(s){
    var opt=document.createElement('option');
    opt.value=s;
    opt.textContent=s+' ('+seasons[s]+')';
    sel.appendChild(opt);
  });

  // Build player dropdown
  var playerCounts={};
  allData.forEach(function(v){
    if(v.players&&v.players.length){
      v.players.forEach(function(p){
        if(!playerCounts[p])playerCounts[p]=0;
        playerCounts[p]++;
      });
    }
  });
  var playerSel=document.getElementById('pba-player');
  var sorted=Object.keys(playerCounts).sort(function(a,b){return playerCounts[b]-playerCounts[a];});
  sorted.slice(0,100).forEach(function(p){
    var opt=document.createElement('option');
    opt.value=p;
    opt.textContent=p+' ('+playerCounts[p]+')';
    playerSel.appendChild(opt);
  });

  // Build category dropdown with favorites
  var catSel=document.getElementById('pba-cat');
  var catLabels={'stepladder_finals':'🏆 Stepladder Finals','pwba':'👩‍🎤 PWBA','full_telecast':'📺 Komplett Übertragung','televised_300':'🎯 Televised 300','friday_five':'📅 Friday Five','interview':'🎤 Interview','nearly_perfect':'⚡ Nearly Perfect','postgame_show':'🎙️ Postgame Show','hall_of_fame':'🏅 Hall of Fame','qualifying':'📊 Qualifying','player_interview':'🎤 Spieler-Interview','other':'📎 Sonstige'};
  var catCounts={};
  allData.forEach(function(v){var c=v.category||'other';if(!catCounts[c])catCounts[c]=0;catCounts[c]++;});
  var catOrder=['stepladder_finals','pwba','full_telecast','televised_300','friday_five','interview','nearly_perfect','postgame_show','hall_of_fame','qualifying','player_interview','other'];
  // Remove existing options except "Alle"
  while(catSel.options.length>1)catSel.remove(1);
  catOrder.forEach(function(c){
    if(!catCounts[c])return;
    var opt=document.createElement('option');
    opt.value=c;
    opt.textContent=(catLabels[c]||c)+' ('+catCounts[c]+')';
    catSel.appendChild(opt);
  });
  // Add favorites option
  var favInit=document.createElement('option');
  favInit.value='__favs';
  var favInitCount=allData.filter(function(v){return pbaFavs.indexOf(v.video_id)>-1;}).length;
  favInit.textContent='\u2b50 Favoriten ('+favInitCount+')';
  if(favInitCount>0)favInit.style.fontWeight='bold';
  catSel.appendChild(favInit);

  document.getElementById('pba-loading').style.display='none';
  buildPlayerStats();
  applyFilters();
}

function applyFilters(){
  var search=document.getElementById('pba-search').value.toLowerCase().trim();
  var season=document.getElementById('pba-season').value;
  var cat=document.getElementById('pba-cat').value;
  var player=document.getElementById('pba-player').value;

  filtered=allData.filter(function(v){
    if(season&&String(v.season)!==season)return false;
    if(cat==='__favs'){if(pbaFavs.indexOf(v.video_id)===-1)return false;}
    else if(cat&&v.category!==cat)return false;
    if(longOnly&&durMin(v.duration)<10)return false;
    if(player){
      if(!v.players||v.players.indexOf(player)===-1)return false;
    }
    if(search){
      var txt=(v.video_title||'').toLowerCase()+' '+(v.tournament||'').toLowerCase()+' '+(v.players?v.players.join(' '):'').toLowerCase()+' '+String(v.season);
      if(txt.indexOf(search)===-1)return false;
    }
    return true;
  });

  // Sort
  filtered.sort(function(a,b){
    var va,vb;
    if(sortField==='season'){va=a.season;vb=b.season;}
    else if(sortField==='views'){va=a.views||0;vb=b.views||0;}
    else if(sortField==='duration'){va=parseDur(a.duration);vb=parseDur(b.duration);}
    else if(sortField==='date'){va=a.date||'';vb=b.date||'';}
    else{va=(a[sortField]||'').toLowerCase();vb=(b[sortField]||'').toLowerCase();}
    if(sortField==='season'||sortField==='views'||sortField==='duration'){
      return sortAsc?(va-vb):(vb-va);
    }
    return sortAsc?va.localeCompare(vb):vb.localeCompare(va);
  });

  // Update sort indicators
  document.querySelectorAll('.pba-table th[data-sort]').forEach(function(th){
    var f=th.getAttribute('data-sort');
    th.classList.toggle('sort-active',f===sortField);
    var arrow=th.querySelector('.sort-arrow');
    if(arrow){
      if(f===sortField)arrow.textContent=sortAsc?'↑':'↓';
      else arrow.textContent='↕';
    }
  });

  currentPage=0;
  renderPage();
}

function renderPage(){
  var mobile=isMobile();
  var tbody=document.getElementById('pba-tbody');
  var cardsEl=document.getElementById('pba-cards');
  var countEl=document.getElementById('pba-count');
  var tableEl=document.getElementById('pba-table');

  countEl.textContent=filtered.length.toLocaleString('de-DE')+' Videos'+(filtered.length!==allData.length?' (gefiltert aus '+allData.length.toLocaleString('de-DE')+')':'');

  if(filtered.length===0){
    tbody.innerHTML='<tr><td colspan="8" class="pba-empty">Keine Videos gefunden</td></tr>';
    tableEl.style.display='';
    if(cardsEl)cardsEl.style.display='none';
    document.getElementById('pba-paging').style.display='none';
    return;
  }

  var start=currentPage*PAGE_SIZE;
  var end=Math.min(start+PAGE_SIZE,filtered.length);
  var page=filtered.slice(start,end);

  if(mobile){
    tableEl.style.display='none';
    if(!cardsEl){
      cardsEl=document.createElement('div');
      cardsEl.id='pba-cards';
      cardsEl.className='pba-cards';
      tableEl.parentNode.parentNode.insertBefore(cardsEl,tableEl.parentNode.nextSibling);
    }
    cardsEl.style.display='';
    var cardHtml='';
    for(var i=0;i<page.length;i++){
      var v=page[i];
      var badge='<span class="pba-badge '+(v.category||'other')+'">'+(catLabels[v.category]||v.category||'--')+'</span>';
      var players=v.players&&v.players.length?fmtPlayers(v.players):'';
      cardHtml+='<div class="pba-card">';
      cardHtml+='<div class="pba-card-title">'+esc(v.video_title||'--')+' <span data-vid="'+esc(v.video_id||'')+'" onclick="toggleFav(\''+esc(v.video_id||'')+'\')" style="cursor:pointer;font-size:0.9em">'+(isFav(v.video_id)?'\u2605':'\u2606')+'</span></div>';
      cardHtml+='<div class="pba-card-meta">';
      cardHtml+='<span class="season">'+(v.season||'--')+'</span>';
      cardHtml+=badge;
      cardHtml+='</div>';
      if(players)cardHtml+='<div class="pba-card-players">'+players+'</div>';
      cardHtml+='<div class="pba-card-bottom">';
      cardHtml+='<span>⏱ '+(v.duration||'--')+'</span>';
      cardHtml+='<span>👁 '+fmtNum(v.views)+'</span>';
      cardHtml+='<span>'+fmtDate(v.date)+'</span>';
      cardHtml+='<span>'+ytLink(v.youtube_url)+'</span>';
      cardHtml+='</div></div>';
    }
    cardsEl.innerHTML=cardHtml;
  }else{
    tableEl.style.display='';
    if(cardsEl)cardsEl.style.display='none';
    var html='';
    for(var i=0;i<page.length;i++){
      var v=page[i];
      var badge='<span class="pba-badge '+(v.category||'other')+'">'+(catLabels[v.category]||v.category||'--')+'</span>';
      var playersHtml=fmtPlayers(v.players);
      html+='<tr>';
      html+='<td class="col-season">'+(v.season||'--')+'</td>';
      html+='<td class="col-title" title="'+esc(v.video_title||'')+'">'+esc(v.video_title||'--')+'</td>';
      html+='<td class="col-cat">'+badge+'</td>';
      html+='<td class="col-players">'+playersHtml+'</td>';
      html+='<td class="col-views">'+fmtNum(v.views)+'</td>';
      html+='<td class="col-dur">'+(v.duration||'--')+'</td>';
      html+='<td class="col-date">'+fmtDate(v.date)+'</td>';
      html+='<td class="col-yt">'+ytLink(v.youtube_url)+'</td>';
      html+='<td class="col-fav"><span data-vid="'+esc(v.video_id||'')+'" onclick="toggleFav(\''+esc(v.video_id||'')+'\')" style="cursor:pointer;font-size:1.2em">'+(isFav(v.video_id)?'\u2605':'\u2606')+'</span></td>';
      html+='</tr>';
    }
    tbody.innerHTML=html;
  }

  // Pagination
  var totalPages=Math.ceil(filtered.length/PAGE_SIZE);
  var pagingEl=document.getElementById('pba-paging');
  if(totalPages>1){
    pagingEl.style.display='flex';
    document.getElementById('pba-prev').disabled=(currentPage===0);
    document.getElementById('pba-next').disabled=(currentPage>=totalPages-1);
    document.getElementById('pba-page-info').textContent='Seite '+(currentPage+1)+' / '+totalPages+' ('+filtered.length.toLocaleString('de-DE')+' Videos)';
  }else{
    pagingEl.style.display='none';
  }
}

// Cascading dropdown update
function updateDropdowns(changedFilter){
  var curSeason=document.getElementById('pba-season').value;
  var curCat=document.getElementById('pba-cat').value;
  var curPlayer=document.getElementById('pba-player').value;

  // Build base data: apply ALL current filters (including the one that just changed)
  var base=allData.filter(function(v){
    if(curSeason&&String(v.season)!==curSeason)return false;
    if(curCat==='__favs'){if(pbaFavs.indexOf(v.video_id)===-1)return false;}
    else if(curCat&&v.category!==curCat)return false;
    if(curPlayer){
      if(!v.players||v.players.indexOf(curPlayer)===-1)return false;
    }
    return true;
  });

  // Update seasons dropdown (if player or cat changed)
  if(changedFilter!=='season'){
    var seasons={};
    base.forEach(function(v){var s=String(v.season);if(!seasons[s])seasons[s]=0;seasons[s]++;});
    var sel=document.getElementById('pba-season');
    var prevSeason=sel.value;
    while(sel.options.length>1)sel.remove(1);
    Object.keys(seasons).sort(function(a,b){return b-a;}).forEach(function(s){
      var opt=document.createElement('option');
      opt.value=s;
      opt.textContent=s+' ('+seasons[s]+')';
      sel.appendChild(opt);
    });
    sel.value=prevSeason;
    // If previous selection no longer valid, reset
    if(prevSeason&&!seasons[prevSeason])sel.value='';
  }

  // Update categories dropdown (if season or player changed)
  if(changedFilter!=='cat'){
    var cats={};
    base.forEach(function(v){var c=v.category||'other';if(!cats[c])cats[c]=0;cats[c]++;});
    // Also add fav count if any
    var favCnt=allData.filter(function(v){return pbaFavs.indexOf(v.video_id)>-1;}).length;
    var catSel=document.getElementById('pba-cat');
    var prevCat=catSel.value;
    // Remove options except "Alle"
    while(catSel.options.length>1)catSel.remove(1);
    // Rebuild in catLabels order
    var catOrder=['stepladder_finals','pwba','full_telecast','televised_300','friday_five','interview','nearly_perfect','postgame_show','hall_of_fame','qualifying','player_interview','other'];
    catOrder.forEach(function(c){
      if(!cats[c])return;
      var opt=document.createElement('option');
      opt.value=c;
      opt.textContent=(catLabels[c]||c)+' ('+cats[c]+')';
      catSel.appendChild(opt);
    });
    // Add favorites filter option
    var favOpt=document.createElement('option');
    favOpt.value='__favs';
    var favTotal=allData.filter(function(v){return pbaFavs.indexOf(v.video_id)>-1;}).length;
    favOpt.textContent='\u2b50 Favoriten ('+favTotal+')';
    if(favTotal>0)favOpt.style.fontWeight='bold';
    catSel.appendChild(favOpt);
    catSel.value=prevCat;
    if(prevCat&&!cats[prevCat]&&prevCat!=='__favs')catSel.value='';
  }

  // Update players dropdown (if season or cat changed)
  if(changedFilter!=='player'){
    var playerCounts={};
    base.forEach(function(v){
      if(v.players&&v.players.length){
        v.players.forEach(function(p){
          if(!playerCounts[p])playerCounts[p]=0;
          playerCounts[p]++;
        });
      }
    });
    var playerSel=document.getElementById('pba-player');
    var prevPlayer=playerSel.value;
    while(playerSel.options.length>1)playerSel.remove(1);
    var sorted=Object.keys(playerCounts).sort(function(a,b){return playerCounts[b]-playerCounts[a];});
    sorted.slice(0,100).forEach(function(p){
      var opt=document.createElement('option');
      opt.value=p;
      opt.textContent=p+' ('+playerCounts[p]+')';
      playerSel.appendChild(opt);
    });
    playerSel.value=prevPlayer;
    if(prevPlayer&&!playerCounts[prevPlayer])playerSel.value='';
  }

  applyFilters();
}

// Event listeners
var resizeTimer;
window.addEventListener('resize',function(){
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(function(){renderPage();},200);
});

document.getElementById('pba-search').addEventListener('input',applyFilters);
document.getElementById('pba-season').addEventListener('change',function(){updateDropdowns('season');});
document.getElementById('pba-cat').addEventListener('change',function(){updateDropdowns('cat');});
document.getElementById('pba-player').addEventListener('change',function(){updateDropdowns('player');});
document.getElementById('pba-longonly').addEventListener('click',function(){
  longOnly=!longOnly;
  this.classList.toggle('active');
  applyFilters();
});

document.getElementById('pba-reset').addEventListener('click',function(){
  document.getElementById('pba-search').value='';
  document.getElementById('pba-season').value='';
  document.getElementById('pba-cat').value='';
  document.getElementById('pba-player').value='';
  longOnly=false;
  var loBtn=document.getElementById('pba-longonly');
  if(loBtn)loBtn.classList.remove('active');
  // Reset dropdowns to full options
  updateDropdowns('reset');
});

document.getElementById('pba-prev').addEventListener('click',function(){
  if(currentPage>0){currentPage--;renderPage();}
});
document.getElementById('pba-next').addEventListener('click',function(){
  var totalPages=Math.ceil(filtered.length/PAGE_SIZE);
  if(currentPage<totalPages-1){currentPage++;renderPage();}
});

document.querySelectorAll('.pba-table th[data-sort]').forEach(function(th){
  th.addEventListener('click',function(){
    var field=this.getAttribute('data-sort');
    if(sortField===field){sortAsc=!sortAsc;}
    else{sortField=field;sortAsc=false;}
    applyFilters();
  });
});

// Start
loadFavs();
loadSlugs();
initTooltip();
loadData();
})();