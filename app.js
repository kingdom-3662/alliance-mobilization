
const D = window.ALLIANCE_DATA;
const app = document.getElementById("app");
const fmt = n => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
const avg = n => Number(n || 0).toLocaleString("en-US",{maximumFractionDigits:1});
const esc = s => String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

function nav(view){ document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view)); }
function playerById(id){return D.players.find(p=>p.id===decodeURIComponent(id));}
function eventById(id){return D.events.find(e=>e.id===id);}
function playerRows(p){return p.events.map(x=>`<tr><td>${esc(x.event)}</td><td class="num">${x.rank}</td><td class="num">${fmt(x.points)}</td><td class="num">${x.started}</td><td class="num">${x.completed}</td><td class="num">${avg(x.ppq)}</td></tr>`).join("")}

function dashboard(){
 nav("dashboard");
 const totalPoints=D.events.reduce((s,e)=>s+e.alliancePoints,0);
 const latest=D.events[D.events.length-1];
 const top=D.players.slice(0,8);
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
 <section class="grid two">
   <div class="card table-card"><div class="table-head"><h2>Top players · total points</h2><span class="muted">all recorded events</span></div>
    <div class="table-scroll"><table><thead><tr><th>#</th><th>Governor</th><th class="num">Points</th><th class="num">Events</th><th class="num">Avg/event</th></tr></thead><tbody>
    ${top.map((p,i)=>`<tr class="clickable" onclick="location.hash='player/${encodeURIComponent(p.id)}'"><td class="rank">${i+1}</td><td><button class="player-link">${esc(p.currentName)}</button></td><td class="num">${fmt(p.totalPoints)}</td><td class="num">${p.eventsParticipated}</td><td class="num">${fmt(p.averagePoints)}</td></tr>`).join("")}
    </tbody></table></div>
   </div>
   <div class="card"><h2>Event history</h2><div class="event-list" style="grid-template-columns:1fr">
   ${D.events.slice().reverse().map(e=>`<div class="event-card" onclick="location.hash='event/${e.id}'"><div class="event-title"><strong>${esc(e.name)}</strong><span class="badge">#${esc(e.allianceRank)}</span></div><div class="event-stat"><span class="muted">Alliance points</span><b>${fmt(e.alliancePoints)}</b></div><div class="event-meta"><span>${esc(e.start)}</span><span>Reward: ${esc(e.reward)}</span></div></div>`).join("")}
   </div></div>
 </section>`;
}

function eventsView(){
 nav("events");
 app.innerHTML=`<section class="hero"><div><div class="eyebrow">History</div><h1>Events</h1><p class="sub">Every recorded Alliance Mobilization result.</p></div></section>
 <section class="event-list">${D.events.slice().reverse().map(e=>`
 <article class="card event-card" onclick="location.hash='event/${e.id}'">
   <div class="event-title"><strong>${esc(e.name)}</strong><span class="badge">Alliance #${esc(e.allianceRank)}</span></div>
   <div class="event-stat"><span class="muted">Alliance points</span><b>${fmt(e.alliancePoints)}</b></div>
   <div class="event-meta"><span>${esc(e.start)} → ${esc(e.end)}</span><span>Min. ${fmt(e.minimumPoints)}</span><span>Level ${e.level}</span></div>
 </article>`).join("")}</section>`;
}

function playersView(query="", preserveInput=false){
 nav("players");
 const q=query.trim().toLowerCase();
 const list=D.players.filter(p=>!q || p.currentName.toLowerCase().includes(q) || p.names.some(n=>n.toLowerCase().includes(q)));
 const page=Number(sessionStorage.getItem("playerPage")||0);
 const size=25, pages=Math.max(1,Math.ceil(list.length/size)), pg=Math.min(page,pages-1);
 const shown=list.slice(pg*size,(pg+1)*size);
 app.innerHTML=`<section class="hero"><div><div class="eyebrow">Player index</div><h1>Players</h1><p class="sub" id="playersCount">${list.length} matching unique identities</p></div></section>
 <section class="card table-card"><div class="table-head"><h2>All governors</h2><span class="muted">click a player for the full profile</span></div>
 <div class="filter-row" style="padding:0 18px 12px"><input id="playerFilter" value="${esc(query)}" placeholder="Filter players…" oninput="filterPlayersLive(this.value)"></div>
 <div class="table-scroll"><table><thead><tr><th>#</th><th>Governor</th><th class="num">Total</th><th class="num">Avg/event</th><th class="num">Events</th><th class="num">Best rank</th><th>Former names</th></tr></thead><tbody id="playersTbody">
 ${shown.map((p,i)=>`<tr class="clickable" onclick="location.hash='player/${encodeURIComponent(p.id)}'"><td>${pg*size+i+1}</td><td><button class="player-link">${esc(p.currentName)}</button></td><td class="num">${fmt(p.totalPoints)}</td><td class="num">${fmt(p.averagePoints)}</td><td class="num">${p.eventsParticipated}</td><td class="num">${p.bestRank??"—"}</td><td class="muted">${p.names.length>1?esc(p.names.slice(0,-1).join(" → ")):"—"}</td></tr>`).join("")}
 </tbody></table></div><div class="pagination" id="playersPagination">${Array.from({length:pages},(_,i)=>`<button class="${i===pg?'active':''}" onclick="event.stopPropagation();sessionStorage.setItem('playerPage',${i});playersView(document.getElementById('playerFilter').value)">${i+1}</button>`).join("")}</div></section>`;
}

function filterPlayersLive(query=""){
 const q=query.trim().toLowerCase();
 const list=D.players.filter(p=>!q || p.currentName.toLowerCase().includes(q) || p.names.some(n=>n.toLowerCase().includes(q)));
 const size=25, pages=Math.max(1,Math.ceil(list.length/size));
 const page=Math.min(Number(sessionStorage.getItem("playerPage")||0),pages-1);
 const shown=list.slice(page*size,(page+1)*size);
 const table=shown.map((p,i)=>`<tr class="clickable" onclick="location.hash='player/${encodeURIComponent(p.id)}'"><td>${page*size+i+1}</td><td><button class="player-link">${esc(p.currentName)}</button></td><td class="num">${fmt(p.totalPoints)}</td><td class="num">${fmt(p.averagePoints)}</td><td class="num">${p.eventsParticipated}</td><td class="num">${p.bestRank??"—"}</td><td class="muted">${p.names.length>1?esc(p.names.slice(0,-1).join(" → ")):"—"}</td></tr>`).join("");
 const tbody=document.querySelector("#playersTbody");
 const pag=document.querySelector("#playersPagination");
 const count=document.querySelector("#playersCount");
 if(tbody) tbody.innerHTML=table;
 if(pag) pag.innerHTML=Array.from({length:pages},(_,i)=>`<button class="${i===page?'active':''}" onclick="sessionStorage.setItem('playerPage',${i});filterPlayersLive(document.getElementById('playerFilter').value)">${i+1}</button>`).join("");
 if(count) count.textContent=`${list.length} matching unique identities`;
}

function playerView(id){
 const p=playerById(id); if(!p){dashboard();return}
 nav("");
 const max=Math.max(...p.events.map(e=>e.points),1);
 app.innerHTML=`<section class="detail-head"><div><div class="eyebrow">Player profile</div><h1>${esc(p.currentName)}</h1><p class="sub">${p.names.length>1?"Former names: "+esc(p.names.slice(0,-1).join(" → ")):"No recorded name changes"}</p></div><button class="back" onclick="location.hash='players'">← Players</button></section>
 <section class="stat-grid">
   <div class="card"><div class="kpi-label">Total points</div><div class="kpi-value">${fmt(p.totalPoints)}</div></div>
   <div class="card"><div class="kpi-label">Average / event</div><div class="kpi-value">${fmt(p.averagePoints)}</div></div>
   <div class="card"><div class="kpi-label">Events ≥ 1 point</div><div class="kpi-value">${p.eventsParticipated}</div></div>
   <div class="card"><div class="kpi-label">Best event rank</div><div class="kpi-value">${p.bestRank??"—"}</div></div>
   <div class="card"><div class="kpi-label">Quests completed</div><div class="kpi-value">${fmt(p.questsCompleted)}</div></div>
   <div class="card accent-kpi"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(p.averagePPQ)}</div><div class="kpi-note">average across events</div></div>
 </section>
 <section class="grid two">
  <div class="card"><h2>Points over time</h2><div class="chart">${p.events.map(e=>`<div class="bar-wrap" title="${esc(e.event)}: ${fmt(e.points)} points"><div class="bar" style="height:${Math.max(2,e.points/max*100)}%"></div><div class="bar-label">${esc(e.event.replace("2026","").replace("2025",""))}</div></div>`).join("")}</div></div>
  <div class="card"><h2>Name history</h2>${p.names.map((n,i)=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><span class="badge">${i===p.names.length-1?"Current":"Former"}</span> <strong>${esc(n)}</strong></div>`).join("")}</div>
 </section>
 <section class="card table-card" style="margin-top:16px"><div class="table-head"><h2>Event-by-event results</h2></div><div class="table-scroll"><table><thead><tr><th>Event</th><th class="num">Rank</th><th class="num">Points</th><th class="num">Started</th><th class="num">Completed</th><th class="num">Pts/quest</th></tr></thead><tbody>${playerRows(p)}</tbody></table></div></section>`;
}

function eventView(id){
 const e=eventById(id); if(!e){dashboard();return}
 nav("");
 const sorted=e.rows.slice().sort((a,b)=>a.rank-b.rank);
 app.innerHTML=`<section class="detail-head"><div><div class="eyebrow">Event detail</div><h1>${esc(e.name)}</h1><p class="sub">${esc(e.start)} → ${esc(e.end)}</p></div><button class="back" onclick="location.hash='events'">← Events</button></section>
 <section class="stat-grid">
  <div class="card"><div class="kpi-label">Alliance points</div><div class="kpi-value">${fmt(e.alliancePoints)}</div></div>
  <div class="card"><div class="kpi-label">Alliance rank</div><div class="kpi-value">#${esc(e.allianceRank)}</div></div>
  <div class="card"><div class="kpi-label">Level</div><div class="kpi-value">${e.level}</div></div>
  <div class="card"><div class="kpi-label">Minimum</div><div class="kpi-value">${fmt(e.minimumPoints)}</div></div>
  <div class="card"><div class="kpi-label">Reward</div><div class="kpi-value" style="font-size:20px">${esc(e.reward)}</div></div>
  <div class="card accent-kpi"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(e.averagePPQ)}</div><div class="kpi-note">all completed quests in this event</div></div>
 </section>
 <section class="card table-card"><div class="table-head"><h2>Player results</h2><span class="muted">${sorted.length} rows</span></div><div class="table-scroll"><table><thead><tr><th>Rank</th><th>Governor</th><th class="num">Points</th><th class="num">Started</th><th class="num">Completed</th><th class="num">Pts/quest</th></tr></thead><tbody>
 ${sorted.map(r=>`<tr class="clickable" onclick="location.hash='player/${encodeURIComponent(r.playerId)}'"><td class="rank">${r.rank}</td><td><button class="player-link">${esc(r.name)}</button>${r.name!==r.playerId?` <span class="muted">· identity linked</span>`:""}</td><td class="num">${fmt(r.points)}</td><td class="num">${r.started}</td><td class="num">${r.completed}</td><td class="num">${avg(r.ppq)}</td></tr>`).join("")}
 </tbody></table></div></section>`;
}

function route(){
 const h=location.hash.replace(/^#/,"");
 if(h.startsWith("player/")) playerView(h.slice(7));
 else if(h.startsWith("event/")) eventView(h.slice(6));
 else if(h==="players") playersView();
 else if(h==="events") eventsView();
 else dashboard();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{location.hash=b.dataset.view});
document.getElementById("globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){location.hash="players";setTimeout(()=>playersView(e.target.value),0)}});
document.getElementById("footerUpdated").textContent="Source: alliance-mobilization.xlsx · "+D.updatedFromWorkbook;
window.addEventListener("hashchange",route);
route();
