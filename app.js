
const D = window.ALLIANCE_DATA;
const app = document.getElementById("app");
const fmt = n => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
const avg = n => Number(n || 0).toLocaleString("en-US",{maximumFractionDigits:1});
const esc = s => String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function sortValue(text,type){
  const t=String(text ?? "").trim();
  if(type === "number") { const n=parseFloat(t.replace(/[^0-9.\-]/g,"")); return Number.isNaN(n) ? -Infinity : n; }
  return t.toLocaleLowerCase();
}
function sortTable(tableId,col,type){
  const table=document.getElementById(tableId); if(!table) return;
  const tbody=table.tBodies[0]; if(!tbody) return;
  const rows=Array.from(tbody.rows);
  const current=table.dataset.sortCol;
  const direction=(current===String(col) && table.dataset.sortDir==="asc") ? "desc" : "asc";
  rows.sort((a,b)=>{
    const av=sortValue(a.cells[col]?.dataset.value ?? a.cells[col]?.textContent,type);
    const bv=sortValue(b.cells[col]?.dataset.value ?? b.cells[col]?.textContent,type);
    if(av<bv) return direction==="asc"?-1:1;
    if(av>bv) return direction==="asc"?1:-1;
    return 0;
  });
  rows.forEach(r=>tbody.appendChild(r));
  table.dataset.sortCol=col; table.dataset.sortDir=direction;
  table.querySelectorAll("th.sortable").forEach(th=>th.classList.remove("sort-asc","sort-desc"));
  const active=table.querySelector(`th.sortable[data-col="${col}"]`);
  if(active) active.classList.add(direction==="asc"?"sort-asc":"sort-desc");
}
function sortHead(label,table,col,type="text"){
 const alignRight=type==="number" && label!=="#" && !(label==="Rank" && table==="eventPlayersTable");
 const sortIcon='<span class="sort-icon" aria-hidden="true">↕</span>';
 return `<th class="sortable${alignRight?' num':''}" data-table="${table}" data-col="${col}" data-type="${type}"><button type="button">${alignRight?sortIcon+label:label+sortIcon}</button></th>`;
}


function rankClass(r){r=Number(r);return r===1?'rank1':r>=2&&r<=3?'rank3':r>=4&&r<=5?'rank5':r>=6&&r<=10?'rank10':''}
function rankPill(r){return `<span class="rank-pill ${rankClass(r)}">${esc(r)}</span>`}
let playerSort={col:0,dir:'asc'};
function sortedPlayers(query=''){
 const q=query.trim().toLowerCase();
 const list=D.players.map((p,i)=>({...p,originalPosition:i+1})).filter(p=>!q||p.currentName.toLowerCase().includes(q)||p.names.some(n=>n.toLowerCase().includes(q)));
 const get=[p=>p.originalPosition,p=>p.currentName.toLowerCase(),p=>Number(p.totalPoints),p=>Number(p.eventsParticipated),p=>Number(p.averagePoints),p=>Number(p.averagePPQ),p=>p.bestRank==null?Infinity:Number(p.bestRank)][playerSort.col];
 return list.sort((a,b)=>((get(a)<get(b)?-1:get(a)>get(b)?1:0)*(playerSort.dir==='asc'?1:-1))||a.originalPosition-b.originalPosition);
}
function playerTableRow(p){return `<tr class="clickable" onclick="location.hash='player/${encodeURIComponent(p.id)}'"><td data-value="${p.originalPosition}">${rankPill(p.originalPosition)}</td><td><button class="player-link">${esc(p.currentName)}</button></td><td class="num">${fmt(p.totalPoints)}</td><td class="num">${p.eventsParticipated}</td><td class="num">${fmt(p.averagePoints)}</td><td class="num">${avg(p.averagePPQ)}</td><td class="num">${p.bestRank??'—'}</td></tr>`;}
function playerPagination(page,pages){return Array.from({length:pages},(_,i)=>`<button class="${i===page?'active':''}" onclick="sessionStorage.setItem('playerPage',${i});filterPlayersLive(document.getElementById('playerFilter').value)">${i+1}</button>`).join('')}
function updatePlayerSortHeaders(){document.querySelectorAll('#playersTable th.sortable').forEach(th=>{th.classList.remove('sort-asc','sort-desc');if(Number(th.dataset.col)===playerSort.col)th.classList.add(playerSort.dir==='asc'?'sort-asc':'sort-desc')})}
function sortPlayers(col){playerSort.dir=playerSort.col===col&&playerSort.dir==='asc'?'desc':'asc';playerSort.col=col;sessionStorage.setItem('playerPage','0');filterPlayersLive(document.getElementById('playerFilter')?.value||'')}

function nav(view){ document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view)); }
function playerById(id){return D.players.find(p=>p.id===decodeURIComponent(id));}
function eventById(id){return D.events.find(e=>e.id===id);}
function playerRows(p){return p.events.map(x=>`<tr><td>${esc(x.event)}</td><td class="num" data-value="${x.rank}">${rankPill(x.rank)}</td><td class="num">${fmt(x.points)}</td><td class="num">${x.started}</td><td class="num">${x.completed}</td><td class="num">${avg(x.ppq)}</td></tr>`).join("")}

function allianceChart(){
 const values=D.events.map(e=>Number(e.alliancePoints)||0); if(!values.length) return '<div class="empty">No event data</div>';
 const w=620,h=180,pad=24,min=Math.min(...values),max=Math.max(...values),range=max-min||1;
 const pts=values.map((v,i)=>`${pad+i*(w-2*pad)/Math.max(1,values.length-1)},${h-pad-(v-min)/range*(h-2*pad)}`).join(' ');
 const last=values[values.length-1];
 return `<div class="chart-summary"><strong>${fmt(last)}</strong><span class="muted">latest alliance points</span></div><svg class="line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Alliance points by event"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e5b94f" stop-opacity=".28"/><stop offset="1" stop-color="#e5b94f" stop-opacity="0"/></linearGradient></defs><polygon points="${pad},${h-pad} ${pts} ${w-pad},${h-pad}" fill="url(#chartFill)"/><polyline points="${pts}" fill="none" stroke="#e5b94f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${values.map((v,i)=>{const x=pad+i*(w-2*pad)/Math.max(1,values.length-1),y=h-pad-(v-min)/range*(h-2*pad);return `<circle cx="${x}" cy="${y}" r="4" fill="#e5b94f"><title>${esc(D.events[i].name)}: ${fmt(v)}</title></circle>`}).join('')}</svg><div class="chart-labels"><span>${esc(D.events[0].name)}</span><span>${esc(D.events[D.events.length-1].name)}</span></div>`;
}

function dashboard(){
 nav("dashboard");
 const totalPoints=D.events.reduce((s,e)=>s+e.alliancePoints,0);
 const latest=D.events[D.events.length-1];
 const top=D.players.slice(0,25);
 const bestEvent=D.events.reduce((best,e)=>!best || e.alliancePoints>best.alliancePoints?e:best,null);
 const history=D.events.slice(-5).reverse();
 // Leaderboards require participation in at least three events (events with > 0 points).
 const eligibleLeaders=D.players.filter(p=>Number(p.eventsParticipated)>=3);
 const mostPoints=eligibleLeaders.slice().sort((a,b)=>b.totalPoints-a.totalPoints)[0];
 const bestRank=eligibleLeaders.filter(p=>Number(p.averageRank)>0).sort((a,b)=>a.averageRank-b.averageRank)[0];
 const bestPPQ=eligibleLeaders.filter(p=>p.questsCompleted>0).sort((a,b)=>b.averagePPQ-a.averagePPQ)[0];
 const leaderCard=(label,p,value,note,icon)=>`<div class="card leader-card" ${p?`onclick="location.hash='player/${encodeURIComponent(p.id)}'"`:''}><span class="leader-icon">${icon}</span><div class="leader-label">${label}</div><strong class="leader-name">${p?esc(p.currentName):'—'}</strong><div class="leader-value">${p?value:'—'}</div><span class="kpi-note">${note}</span></div>`;
 app.innerHTML=`
 <section class="hero"><div><div class="eyebrow">Rise of Kingdoms · Kingdom 3662</div><h1>Alliance Mobilization</h1><p class="sub">${D.events.length} recorded events · latest: ${esc(latest.name)}</p></div>
 <div class="badge good">Data through ${esc(D.updatedFromWorkbook)}</div></section>
 <section class="grid kpis">
   <div class="card"><div class="kpi-label">Events</div><div class="kpi-value">${D.events.length}</div><div class="kpi-note">recorded in the dataset</div></div>
   <div class="card"><div class="kpi-label">Players</div><div class="kpi-value">${D.players.length}</div><div class="kpi-note">unique identities</div></div>
   <div class="card"><div class="kpi-label">Latest alliance points</div><div class="kpi-value">${fmt(latest.alliancePoints)}</div><div class="kpi-note">Rank ${esc(latest.allianceRank)}</div></div>
   <div class="card"><div class="kpi-label">All event points</div><div class="kpi-value">${fmt(totalPoints)}</div><div class="kpi-note">sum of alliance totals</div></div>
   <div class="card accent-kpi"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(D.averagePPQ)}</div><div class="kpi-note">average across recorded events</div></div>
 </section>
 <section class="leader-section"><div class="section-heading"><h2>Player leaders</h2><span class="muted">minimum 3 events participated</span></div><div class="grid leader-grid">
 ${leaderCard('Most total points',mostPoints,fmt(mostPoints?.totalPoints),'combined points','💰')}
 ${leaderCard('Best average ranking',bestRank,avg(bestRank?.averageRank),'average event placement · lower is better','📊')}
 ${leaderCard('Highest average points / quest',bestPPQ,avg(bestPPQ?.averagePPQ),'average of event-level points / quest','🚀')}
 </div></section>
 <section class="grid dashboard-main">
   <div class="card table-card"><div class="table-head"><h2>Top 25 players · total points</h2><span class="muted">all recorded events</span></div>
    <div class="table-scroll"><table id="dashboardTopTable"><thead><tr>${sortHead("#","dashboardTopTable",0,"number")}${sortHead("Governor","dashboardTopTable",1)}${sortHead("Points","dashboardTopTable",2,"number")}${sortHead("Events","dashboardTopTable",3,"number")}${sortHead("Avg/event","dashboardTopTable",4,"number")}${sortHead("Ø Pts/Quest","dashboardTopTable",5,"number")}</tr></thead><tbody>
    ${top.map((p,i)=>`<tr class="clickable" onclick="location.hash='player/${encodeURIComponent(p.id)}'"><td class="rank" data-value="${i+1}">${rankPill(i+1)}</td><td><button class="player-link">${esc(p.currentName)}</button></td><td class="num">${fmt(p.totalPoints)}</td><td class="num">${p.eventsParticipated}</td><td class="num">${fmt(p.averagePoints)}</td><td class="num">${avg(p.averagePPQ)}</td></tr>`).join("")}
    </tbody></table></div>
   </div>
   <div class="dashboard-side">
    <div class="card chart-card"><div class="table-head compact"><h2>Alliance performance</h2><span class="muted">points by event</span></div>${allianceChart()}</div>
    <div class="card"><div class="table-head compact"><h2>Event history</h2><span class="muted">last 5 events</span></div><div class="event-list" style="grid-template-columns:1fr">
    ${!history.some(e=>e.id===bestEvent?.id)?`<div class="event-card best-event record-card" onclick="location.hash='event/${bestEvent.id}'"><div class="event-title"><strong>Kingdom points record</strong><span class="badge gold-badge">All-time best</span></div><div class="event-stat"><span class="muted">${esc(bestEvent.name)}</span><b>${fmt(bestEvent.alliancePoints)}</b></div><div class="event-meta"><span>Top player: <strong>${esc(bestEvent.topPlayer||'—')}</strong></span></div></div>`:''}
    ${history.map(e=>`<div class="event-card ${e.id===bestEvent?.id?'best-event':''}" onclick="location.hash='event/${e.id}'"><div class="event-title"><strong>${esc(e.name)}</strong><span class="badge ${e.id===bestEvent?.id?'gold-badge':''}">${e.id===bestEvent?.id?'All-time best':'#'+esc(e.allianceRank)}</span></div><div class="event-stat"><span class="muted">Alliance points</span><b>${fmt(e.alliancePoints)}</b></div><div class="event-meta"><span>Top player: <strong>${esc(e.topPlayer||'—')}</strong></span></div><div class="event-meta"><span>${esc(e.start)} · Reward: ${esc(e.reward||'—')}</span></div></div>`).join("")}
    </div></div>
   </div>
 </section>`;
}

function eventsView(){
 nav("events");
 const bestEvent=D.events.reduce((best,e)=>!best || Number(e.alliancePoints)>Number(best.alliancePoints)?e:best,null);
 app.innerHTML=`<section class="hero back-first"><button class="back" onclick="goBack('dashboard')">← Back</button><div><div class="eyebrow">History</div><h1>Events</h1><p class="sub">Every recorded Alliance Mobilization result.</p></div></section>
 <section class="card chart-card event-overview-chart"><div class="table-head compact"><h2>Alliance performance</h2><span class="muted">points by event</span></div>${allianceChart()}</section>
 <section class="event-list">${D.events.slice().reverse().map(e=>`
 <article class="card event-card ${e.id===bestEvent?.id?'best-event':''}" onclick="location.hash='event/${e.id}'">
   <div class="event-title"><strong>${esc(e.name)}</strong><span class="badge ${e.id===bestEvent?.id?'gold-badge':''}">${e.id===bestEvent?.id?'All-time best':'Alliance #'+esc(e.allianceRank)}</span></div>
   <div class="event-stat"><span class="muted">Alliance points</span><b>${fmt(e.alliancePoints)}</b></div>
   <div class="event-meta"><span>${esc(e.start)} → ${esc(e.end)}</span><span>Minimum requirement: ${fmt(e.minimumPoints)}</span><span>Levels completed: ${e.level ?? "—"}</span></div>
   <div class="event-top-player"><span class="muted">Top scorer</span><strong>${esc(e.topPlayer||"—")}</strong><span>${fmt(e.topPlayerPoints)} pts</span></div>
 </article>`).join("")}</section>`;
}

function playersView(query=''){
 nav('players');
 const list=sortedPlayers(query),size=25,pages=Math.max(1,Math.ceil(list.length/size));
 const page=Math.min(Math.max(0,Number(sessionStorage.getItem('playerPage')||0)),pages-1);
 app.innerHTML=`<section class="hero back-first"><button class="back" onclick="goBack('dashboard')">← Back</button><div><div class="eyebrow">Player index</div><h1>Players</h1><p class="sub" id="playersCount">${list.length} matching unique identities</p></div></section>
 <section class="card table-card"><div class="table-head"><h2>All governors</h2><span class="muted">click a player for the full profile</span></div>
 <div class="filter-row player-filter-row"><input id="playerFilter" value="${esc(query)}" placeholder="Filter players…" oninput="sessionStorage.setItem('playerPage','0');filterPlayersLive(this.value)"></div>
 <div class="table-scroll"><table id="playersTable"><thead><tr>${sortHead('#','playersTable',0,'number')}${sortHead('Governor','playersTable',1)}${sortHead('Total','playersTable',2,'number')}${sortHead('Events','playersTable',3,'number')}${sortHead('Avg/event','playersTable',4,'number')}${sortHead('Ø Pts/Quest','playersTable',5,'number')}${sortHead('Best rank','playersTable',6,'number')}</tr></thead><tbody id="playersTbody">${list.slice(page*size,(page+1)*size).map(playerTableRow).join('')}</tbody></table></div><div class="pagination" id="playersPagination">${playerPagination(page,pages)}</div></section>`;
 updatePlayerSortHeaders();
}
function filterPlayersLive(query=''){
 const list=sortedPlayers(query),size=25,pages=Math.max(1,Math.ceil(list.length/size));
 const page=Math.min(Math.max(0,Number(sessionStorage.getItem('playerPage')||0)),pages-1);
 const tbody=document.getElementById('playersTbody'),pagination=document.getElementById('playersPagination'),count=document.getElementById('playersCount');
 if(tbody)tbody.innerHTML=list.slice(page*size,(page+1)*size).map(playerTableRow).join('');
 if(pagination)pagination.innerHTML=playerPagination(page,pages);
 if(count)count.textContent=`${list.length} matching unique identities`;
 updatePlayerSortHeaders();
}

function playerView(id){
 const p=playerById(id); if(!p){dashboard();return}
 nav("");
 const max=Math.max(...p.events.map(e=>e.points),1);
 const placements=p.events.map(e=>Number(e.rank)).filter(Number.isFinite);
 // Mutually exclusive placement tiers: Top 1, 2nd–3rd, 4th–5th, 6th–10th.
 const top1=placements.filter(r=>r===1).length;
 const top3=placements.filter(r=>r>=2 && r<=3).length;
 const top5=placements.filter(r=>r>=4 && r<=5).length;
 const top10=placements.filter(r=>r>=6 && r<=10).length;
 app.innerHTML=`<section class="detail-head back-first"><button class="back" onclick="goBack('players')">← Back</button><div><div class="eyebrow">Player profile</div><h1>${esc(p.currentName)}</h1><p class="sub">${p.names.length>1?"Former names: "+esc(p.names.slice(0,-1).join(" → ")):"No recorded name changes"}</p></div></section>
 <section class="stat-grid">
   <div class="card"><div class="kpi-label">Total points</div><div class="kpi-value">${fmt(p.totalPoints)}</div></div>
   <div class="card"><div class="kpi-label">Average / event</div><div class="kpi-value">${fmt(p.averagePoints)}</div></div>
   <div class="card"><div class="kpi-label">Events ≥ 1 point</div><div class="kpi-value">${p.eventsParticipated}</div></div>
   <div class="card"><div class="kpi-label">Best event rank</div><div class="kpi-value">${p.bestRank??"—"}</div></div>
   <div class="card"><div class="kpi-label">Quests completed</div><div class="kpi-value">${fmt(p.questsCompleted)}</div></div>
   <div class="card accent-kpi"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(p.averagePPQ)}</div><div class="kpi-note">average across events</div></div>
 </section>
 <section class="card performance-card"><div class="table-head compact"><h2>Performance badges</h2><span class="muted">exclusive placement tiers · all events</span></div><div class="performance-badges"><div class="performance-badge rank1"><span class="medal">👑</span><strong>${top1}</strong><span>Top 1 finish</span></div><div class="performance-badge rank3"><span class="medal">🥉</span><strong>${top3}</strong><span>2nd–3rd place</span></div><div class="performance-badge rank5"><span class="medal">🏅</span><strong>${top5}</strong><span>4th–5th place</span></div><div class="performance-badge rank10"><span class="medal">⭐</span><strong>${top10}</strong><span>6th–10th place</span></div></div></section>
 <section class="grid two profile-content">
  <div class="card points-card"><h2>Points over time</h2><div class="chart-viewport"><div class="chart">${p.events.map(e=>`<div class="bar-wrap" title="${esc(e.event)}: ${fmt(e.points)} points"><div class="bar" style="height:${Math.max(2,e.points/max*100)}%"></div><div class="bar-label">${esc(e.event.replace("2026","").replace("2025",""))}</div></div>`).join("")}</div></div></div>
  <div class="card"><h2>Name history</h2>${p.names.slice().reverse().map((n,i)=>`<div class="name-history-row"><span class="badge ${i===0?'current-name-badge':''}">${i===0?"Current":"Former"}</span> <strong>${esc(n)}</strong></div>`).join("")}</div>
 </section>
 <section class="card table-card" style="margin-top:16px"><div class="table-head"><h2>Event-by-event results</h2></div><div class="table-scroll"><table id="playerEventsTable"><thead><tr>${sortHead("Event","playerEventsTable",0)}${sortHead("Rank","playerEventsTable",1,"number")}${sortHead("Points","playerEventsTable",2,"number")}${sortHead("Started","playerEventsTable",3,"number")}${sortHead("Completed","playerEventsTable",4,"number")}${sortHead("Pts/quest","playerEventsTable",5,"number")}</tr></thead><tbody>${playerRows(p)}</tbody></table></div></section>`;
}

function eventView(id){
 const e=eventById(id); if(!e){dashboard();return}
 nav("");
 const sorted=e.rows.slice().sort((a,b)=>a.rank-b.rank);
 app.innerHTML=`<section class="detail-head back-first"><button class="back" onclick="goBack('events')">← Back</button><div><div class="eyebrow">Event detail</div><h1>${esc(e.name)}</h1><p class="sub">${esc(e.start)} → ${esc(e.end)}</p></div></section>
 <section class="stat-grid">
  <div class="card"><div class="kpi-label">Alliance points</div><div class="kpi-value">${fmt(e.alliancePoints)}</div></div>
  <div class="card"><div class="kpi-label">Alliance rank</div><div class="kpi-value">${esc(e.allianceRank)}</div></div>
  <div class="card"><div class="kpi-label">Levels completed</div><div class="kpi-value">${e.level ?? "—"}</div></div>
  <div class="card"><div class="kpi-label">Minimum requirement</div><div class="kpi-value">${fmt(e.minimumPoints)}</div></div>
  <div class="card"><div class="kpi-label">Reward</div><div class="kpi-value" style="font-size:20px">${esc(e.reward)}</div></div>
  <div class="card accent-kpi"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(e.averagePPQ)}</div><div class="kpi-note">all completed quests in this event</div></div>
 </section>
 <section class="card table-card"><div class="table-head event-results-head"><div><h2>Player results</h2><span class="muted">${sorted.length} players · ${sorted.filter(r=>Number(r.points)>=Number(e.minimumPoints)).length} met requirement · ${sorted.filter(r=>Number(r.points)<Number(e.minimumPoints)).length} below requirement</span></div></div><div class="requirement-legend"><span><i class="legend-dot met"></i> Requirement met</span><span><i class="legend-dot unmet"></i> Below requirement</span></div><div class="requirement-filter-row"><button type="button" class="filter-toggle" id="belowRequirementToggle" onclick="toggleBelowRequirement()">Show players below requirement</button></div><div class="table-scroll"><table id="eventPlayersTable"><thead><tr>${sortHead("Rank","eventPlayersTable",0,"number")}${sortHead("Governor","eventPlayersTable",1)}${sortHead("Points","eventPlayersTable",2,"number")}${sortHead("Started","eventPlayersTable",3,"number")}${sortHead("Completed","eventPlayersTable",4,"number")}${sortHead("Pts/quest","eventPlayersTable",5,"number")}</tr></thead><tbody>
 ${sorted.map(r=>{const below=Number(r.points)<Number(e.minimumPoints);return `<tr class="clickable ${below?'below-requirement':'met-requirement'}" data-below-requirement="${below?'true':'false'}" onclick="location.hash='player/${encodeURIComponent(r.playerId)}'"><td class="rank" data-value="${r.rank}">${rankPill(r.rank)}</td><td><button class="player-link">${esc(r.name)}</button>${(()=>{const linked=D.players.find(p=>p.id===r.playerId);return linked && linked.currentName!==r.name?` <span class="current-name-note">now: ${esc(linked.currentName)}</span>`:""})()}</td><td class="num">${fmt(r.points)}</td><td class="num">${r.started}</td><td class="num">${r.completed}</td><td class="num">${avg(r.ppq)}</td></tr>`}).join("")}
 </tbody></table></div></section>`;
}

function toggleBelowRequirement(){
 const table=document.getElementById("eventPlayersTable");
 const button=document.getElementById("belowRequirementToggle");
 if(!table || !button) return;
 const showingOnly=table.dataset.requirementFilter==="below";
 table.querySelectorAll("tbody tr").forEach(row=>{
   const below=row.dataset.belowRequirement==="true";
   row.hidden=!showingOnly && !below;
 });
 table.dataset.requirementFilter=showingOnly?"all":"below";
 button.textContent=showingOnly?"Show players below requirement":"Show all players";
 button.classList.toggle("active",!showingOnly);
}

// Preserve per-route view state for in-app Back navigation.
const routeState=new Map();
let currentRouteKey=location.hash||'#dashboard';
const routeTrail=[currentRouteKey];
let routeTrailPosition=0;
if('scrollRestoration' in history)history.scrollRestoration='manual';
function saveRouteState(){
 routeState.set(currentRouteKey,{scrollY:window.scrollY,playerFilter:document.getElementById('playerFilter')?.value||'',playerPage:sessionStorage.getItem('playerPage')||'0',requirementFilter:document.getElementById('eventPlayersTable')?.dataset.requirementFilter||'all',tableSorts:Array.from(document.querySelectorAll('table[data-sort-col]')).map(t=>({id:t.id,col:Number(t.dataset.sortCol),dir:t.dataset.sortDir,type:t.querySelector('th.sortable[data-col="'+t.dataset.sortCol+'"]')?.dataset.type||'text'}))});
}
function restoreRouteState(key){
 const state=routeState.get(key);
 if(state&&key==='#players'){sessionStorage.setItem('playerPage',state.playerPage);playersView(state.playerFilter)}
 if(state?.requirementFilter==='below'&&document.getElementById('eventPlayersTable'))toggleBelowRequirement();
 for(const sort of state?.tableSorts||[]){sortTable(sort.id,sort.col,sort.type);if(sort.dir==='desc')sortTable(sort.id,sort.col,sort.type)}
 requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,state?.scrollY||0)));
}
function goBack(fallback){
 if(routeTrailPosition>0)history.back();
 else location.hash=fallback;
}
function closeMobileMenu(){document.querySelector('.topbar')?.classList.remove('menu-open');document.getElementById('mobileMenuButton')?.setAttribute('aria-expanded','false')}
function route(){
 const h=location.hash.replace(/^#/,'');
 if(h.startsWith('player/'))playerView(h.slice(7));
 else if(h.startsWith('event/'))eventView(h.slice(6));
 else if(h==='players')playersView();
 else if(h==='events')eventsView();
 else dashboard();
 closeMobileMenu();
}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{location.hash=b.dataset.view;closeMobileMenu()});
document.getElementById('mobileMenuButton')?.addEventListener('click',()=>{
 const open=document.querySelector('.topbar').classList.toggle('menu-open');
 document.getElementById('mobileMenuButton').setAttribute('aria-expanded',String(open));
});
document.getElementById('globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){
 const query=e.target.value;sessionStorage.setItem('playerPage','0');
 if(location.hash==='#players'){playersView(query);window.scrollTo(0,0)}
 else{location.hash='players';setTimeout(()=>{playersView(query);window.scrollTo(0,0)},0)}
 e.target.blur();closeMobileMenu();
}});
document.getElementById('footerUpdated').textContent='Source: alliance-mobilization.xlsx · '+D.updatedFromWorkbook;
document.addEventListener('click',e=>{
 const th=e.target.closest('th.sortable');
 if(th){if(th.dataset.table==='playersTable')sortPlayers(Number(th.dataset.col));else sortTable(th.dataset.table,Number(th.dataset.col),th.dataset.type)}
 const link=e.target.closest('[onclick*="location.hash"],[onclick*="goBack"],.brand,.nav-btn');
 if(link)saveRouteState();
},true);
window.addEventListener('hashchange',()=>{
 const key=location.hash||'#dashboard';
 if(routeTrail[routeTrailPosition-1]===key)routeTrailPosition--;
 else if(routeTrail[routeTrailPosition+1]===key)routeTrailPosition++;
 else{routeTrail.splice(routeTrailPosition+1);routeTrail.push(key);routeTrailPosition++}
 currentRouteKey=key;route();restoreRouteState(key);
});
route();
