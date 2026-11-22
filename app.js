
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
 const alignRight=type==="number" && label!=="#" && !(label==="Rank" && table==="eventPlayersTable") && !(label==="Event" && table==="playerEventsTable");
 const sortIcon='<span class="sort-icon" aria-hidden="true">↕</span>';
 return `<th class="sortable${table==="playerEventsTable"&&col===0?' sort-desc':''}${alignRight?' num':''}" data-table="${table}" data-col="${col}" data-type="${type}"><button type="button">${label}${sortIcon}</button></th>`;
}


function rankClass(r){r=Number(r);return r===1?'rank1':r===2?'rank2':r===3?'rank3':r>=4&&r<=5?'rank45':r>=6&&r<=10?'rank10':''}
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
function playerRows(p){const order=new Map(D.events.map((e,i)=>[e.name,i]));return p.events.slice().sort((a,b)=>(order.get(b.event)??-1)-(order.get(a.event)??-1)).map(x=>`<tr><td data-value="${order.get(x.event)??-1}">${esc(x.event)}</td><td class="num" data-value="${x.rank}">${rankPill(x.rank)}</td><td class="num">${fmt(x.points)}</td><td class="num">${x.started}</td><td class="num">${x.completed}</td><td class="num">${avg(x.ppq)}</td></tr>`).join("")}

function shortEventLabel(name){
 return String(name||'').replace(/^([A-Za-z]{3})[A-Za-z]* (\d{4})$/,(_match,month,year)=>month+" '"+year.slice(2));
}
/* Shared responsive line-chart renderer used throughout the site. */
function unifiedLineChart(values,options={}){
 if(!values.length)return '<div class="empty">No event data</div>';
 const nums=values.map(v=>Number(v)||0);
 const labels=options.labels||D.events.map(e=>e.name);
 const format=options.format||'number';
 const tone=['gold','purple','steel-blue'].includes(options.tone)?options.tone:'gold';
 const exact=v=>format==='decimal'?v.toFixed(1):fmt(v);
 const short=v=>format==='decimal'?v.toFixed(1):(Math.abs(v)>=1000?(v/1000).toFixed(Math.abs(v)>=100000?0:1)+'k':fmt(v));
 const minimum=Math.min(...nums),maximum=Math.max(...nums),spread=maximum-minimum||Math.max(1,Math.abs(maximum)*.1);
 const rawStep=spread/3.5;
 const power=Math.pow(10,Math.floor(Math.log10(rawStep)));
 const normalized=rawStep/power;
 const nice=normalized<=1?1:normalized<=2?2:normalized<=2.5?2.5:normalized<=5?5:10;
 const step=nice*power;
 const axisMin=Math.max(0,Math.floor((minimum-step*.25)/step)*step);
 const axisMax=Math.max(axisMin+step,Math.ceil((maximum+step*.25)/step)*step);
 const w=620,h=192,left=55,right=14,top=16,bottom=150;
 const x=i=>left+i*(w-left-right)/Math.max(1,nums.length-1);
 const y=v=>bottom-(v-axisMin)/(axisMax-axisMin)*(bottom-top);
 const pts=nums.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
 const gradientId='unified-line-'+tone;
 const grid=Array.from({length:5},(_,i)=>{
  const value=axisMin+(axisMax-axisMin)*i/4,yy=y(value);
  return `<line class="unified-chart-grid" x1="${left}" x2="${w-right}" y1="${yy}" y2="${yy}"/><text class="unified-chart-y" text-anchor="end" x="${left-9}" y="${yy+4}">${short(value)}</text>`;
 }).join('');
 // First / middle / last labels stay readable in compact cards.
 const labelPositions=[0,Math.floor((nums.length-1)/2),nums.length-1].filter((v,i,a)=>a.indexOf(v)===i);
 const xLabels=labelPositions.map(i=>`<text class="unified-chart-x" text-anchor="${i===0?'start':i===nums.length-1?'end':'middle'}" x="${x(i)}" y="${h-9}">${esc(shortEventLabel(labels[i]))}</text>`).join('');
 const marks=nums.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===nums.length-1?5.5:3.5}" class="unified-chart-point"><title>${esc(labels[i])}: ${esc(exact(v))} ${esc(options.unit||'')}</title></circle>`).join('');
 const lastX=x(nums.length-1),lastY=y(nums[nums.length-1]);
 return `<svg class="unified-line-chart tone-${tone}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(options.label||'Recorded event trend')}; values: ${esc(nums.map(exact).join(', '))}">
 <defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--chart-line-color)" stop-opacity=".22"/><stop offset="1" stop-color="var(--chart-line-color)" stop-opacity="0"/></linearGradient></defs>
 ${grid}
 <line class="unified-chart-axis" x1="${left}" x2="${left}" y1="${top}" y2="${bottom}"/>
 <line class="unified-chart-axis" x1="${left}" x2="${w-right}" y1="${bottom}" y2="${bottom}"/>
 <polygon points="${left},${bottom} ${pts} ${lastX},${bottom}" fill="url(#${gradientId})"/>
 <polyline points="${pts}" fill="none" stroke="var(--chart-line-color)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
 ${marks}
 <circle cx="${lastX}" cy="${lastY}" r="9" stroke="var(--chart-line-color)" stroke-width="4" opacity=".18" fill="none"/>
 ${xLabels}
 </svg>`;
}
function alliancePointsChange(){
 const values=D.events.map(e=>Number(e.alliancePoints)||0);
 const previous=values[values.length-2],last=values[values.length-1];
 return values.length>1&&previous>0?100*(last-previous)/previous:null;
}
function allianceChart(showBadge=true){
 const values=D.events.map(e=>Number(e.alliancePoints)||0);
 if(!values.length)return '<div class="empty">No event data</div>';
 const latest=D.events[D.events.length-1];
 const last=values[values.length-1];
 return `<div class="chart-metric-head"><div class="chart-summary"><strong>${fmt(last)}</strong><span class="muted">alliance points · ${esc(latest.name)}</span></div>${showBadge?trendMetricBadge(alliancePointsChange()):''}</div>
 ${unifiedLineChart(values,{tone:'gold',unit:'points',label:'Alliance points by event'})}`;
}

function allianceRankingChart(){
 const frequencies=new Map();
 D.events.forEach(e=>{
   const rank=String(e.allianceRank ?? '').trim() || 'Unranked';
   frequencies.set(rank,(frequencies.get(rank)||0)+1);
 });
 if(!frequencies.size) return '<div class="empty">No ranking data</div>';
 const rankNumber=rank=>{const n=parseInt(rank,10);return Number.isNaN(n)?Number.MAX_SAFE_INTEGER:n;};
 const distribution=[...frequencies.entries()].sort((a,b)=>rankNumber(a[0])-rankNumber(b[0]) || a[0].localeCompare(b[0]));
 const total=distribution.reduce((sum,[,count])=>sum+count,0);
 const circumference=2*Math.PI*68;
 // Use the shared ranking palette: gold / silver / bronze / purple / steel blue.
 // The donut uses midtones between each ranking circle's dark fill and light border.
 const colorFor=rank=>{
   const place=rankNumber(rank);
   if(place===1) return 'var(--place-mid-gold)';
   if(place===2) return 'var(--place-mid-silver)';
   if(place===3) return 'var(--place-mid-bronze)';
   if(place===4 || place===5) return 'var(--place-mid-purple)';
   if(place>=6 && place<=10) return 'var(--place-mid-steel-blue)';
   return 'var(--place-mid-neutral)';
 };
 let offset=0;
 const segments=distribution.map(([rank,count],index)=>{
   const length=circumference*count/total;
   // No spacing between segments: adjacent arc lengths meet at shared boundaries.
   const dash=length;
   const color=colorFor(rank);
   const segment=`<circle cx="100" cy="100" r="68" fill="none" stroke="${color}" stroke-width="24" stroke-dasharray="${dash} ${circumference-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"><title>${esc(rank)}: ${count} ${count===1?'event':'events'}</title></circle>`;
   offset+=length;
   return segment;
 }).join('');
 const legend=distribution.map(([rank,count],index)=>{
   const percent=(100*count/total).toFixed(1);
   const label=rank==='Unranked'?rank:`${rank} place`;
   return `<li class="rank-donut-legend-item"><span class="rank-donut-legend-dot" style="background:${colorFor(rank)}" aria-hidden="true"></span><span class="rank-donut-legend-content"><span class="rank-donut-legend-label">${esc(label)}</span><span class="rank-donut-legend-detail">${count} ${count===1?'event':'events'} · ${percent}%</span></span></li>`;
 }).join('');
 const summary=distribution.map(([rank,count])=>`${rank}: ${count} ${count===1?'event':'events'}`).join(', ');
 const latestRank=D.events[D.events.length-1]?.allianceRank;
 const previousRank=D.events[D.events.length-2]?.allianceRank;
 const currentPlace=rankNumber(String(latestRank||''));
 const previousPlace=rankNumber(String(previousRank||''));
 const diff=currentPlace!==Number.MAX_SAFE_INTEGER&&previousPlace!==Number.MAX_SAFE_INTEGER?previousPlace-currentPlace:null;
 const comparison=diff===null?'No earlier placement':diff===0?'unchanged vs previous event':diff>0?`up ${diff} ${diff===1?'place':'places'} vs previous event`:`down ${-diff} ${-diff===1?'place':'places'} vs previous event`;
 return `<div class="rank-donut-layout">
  <div class="rank-donut-graphic"><svg viewBox="0 0 200 200" role="img" aria-label="Alliance ranking distribution: ${esc(summary)}">
    <circle cx="100" cy="100" r="68" fill="none" stroke="#343941" stroke-width="24"/>
    ${segments}
   </svg><div class="rank-donut-center" aria-hidden="true"><strong>${fmt(total)}</strong><span>events</span></div></div>
  <ul class="rank-donut-legend" aria-label="Alliance ranking legend">${legend}</ul>
 </div><div class="chart-metric-foot rank-donut-foot">Latest placement: <strong>${esc(latestRank||"—")}</strong> · ${esc(comparison)}</div>`;
}

/* Trends are derived from the deployed event and player data, never a separate data source. */
const trendEvents=()=>D.events.map((e,i)=>{
 const rows=e.rows||[],minimum=Number(e.minimumPoints)||0;
 const active=rows.filter(r=>Number(r.points)>0).length;
 const qualifying=minimum>0?rows.filter(r=>Number(r.points)>=minimum).length:0;
 const previous=D.events[i-1];
 const prevPoints=Number(previous?.alliancePoints)||0;
 return {event:e,index:i,active,qualifying,total:rows.length,
  requirementRate:minimum>0&&rows.length?100*qualifying/rows.length:null,
  points:Number(e.alliancePoints)||0,ppq:Number(e.averagePPQ)||0,
  pointsChange:i&&prevPoints?100*((Number(e.alliancePoints)||0)-prevPoints)/prevPoints:null,
  rank:Number.parseInt(e.allianceRank,10)};
});
function playerMomentum(p){
 // All included event results count, even when the player scored zero points.
 // Scoring-exception exclusions are already removed from p.events by the builder.
 const recorded=p.events||[];
 if(recorded.length<6)return null;
 const recent=recorded.slice(-3),prior=recorded.slice(-6,-3);
 const mean=(rows,key)=>rows.reduce((sum,e)=>sum+Number(e[key]||0),0)/rows.length;
 const before=mean(prior,'points'),now=mean(recent,'points');
 if(!before)return null;
 const pct=100*(now-before)/before;
 return {player:p,pct,prior:before,recent:now,
  priorRank:mean(prior,'rank'),recentRank:mean(recent,'rank'),
  priorPPQ:mean(prior,'ppq'),recentPPQ:mean(recent,'ppq'),
  label:pct>5?'Improving':pct< -5?'Declining':'Stable'};
}
function trendChange(pct,decimals=1){
 if(pct===null||pct===undefined||!Number.isFinite(pct))return '<span class="muted">—</span>';
 const sign=pct>0?'+':'';
 const state=pct>5?'up':pct< -5?'down':'flat';
 return `<span class="trend-delta ${state}">${sign}${pct.toFixed(decimals)}%</span>`;
}
function trendMetricBadge(change,unit='%',decimals=1){
 if(change===null||change===undefined||!Number.isFinite(change))return '<span class="trend-metric-badge neutral"><span class="trend-metric-prefix">last:</span> No comparison</span>';
 const rounded=Number(change.toFixed(decimals)),sign=rounded>0?'+':'',status=rounded>0?'positive':rounded<0?'negative':'neutral';
 return `<span class="trend-metric-badge ${status}"><span class="trend-metric-prefix">last:</span> ${sign}${rounded.toFixed(decimals)}${unit}</span>`;
}
function trendLine(values,caption,format='number',tone='gold'){
 return unifiedLineChart(values,{format,tone,label:caption,unit:format==='decimal'?'points per quest':'entries'});
}
function trendsView(){
 nav('trends');
 const eventStats=trendEvents();
 const latest=eventStats[eventStats.length-1];
 const prior=eventStats[eventStats.length-2];
 const eligible=D.players.map(playerMomentum).filter(Boolean);
 const improving=eligible.filter(p=>p.pct>5).sort((a,b)=>b.pct-a.pct).slice(0,8);
 const declining=eligible.filter(p=>p.pct< -5).sort((a,b)=>a.pct-b.pct).slice(0,8);
 const stable=eligible.filter(p=>Math.abs(p.pct)<=5).length;
 const improvingTotal=eligible.filter(p=>p.pct>5).length;
 const decliningTotal=eligible.filter(p=>p.pct< -5).length;
 const linkPlayer=t=>`<a href="#player/${encodeURIComponent(t.player.id)}" class="trend-player-row"><span class="trend-player-name">${esc(t.player.currentName)}</span>${trendChange(t.pct)}<small>${fmt(t.prior)} → ${fmt(t.recent)} avg points</small></a>`;
 const emptyPlayers='<p class="muted trend-empty">No players currently meet these criteria.</p>';
 const rate=latest?.requirementRate;
 const rateText=rate===null||rate===undefined?'—':rate.toFixed(1)+'%';
 const latestEfficiency=latest?.ppq;
 const efficiencyChange=prior?.ppq?100*(latestEfficiency-prior.ppq)/prior.ppq:null;
 const activeChange=prior?.active?100*(latest.active-prior.active)/prior.active:null;
 const participationRate=latest?.total?100*latest.active/latest.total:null;
 const previousRate=prior?.requirementRate;
 const completionRateChange=rate!=null&&previousRate!=null?rate-previousRate:null;
 const rateBars=eventStats.map(st=>{
  const value=st.requirementRate,pct=value===null?'—':value.toFixed(1)+'%';
  const shortName=st.event.name.replace(/^([A-Za-z]{3})[A-Za-z]* (\d{4})$/,(_whole,month,year)=>month+" '"+year.slice(2));
  return `<a href="#event/${encodeURIComponent(st.event.id)}" class="trend-bar-item" aria-label="${esc(st.event.name)}: ${pct} met the minimum">
   <div class="trend-bar-track"><div class="trend-bar-fill" style="height:${value===null?0:value}%"><span class="trend-bar-percent">${pct}</span></div></div>
   <span class="trend-bar-label">${esc(shortName)}</span>
  </a>`;
 }).join('');
 const eventRows=eventStats.slice().reverse().map(st=>`<tr class="clickable" onclick="location.hash='event/${encodeURIComponent(st.event.id)}'">
  <td><button class="player-link">${esc(st.event.name)}</button></td>
  <td class="num">${fmt(st.points)}</td>
  <td class="num">${trendChange(st.pointsChange)}</td>
  <td class="num">${esc(st.event.allianceRank??'—')}</td>
  <td class="num">${fmt(st.active)}</td>
  <td class="num">${st.requirementRate===null?'—':st.requirementRate.toFixed(1)+'%'}</td>
  <td class="num">${avg(st.ppq)}</td></tr>`).join('');
 app.innerHTML=`<section class="hero back-first"><button class="back" onclick="goBack('dashboard')">← Back</button>
 <div><div class="eyebrow">Performance intelligence</div><h1>Trends</h1><p class="sub">Player momentum, alliance activity and event progression across recorded Alliance Mobilization events.</p></div></section>
 <section class="grid trend-kpis">
  <div class="card"><div class="kpi-label">Latest quest efficiency</div><div class="kpi-value">${latest?avg(latest.ppq):'—'}</div><div class="kpi-note">points per completed quest ${prior?'· previously '+avg(prior.ppq):''}</div></div>
  <div class="card"><div class="kpi-label">Minimum requirement met</div><div class="kpi-value">${rateText}</div><div class="kpi-note">of ${latest?.total||0} recorded result rows · latest event</div></div>
  <div class="card"><div class="kpi-label">Active scoring entries</div><div class="kpi-value">${fmt(latest?.active||0)}</div><div class="kpi-note">latest event · entries above zero points</div></div>
  <div class="card"><div class="kpi-label">Players with trend data</div><div class="kpi-value">${eligible.length}</div><div class="kpi-note">eligible governors · ${improvingTotal} improving · ${decliningTotal} declining · ${stable} stable</div></div>
 </section>
 <section class="section-heading trend-section-title"><h2>Alliance trends</h2></section>
 <section class="grid trends-chart-grid">
  <div class="card trend-metric-card"><div class="trend-metric-header"><h2>Quest efficiency</h2>${trendMetricBadge(efficiencyChange)}</div>
   <div class="trend-metric-value">${latest?avg(latest.ppq):'—'}</div>
   <div class="trend-metric-caption">Points per completed quest · ${esc(latest?.event.name||'latest event')}</div>
   ${trendLine(eventStats.map(st=>st.ppq),'Alliance average points per quest','decimal','purple')}
   
   </div>
  <div class="card trend-metric-card"><div class="trend-metric-header"><h2>Active participation</h2>${trendMetricBadge(activeChange)}</div>
   <div class="trend-metric-value">${fmt(latest?.active||0)} <small>active entries</small></div>
   <div class="trend-metric-caption">${participationRate===null?'—':participationRate.toFixed(1)+'%'} of ${fmt(latest?.total||0)} recorded entries · latest event</div>
   ${trendLine(eventStats.map(st=>st.active),'Active scoring entries','number','steel-blue')}
   
   </div>
  <div class="card trends-wide trend-metric-card"><div class="trend-metric-header"><h2 class="requirement-completion-title"><span class="desktop-title">Minimum requirement completion</span><span class="mobile-title">Min. requirement completion</span></h2>${trendMetricBadge(completionRateChange)}</div>
   <div class="trend-metric-value">${rateText}</div>
   <div class="trend-metric-caption">${fmt(latest?.qualifying||0)} of ${fmt(latest?.total||0)} entries met the minimum · latest event</div>
   <div class="trend-bar-scroll"><div class="trend-bar-chart">${rateBars}</div></div>
   </div>
 </section>
 <section class="section-heading trend-section-title"><h2>Player momentum</h2><span class="muted">last 3 events vs. previous 3 events</span></section>
 <p class="muted trend-method">Requires at least 6 recorded event results per governor, including zero-point events; scoring exceptions are respected. A change greater than +5% counts as improving, below −5% as declining, and otherwise stable. The comparison measures average points per event, not calendar-time growth.</p>
 <section class="grid trends-chart-grid">
  <div class="card"><div class="table-head compact"><h2><span class="trend-up-icon">↗</span> Improving players</h2><span class="muted">top 8 gains</span></div><div class="trend-player-list">${improving.map(linkPlayer).join('')||emptyPlayers}</div></div>
  <div class="card"><div class="table-head compact"><h2><span class="trend-down-icon">↘</span> Declining players</h2><span class="muted">top 8 declines</span></div><div class="trend-player-list">${declining.map(linkPlayer).join('')||emptyPlayers}</div></div>
 </section>
 <section class="section-heading trend-section-title"><h2>Event progression</h2><span class="muted">comparison with the previous recorded event</span></section>
 <section class="card table-card"><div class="table-head"><h2>Performance by event</h2><span class="muted">select an event to view its results</span></div><div class="table-scroll">
 <table id="trendsEventTable"><thead><tr>${sortHead('Event','trendsEventTable',0)}${sortHead('Alliance points','trendsEventTable',1,'number')}${sortHead('Points change','trendsEventTable',2,'number')}${sortHead('Alliance rank','trendsEventTable',3,'number')}${sortHead('Active entries','trendsEventTable',4,'number')}${sortHead('Met minimum','trendsEventTable',5,'number')}${sortHead('Ø Pts/Quest','trendsEventTable',6,'number')}</tr></thead><tbody>${eventRows}</tbody></table></div></section>`;
}

function trendsCta(){
 return '<a href="#trends" class="trend-promo interactive-card card"><span><strong>📈 Trends & momentum</strong><span class="muted">Explore player momentum, alliance efficiency and event progression</span></span><span class="trend-promo-action">Explore trends →</span></a>';
}

function dashboard(){
 nav("dashboard");
 const totalPoints=D.events.reduce((s,e)=>s+e.alliancePoints,0);
 const latest=D.events[D.events.length-1];
 const top=D.players.slice(0,25);
 const bestEvent=D.events.reduce((best,e)=>!best || e.alliancePoints>best.alliancePoints?e:best,null);
 const history=D.events.slice(-5).reverse();
 // Leaderboards require at least three included event results, including zero-point entries.
 const eligibleLeaders=D.players.filter(p=>Number(p.eventsParticipated)>=3);
 const mostPoints=eligibleLeaders.slice().sort((a,b)=>b.totalPoints-a.totalPoints)[0];
 const bestRank=eligibleLeaders.filter(p=>Number(p.averageRank)>0).sort((a,b)=>a.averageRank-b.averageRank)[0];
 const bestPPQ=eligibleLeaders.filter(p=>p.questsCompleted>0).sort((a,b)=>b.averagePPQ-a.averagePPQ)[0];
 const leaderCard=(label,p,value,note,icon)=>`<${p?'a':'div'} ${p?`href="#player/${encodeURIComponent(p.id)}"`:''} class="card leader-card ${p?'interactive-card':''}"><span class="leader-icon">${icon}</span><div class="leader-label">${label}</div><strong class="leader-name">${p?esc(p.currentName):'—'}</strong><div class="leader-value">${p?value:'—'}</div><span class="kpi-note">${note}</span></${p?'a':'div'}>`;
 app.innerHTML=`
 <section class="hero"><div><div class="eyebrow">Rise of Kingdoms · Kingdom 3662</div><h1>Alliance Mobilization</h1><p class="sub">${D.events.length} recorded events · latest: ${esc(latest.name)}</p></div>
 </section>
 <section class="grid kpis">
   <div class="card"><div class="kpi-label">Events</div><div class="kpi-value">${D.events.length}</div><div class="kpi-note">recorded in the dataset</div></div>
   <div class="card"><div class="kpi-label">Players</div><div class="kpi-value">${D.players.length}</div><div class="kpi-note">unique identities</div></div>
   <div class="card"><div class="kpi-label">Latest alliance points</div><div class="kpi-value">${fmt(latest.alliancePoints)}</div><div class="kpi-note">Rank ${esc(latest.allianceRank)}</div></div>
   <div class="card"><div class="kpi-label">All event points</div><div class="kpi-value">${fmt(totalPoints)}</div><div class="kpi-note">sum of alliance totals</div></div>
   <div class="card"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(D.averagePPQ)}</div><div class="kpi-note">average across recorded events</div></div>
 </section>
 ${trendsCta()}
 <section class="leader-section"><div class="section-heading"><h2>Player leaders</h2><span class="muted">minimum 3 events participated</span></div><div class="grid leader-grid">
 ${leaderCard('Most total points',mostPoints,fmt(mostPoints?.totalPoints),'combined points','💎')}
 ${leaderCard('Best average ranking',bestRank,avg(bestRank?.averageRank),'average event placement · lower is better','📈')}
 ${leaderCard('Highest average points / quest',bestPPQ,avg(bestPPQ?.averagePPQ),'average of event-level points / quest','🚀')}
 </div></section>

  <section class="grid dashboard-main">
   <div class="card table-card"><div class="table-head"><h2>Top 25 players · total points</h2></div>
    <div class="table-scroll"><table id="dashboardTopTable"><thead><tr>${sortHead("#","dashboardTopTable",0,"number")}${sortHead("Governor","dashboardTopTable",1)}${sortHead("Points","dashboardTopTable",2,"number")}${sortHead("Events","dashboardTopTable",3,"number")}${sortHead("Avg/event","dashboardTopTable",4,"number")}${sortHead("Ø Pts/Quest","dashboardTopTable",5,"number")}</tr></thead><tbody>
    ${top.map((p,i)=>`<tr class="clickable" onclick="location.hash='player/${encodeURIComponent(p.id)}'"><td class="rank" data-value="${i+1}">${rankPill(i+1)}</td><td><button class="player-link">${esc(p.currentName)}</button></td><td class="num">${fmt(p.totalPoints)}</td><td class="num">${p.eventsParticipated}</td><td class="num">${fmt(p.averagePoints)}</td><td class="num">${avg(p.averagePPQ)}</td></tr>`).join("")}
    </tbody></table></div>
   </div>
   <div class="dashboard-side">
    <div class="card chart-card"><div class="table-head compact alliance-performance-header"><h2>Alliance performance</h2>${trendMetricBadge(alliancePointsChange())}</div>${allianceChart(false)}</div>
    <div class="card"><div class="table-head compact"><h2>Event history</h2><span class="muted">last 5 events</span></div><div class="event-list" style="grid-template-columns:1fr">
    ${!history.some(e=>e.id===bestEvent?.id)?`<a class="event-card best-event record-card interactive-card" href="#event/${bestEvent.id}"><div class="event-title"><strong>${esc(bestEvent.name)}</strong><span class="badge gold-badge">All-time best</span></div><div class="event-stat"><span class="muted">Alliance points</span><b>${fmt(bestEvent.alliancePoints)}</b></div><div class="event-meta"><span>Top player: <strong>${esc(bestEvent.topPlayer||'—')}</strong></span></div><div class="event-meta"><span>${esc(bestEvent.start)} → ${esc(bestEvent.end)} · Reward: ${esc(bestEvent.reward||'—')}</span></div></a>`:''}
    ${history.map(e=>`<a class="event-card interactive-card ${e.id===bestEvent?.id?'best-event':''}" href="#event/${e.id}"><div class="event-title"><strong>${esc(e.name)}</strong><span class="badge ${e.id===bestEvent?.id?'gold-badge':'alliance-placement-badge'}">${e.id===bestEvent?.id?'All-time best':esc(e.allianceRank)}</span></div><div class="event-stat"><span class="muted">Alliance points</span><b>${fmt(e.alliancePoints)}</b></div><div class="event-meta"><span>Top player: <strong>${esc(e.topPlayer||'—')}</strong></span></div><div class="event-meta"><span>${esc(e.start)} → ${esc(e.end)} · Reward: ${esc(e.reward||'—')}</span></div></a>`).join("")}
    </div></div>
   </div>
 </section>`;
}

function eventsView(){
 nav("events");
 const bestEvent=D.events.reduce((best,e)=>!best || Number(e.alliancePoints)>Number(best.alliancePoints)?e:best,null);
 app.innerHTML=`<section class="hero back-first"><button class="back" onclick="goBack('dashboard')">← Back</button><div><div class="eyebrow">History</div><h1>Events</h1><p class="sub">Every recorded Alliance Mobilization result.</p></div></section>
 <section class="event-overview-charts" aria-label="Alliance event performance charts">
   <div class="card chart-card event-overview-chart"><div class="table-head compact"><h2>Alliance points</h2><span class="muted">points by event</span></div>${allianceChart()}</div>
   <div class="card chart-card event-overview-chart"><div class="table-head compact"><h2>Alliance ranking distribution</h2><span class="muted">events by final placement</span></div>${allianceRankingChart()}</div>
  </section>
 ${trendsCta()}
 <section class="event-list">${D.events.slice().reverse().map(e=>`
 <a href="#event/${e.id}" class="card event-card interactive-card ${e.id===bestEvent?.id?'best-event':''}">
   <div class="event-title"><strong>${esc(e.name)}</strong><span class="badge ${e.id===bestEvent?.id?'gold-badge':'alliance-placement-badge'}">${e.id===bestEvent?.id?'All-time best':esc(e.allianceRank)}</span></div>
   <div class="event-stat"><span class="muted">Alliance points</span><b>${fmt(e.alliancePoints)}</b></div>
   <div class="event-meta"><span>${esc(e.start)} → ${esc(e.end)}</span><span>Minimum requirement: ${fmt(e.minimumPoints)}</span><span>Levels completed: ${e.level ?? "—"}</span></div>
   <div class="event-top-player"><span class="muted">Top scorer</span><strong>${esc(e.topPlayer||"—")}</strong><span>${fmt(e.topPlayerPoints)} pts</span></div>
 </a>`).join("")}</section>`;
}

function playersView(query=''){
 nav('players');
 const list=sortedPlayers(query),size=25,pages=Math.max(1,Math.ceil(list.length/size));
 const page=Math.min(Math.max(0,Number(sessionStorage.getItem('playerPage')||0)),pages-1);
 app.innerHTML=`<section class="hero back-first"><button class="back" onclick="goBack('dashboard')">← Back</button><div><div class="eyebrow">Player index</div><h1>Players</h1><p class="sub" id="playersCount">${list.length} matching unique identities</p></div></section>
 ${trendsCta()}
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

/* Player results: a zero-based bar plot with named axes and event-value labels. */
function playerPointsChart(p){
 const events=p.events||[];
 if(!events.length)return '<div class="empty">No scoring event results yet.</div>';
 const values=events.map(e=>Number(e.points)||0);
 const max=Math.max(...values,1),step=Math.max(250,Math.ceil(max/4/250)*250),ceiling=4*step;
 const w=Math.max(550,86+events.length*68),h=242,left=65,right=18,top=25,bottom=195;
 const y=v=>bottom-(v/ceiling)*(bottom-top);
 const plotWidth=w-left-right;
 const gap=plotWidth/events.length;
 const barWidth=Math.min(37,gap*.6);
 const ticks=Array.from({length:5},(_,i)=>{
  const v=i*step,yy=y(v);
  return `<line class="metric-grid-line" x1="${left}" x2="${w-right}" y1="${yy}" y2="${yy}"/><text class="metric-axis-tick" x="${left-9}" y="${yy+4}" text-anchor="end">${fmt(v)}</text>`;
 }).join('');
 const bars=events.map((event,i)=>{
  const value=values[i],x=left+gap*(i+.5),yy=y(value),barHeight=Math.max(0,bottom-yy);
  return `<rect x="${x-barWidth/2}" y="${yy}" width="${barWidth}" height="${barHeight}" rx="3" fill="url(#playerChartFill)"><title>${esc(event.event)}: ${fmt(value)} points</title></rect><text class="metric-data-label" x="${x}" y="${Math.max(top-7,yy-8)}" text-anchor="middle">${fmt(value)}</text><text class="metric-axis-event" x="${x}" y="${h-17}" text-anchor="middle">${esc(shortEventLabel(event.event))}</text>`;
 }).join('');
 return `<div class="chart-axis-scroll player-axis-scroll"><svg class="metric-axis-chart player-axis-chart" style="min-width:${w}px" viewBox="0 0 ${w} ${h}" role="img" aria-label="Player points by scoring event with point values, event axis, and a zero-based numeric axis">
  <defs><linearGradient id="playerChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e9c66b"/><stop offset="1" stop-color="#a27d36"/></linearGradient></defs>
  ${ticks}
  <line class="metric-axis-line" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}"/>
  <line class="metric-axis-line" x1="${left}" y1="${bottom}" x2="${w-right}" y2="${bottom}"/>
  ${bars}
 </svg></div>`;
}

function playerView(id){
 const p=playerById(id); if(!p){dashboard();return}
 nav("");
 const recentEvent=p.events[p.events.length-1],previousEvent=p.events[p.events.length-2];
 const recentPoints=recentEvent?Number(recentEvent.points)||0:null;
 const previousEventPoints=previousEvent?Number(previousEvent.points)||0:null;
 const pointsDelta=previousEventPoints>0?100*(recentPoints-previousEventPoints)/previousEventPoints:null;
 const placements=p.events.map(e=>Number(e.rank)).filter(Number.isFinite);
 // Mutually exclusive placement tiers: 1st, 2nd, 3rd, 4th–5th, 6th–10th.
 const top1=placements.filter(r=>r===1).length;
 const top2=placements.filter(r=>r===2).length;
 const top3=placements.filter(r=>r===3).length;
 const top45=placements.filter(r=>r>=4 && r<=5).length;
 const top10=placements.filter(r=>r>=6 && r<=10).length;
 const momentum=playerMomentum(p);
 const momentumPanel=momentum?`<a href="#trends" class="card profile-trend-card interactive-card"><div><span class="kpi-label">Recent momentum · last 3 events vs prior 3</span><div class="trend-profile-value">${trendChange(momentum.pct)} <span class="muted">average points / event</span></div><span class="kpi-note">${fmt(momentum.prior)} → ${fmt(momentum.recent)} points · average rank ${avg(momentum.priorRank)} → ${avg(momentum.recentRank)} (lower is better)</span></div><span class="trend-promo-action">Explore all trends →</span></a>`:
 `<a href="#trends" class="card profile-trend-card interactive-card"><div><span class="kpi-label">Recent momentum</span><p class="muted">Available after 6 recorded event results. No trend classification yet.</p></div><span class="trend-promo-action">Trends overview →</span></a>`;
 app.innerHTML=`<section class="detail-head back-first"><button class="back" onclick="goBack('players')">← Back</button><div><div class="eyebrow">Player profile</div><h1>${esc(p.currentName)}</h1><p class="sub">${p.names.length>1?"Former names: "+esc(p.names.slice(0,-1).join(" → ")):"No recorded name changes"}</p></div></section>
 <section class="stat-grid">
   <div class="card"><div class="kpi-label">Total points</div><div class="kpi-value">${fmt(p.totalPoints)}</div></div>
   <div class="card"><div class="kpi-label">Average / event</div><div class="kpi-value">${fmt(p.averagePoints)}</div></div>
   <div class="card"><div class="kpi-label">Events participated</div><div class="kpi-value">${p.eventsParticipated}</div></div>
   <div class="card"><div class="kpi-label">Best event rank</div><div class="kpi-value">${p.bestRank??"—"}</div></div>
   <div class="card"><div class="kpi-label">Quests completed</div><div class="kpi-value">${fmt(p.questsCompleted)}</div></div>
   <div class="card"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(p.averagePPQ)}</div><div class="kpi-note">average across events</div></div>
 </section>
 ${momentumPanel}
  <section class="card performance-card"><div class="table-head compact"><h2>Performance badges</h2><span class="muted">exclusive placement tiers · all events</span></div><div class="performance-badges"><div class="performance-badge rank1"><span class="medal">👑</span><strong>${top1}</strong><span>1st place</span></div><div class="performance-badge rank2"><span class="medal">🥈</span><strong>${top2}</strong><span>2nd place</span></div><div class="performance-badge rank3"><span class="medal">🥉</span><strong>${top3}</strong><span>3rd place</span></div><div class="performance-badge rank45"><span class="medal">🏅</span><strong>${top45}</strong><span>4th–5th place</span></div><div class="performance-badge rank10"><span class="medal">⭐</span><strong>${top10}</strong><span>6th–10th place</span></div></div></section>
 <section class="grid two profile-content">
  <div class="card points-card"><div class="chart-metric-head"><h2>Points over time</h2>${trendMetricBadge(pointsDelta)}</div>
    <div class="player-points-summary"><strong>${recentPoints===null?'—':fmt(recentPoints)}</strong><span class="muted">points · ${esc(recentEvent?.event||'no event')}</span></div>
    ${playerPointsChart(p)}
    <div class="chart-metric-foot">Points by event</div></div>
  <div class="card"><h2>Name history</h2>${p.names.slice().reverse().map((n,i)=>`<div class="name-history-row"><span class="badge ${i===0?'current-name-badge':''}">${i===0?"Current":"Former"}</span> <strong>${esc(n)}</strong></div>`).join("")}</div>
 </section>
 <section class="card table-card" style="margin-top:16px"><div class="table-head"><h2>Event-by-event results</h2></div><div class="table-scroll"><table id="playerEventsTable" data-sort-col="0" data-sort-dir="desc"><thead><tr>${sortHead("Event","playerEventsTable",0,"number")}${sortHead("Rank","playerEventsTable",1,"number")}${sortHead("Points","playerEventsTable",2,"number")}${sortHead("Started","playerEventsTable",3,"number")}${sortHead("Completed","playerEventsTable",4,"number")}${sortHead("Pts/quest","playerEventsTable",5,"number")}</tr></thead><tbody>${playerRows(p)}</tbody></table></div></section>`;
}

function eventView(id){
 const e=eventById(id); if(!e){dashboard();return}
 nav("");
 const sorted=e.rows.slice().sort((a,b)=>a.rank-b.rank);
 const index=D.events.findIndex(ev=>ev.id===e.id),prev=D.events[index-1];
 const previousPoints=Number(prev?.alliancePoints)||0;
 const pointsDelta=prev&&previousPoints?100*(Number(e.alliancePoints)-previousPoints)/previousPoints:null;
 const ppqChange=prev?Number(e.averagePPQ)-Number(prev.averagePPQ):null;
 const eventTrendPanel=prev?`<a href="#trends" class="card event-trend-card interactive-card"><div><span class="kpi-label">Change vs. previous recorded event · ${esc(prev.name)}</span><div class="event-trend-metrics"><span>Alliance points ${trendChange(pointsDelta)}</span><span>Points / quest <strong>${ppqChange>=0?'+':''}${avg(ppqChange)}</strong></span></div></div><span class="trend-promo-action">Explore event trends →</span></a>`:
 `<a href="#trends" class="card event-trend-card interactive-card"><div><span class="kpi-label">Event trends</span><span class="muted">First recorded event · no earlier event available</span></div><span class="trend-promo-action">Trends overview →</span></a>`;
 app.innerHTML=`<section class="detail-head back-first"><button class="back" onclick="goBack('events')">← Back</button><div><div class="eyebrow">Event detail</div><h1>${esc(e.name)}</h1><p class="sub">${esc(e.start)} → ${esc(e.end)}</p></div></section>
 <section class="stat-grid">
  <div class="card"><div class="kpi-label">Alliance points</div><div class="kpi-value">${fmt(e.alliancePoints)}</div></div>
  <div class="card"><div class="kpi-label">Alliance rank</div><div class="kpi-value">${esc(e.allianceRank)}</div></div>
  <div class="card"><div class="kpi-label">Levels completed</div><div class="kpi-value">${e.level ?? "—"}</div></div>
  <div class="card"><div class="kpi-label">Minimum requirement</div><div class="kpi-value">${fmt(e.minimumPoints)}</div></div>
  <div class="card"><div class="kpi-label">Reward</div><div class="kpi-value" style="font-size:20px">${esc(e.reward)}</div></div>
  <div class="card"><div class="kpi-label">Ø points / quest</div><div class="kpi-value">${avg(e.averagePPQ)}</div><div class="kpi-note">all completed quests in this event</div></div>
 </section>
 ${eventTrendPanel}
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
function setPageTitle(label){document.title=label+' · Alliance Mobilization · Kingdom 3662';}
function route(){
 const h=location.hash.replace(/^#/,'');
 if(h.startsWith('player/')){
  const id=h.slice(7),player=playerById(id);
  if(player){playerView(id);setPageTitle('Player: '+player.currentName);}
  else{dashboard();setPageTitle('Dashboard');}
 }else if(h.startsWith('event/')){
  const id=h.slice(6),event=eventById(id);
  if(event){eventView(id);setPageTitle('Event: '+event.name);}
  else{dashboard();setPageTitle('Dashboard');}
 }else if(h==='players'){playersView();setPageTitle('Players');}
 else if(h==='events'){eventsView();setPageTitle('Events');}
 else if(h==='trends'){trendsView();setPageTitle('Trends');}
 else{dashboard();setPageTitle('Dashboard');}
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
 const link=e.target.closest('a[href^="#"],[onclick*="location.hash"],[onclick*="goBack"],.brand,.nav-btn');
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
