"use strict";
const el=(id)=>document.getElementById(id);
const FALLBACK_AVATAR="/workstudio/assets/default-agent.png.png";
let registry={teams:{},agents:{}};
let roster=[],sessions=[],selection=null,teamFilter="all",source=null;
let activeView="workroom";
const decisionDefault="目前尚未連接可驗證的待決策資料來源；不顯示模擬事項。";
function toggleMobilePanel(open){
 const sidebar=el("studioSidebar"),backdrop=el("mobileBackdrop");
 sidebar.classList.toggle("mobile-open",open);
 backdrop.hidden=!open;
 document.body.classList.toggle("mobile-panel-open",open);
}
function setActiveView(view){
 activeView=view;
 document.querySelectorAll(".rail-action").forEach(button=>{
  const current=button.dataset.view===view;
  button.classList.toggle("active",current);
  if(current)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
 });
}
function showPanel(view){
 if(view==="workroom"){setActiveView("workroom");toggleMobilePanel(false);return;}
 const target=view==="teams"?"teamPanel":view==="records"?"activityPanel":view==="profile"?"profilePanel":"decisionPanel";
 setActiveView(view==="profile"?"workroom":view);
 if(view==="tasks")el("decisionSummary").textContent=decisionDefault;
 if(view==="settings")el("decisionSummary").textContent="工作室設定介面尚未整合。本頁不會修改 OpenClaw、Gateway 或 Railway 設定。";
 if(view==="records"){toggleMobilePanel(false);el("activityPanel").classList.remove("collapsed");el("activityToggle").textContent="−";el("activityToggle").setAttribute("aria-expanded","true");el("activityToggle").setAttribute("aria-label","收合活動日誌");el("activityToggle").focus();return;}
 toggleMobilePanel(true);
 if(window.matchMedia("(max-width: 780px)").matches){const panel=el("studioSidebar");const item=el(target);panel.scrollTop=item.offsetTop-panel.offsetTop;}
}
function openDrawer(mode){showPanel(mode==="agent"?"profile":mode==="sessions"?"records":"teams");}
function closeDrawer(){toggleMobilePanel(false);}
function toggleActivity(){
 const panel=el("activityPanel"),button=el("activityToggle");
 const collapsed=panel.classList.toggle("collapsed");
 button.textContent=collapsed?"+":"−";
 button.setAttribute("aria-expanded",String(!collapsed));
 button.setAttribute("aria-label",collapsed?"展開活動日誌":"收合活動日誌");
}
function initDrawers(){
 document.querySelectorAll(".rail-action").forEach(button=>button.addEventListener("click",()=>showPanel(button.dataset.view)));
 el("openTeams").addEventListener("click",()=>showPanel("teams"));
 el("openSettings").addEventListener("click",()=>showPanel("settings"));
 el("mobileBackdrop").addEventListener("click",closeDrawer);
 el("closeMobilePanel").addEventListener("click",closeDrawer);
 el("activityToggle").addEventListener("click",toggleActivity);
 document.addEventListener("keydown",event=>{if(event.key==="Escape")closeDrawer();});
}
function safeAvatar(path){return typeof path==="string" && /^\/workstudio\/assets\/[a-zA-Z0-9_.-]+\.(png|webp|jpg|jpeg|svg)$/.test(path)?path:FALLBACK_AVATAR;}
function mk(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
/* Default avatars are static character illustrations. Explicit registry.avatar paths override them. */
const CHARACTER_PALETTES=[
 ["#e49e6d","#563b4b","#b95457","#fff0d8"],["#d9a684","#493647","#5e8b9b","#fff3d6"],
 ["#e7b190","#ad7440","#9573a3","#fff0dc"],["#c98b6e","#2c384b","#5b967e","#ffe8cf"],
 ["#dd997d","#744a3a","#d1824b","#fff1dc"],["#d8a18a","#454f73","#6d89b7","#fff2de"],
 ["#edaf85","#465c5e","#a36d6f","#fcebd8"],["#c99079","#493a53","#698a71","#ffe5ca"]
];
function characterPalette(agentId){let n=0;for(const ch of String(agentId))n=((n*31)+ch.charCodeAt(0))>>>0;return CHARACTER_PALETTES[n%CHARACTER_PALETTES.length];}
function characterMarkup(agentId){
 const [skin,hair,shirt,light]=characterPalette(agentId);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 112" aria-hidden="true" shape-rendering="crispEdges">
 <ellipse cx="48" cy="106" rx="26" ry="5" fill="#071422" opacity=".45"/>
 <path d="M29 84h38v15H29z" fill="${shirt}"/><path d="M35 94h10v12H31V96zM53 94h10v12H51z" fill="#293d52"/>
 <path d="M25 68h46v27H25z" fill="${shirt}"/><path d="M25 70h8v24h-8zM63 70h8v24h-8z" fill="#182e40" opacity=".3"/>
 <path d="M19 74h9v19h-9zM68 74h9v19h-9z" fill="${skin}"/>
 <path d="M42 67h12v11H42z" fill="${skin}"/><path d="M35 72l13 8 13-8" fill="none" stroke="${light}" stroke-width="3"/>
 <path d="M25 26h46v30H25z" fill="${hair}"/><path d="M29 30h38v38H29z" fill="${skin}"/>
 <path d="M26 24h44v12H26zM23 34h11v16H23zM65 34h9v16h-9z" fill="${hair}"/>
 <path d="M32 20h34v9H32zM40 15h20v7H40z" fill="${hair}"/>
 <path d="M27 47h6v11h-6zM64 47h6v11h-6z" fill="${skin}"/>
 <path d="M35 46h9v5h-9zM53 46h9v5h-9z" fill="#263442"/><path d="M39 46h3v3h-3zM57 46h3v3h-3z" fill="#ffffff"/>
 <path d="M44 59h10v3H44z" fill="#a46c67"/><path d="M33 54h6v3h-6zM59 54h6v3h-6z" fill="#d98d84" opacity=".6"/>
 <path d="M29 29h8v8h-8zM59 29h8v8h-8z" fill="${hair}"/>
 <path d="M25 69h46" fill="none" stroke="#162f3b" stroke-width="3"/>
 </svg>`;
}
function characterNode(agent,cls){
 const conf=registry.agents?.[agent.agentId]||{};
 const wrap=mk("span",cls+" character-portrait");
 if(conf.avatar && safeAvatar(conf.avatar)!==FALLBACK_AVATAR){
   const img=mk("img","character-custom");img.src=safeAvatar(conf.avatar);img.alt="";
   img.onerror=()=>{img.remove();wrap.innerHTML=characterMarkup(agent.agentId);};
   wrap.append(img);
 }else{wrap.innerHTML=characterMarkup(agent.agentId);}
 wrap.setAttribute("aria-hidden","true");
 return wrap;
}

function stamp(s){for(const raw of [s.lastInteractionAt,s.lastActivityAt,s.updatedAt,s.lastMessageAt,s.createdAt]){if(raw==null)continue;const n=typeof raw==="number"?raw:Date.parse(raw);if(Number.isFinite(n))return n;}return null;}
function formatTime(t){if(!t)return "尚無紀錄";const n=new Date(t);return isNaN(n.getTime())?"未提供":new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(n);}
function agentForSession(s){return s.agentId||/^agent:([^:]+):/.exec(String(s.key||""))?.[1]||null;}
function automation(s){return s.kind==="cron"||String(s.key||"").includes(":cron:");}
function agentTeam(a){return a.team||registry.agents?.[a.agentId]?.team||"unassigned";}
function agentRole(a){return registry.agents?.[a.agentId]?.role||"member";}
function teamName(id){return id==="unassigned"?"未分組":registry.teams?.[id]?.name||id;}
function state(a){return a.status==="working"?"執行中":a.status==="error"?"錯誤":"閒置";}
function activities(id){const related=sessions.filter(s=>agentForSession(s)===id);const last=(rows)=>{const ts=rows.map(stamp).filter(x=>x!=null);return ts.length?Math.max(...ts):null;};return {interactions:related.filter(s=>!automation(s)),automations:related.filter(automation),interactionAt:last(related.filter(s=>!automation(s))),automationAt:last(related.filter(automation))};}
function row(dl,label,value){const wrap=mk("div","detail-row");wrap.append(mk("dt","",label),mk("dd","",value));dl.append(wrap);}
function renderDetail(){
 const root=el("agentDetail");root.replaceChildren();
 const a=roster.find(a=>a.agentId===selection);
 if(!a){root.append(mk("p","muted","點選場景中的 Agent 查看詳細資訊。"));return;}
 const identity=mk("div","detail-identity");const avatar=characterNode(a,"detail-avatar");const names=mk("div");names.append(mk("div","detail-name",a.name||a.agentId),mk("div","detail-sub",a.agentId));identity.append(avatar,names);root.append(identity,mk("span","detail-state",state(a)));
 const dl=mk("dl","detail-rows");const info=activities(a.agentId);
 row(dl,"團隊",teamName(agentTeam(a)));row(dl,"角色",agentRole(a)==="coordinator"?"主控 Agent":"團隊成員");row(dl,"模型",a.model||"未提供");row(dl,"工作區",a.workspace||"未提供");row(dl,"最後互動",formatTime(info.interactionAt));row(dl,"最後自動化",formatTime(info.automationAt));row(dl,"互動工作階段",String(info.interactions.length));row(dl,"自動化工作階段",String(info.automations.length));
 root.append(dl);
}
function renderPins(){
 const root=el("agentPins");root.replaceChildren();
 for(const a of roster){const conf=registry.agents?.[a.agentId]||{};const pos=conf.scene;
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))continue;
 if(teamFilter!=="all"&&agentTeam(a)!==teamFilter)continue;
 const pin=mk("button","agent-pin "+(a.status==="working"?"working":a.status==="error"?"error":"idle")+(agentRole(a)==="coordinator"?" coordinator":"")+(selection===a.agentId?" selected":""));
 pin.type="button";pin.style.left=Math.max(5,Math.min(95,pos.x))+"%";pin.style.top=Math.max(12,Math.min(93,pos.y))+"%";pin.setAttribute("aria-label",`${a.name||a.agentId}，${teamName(agentTeam(a))}，${state(a)}，點選查看詳細資訊`);
 const avatar=characterNode(a,"pin-avatar");
 pin.append(avatar,mk("span","pin-name",a.name||a.agentId));const stat=mk("span","pin-status");stat.append(mk("i","pin-dot"),document.createTextNode(state(a)));pin.append(stat);
 if(agentRole(a)==="coordinator")pin.append(mk("span","pin-badge","主控"));
 pin.addEventListener("click",()=>{selection=a.agentId;renderPins();renderDetail();openDrawer("agent");});
 root.append(pin);
 }
}
function renderFilters(){
 const root=el("teamFilters");root.replaceChildren();const ids=["all",...new Set(roster.map(agentTeam))];
 for(const id of ids){const b=mk("button","filter-btn",id==="all"?"全部團隊":teamName(id));b.type="button";b.setAttribute("aria-pressed",String(id===teamFilter));b.onclick=()=>{teamFilter=id;renderFilters();renderPins();};root.append(b);}
}
function renderTeams(){
 const root=el("teamSummary");root.replaceChildren();const ids=[...new Set(roster.map(agentTeam))];
 for(const id of ids){const rows=roster.filter(a=>agentTeam(a)===id);const w=mk("div","team-row");const text=mk("div");text.append(mk("span","team-title",teamName(id)),mk("small","",rows.some(a=>a.status==="working")?"有 Agent 執行中":"目前無執行中 Agent"));w.append(text,mk("span","team-num",rows.length+" 位"));root.append(w);}
 const unplaced=roster.filter(a=>!registry.agents?.[a.agentId]?.scene);
 if(unplaced.length){const block=mk("div","unplaced-agents");block.append(mk("p","muted","尚未配置場景位置的 Agent（仍可查看）："));for(const a of unplaced){const b=mk("button","filter-btn",a.name||a.agentId);b.type="button";b.addEventListener("click",()=>{selection=a.agentId;renderDetail();renderPins();openDrawer("agent");});block.append(b);}root.append(block);}
 if(!ids.length)root.append(mk("p","muted","尚未收到團隊資料。"));
 el("worldSummary").textContent=`目前 ${ids.length} 組團隊 · ${roster.length} 位 Agent · 點選查看`;
}
function renderSessions(){
 const root=el("recentSessions");root.replaceChildren();const ordered=[...sessions].sort((a,b)=>(stamp(b)||0)-(stamp(a)||0)).slice(0,6);
 for(const s of ordered){const w=mk("div","session-row");w.append(mk("div","",s.label||s.key||s.id||"未命名工作階段"));w.append(mk("div","session-meta",`${automation(s)?"自動化":"互動"} · ${agentForSession(s)||"未知 Agent"} · ${formatTime(stamp(s))}`));root.append(w);}
 if(!ordered.length)root.append(mk("p","muted","目前沒有可顯示的工作階段。"));
}
function renderAll(){if(selection&&!roster.some(a=>a.agentId===selection))selection=null;if(!selection)selection=roster.find(a=>agentRole(a)==="coordinator")?.agentId||roster[0]?.agentId||null;renderFilters();renderPins();renderDetail();renderTeams();renderSessions();}
async function loadRegistry(){try{const response=await fetch("/workstudio/registry.json",{cache:"no-store"});if(!response.ok)throw new Error("registry");const data=await response.json();registry={teams:data.teams||{},agents:data.agents||{}};}catch{registry={teams:{},agents:{}};}}
function connect(){source?.close();source=new EventSource("/workstudio/api/events");const connection=el("connection");source.addEventListener("gateway-state",event=>{try{const data=JSON.parse(event.data||"{}");roster=Array.isArray(data.agents)?data.agents:[];sessions=Array.isArray(data.sessions)?data.sessions:[];connection.textContent=data.connected&&data.subscribed?"已連線":"連線中";connection.className="connection"+(data.connected&&data.subscribed?" online":"");renderAll();}catch{connection.textContent="資料解析失敗";connection.className="connection error";}});source.addEventListener("gateway-error",()=>{connection.textContent="Gateway 錯誤";connection.className="connection error";});source.onerror=()=>{if(document.visibilityState!=="hidden"){connection.textContent="重新連線中";connection.className="connection";}};}
function disconnect(){if(source){source.close();source=null;}}
window.addEventListener("pagehide",disconnect);window.addEventListener("beforeunload",disconnect);
initDrawers();
loadRegistry().then(connect);
