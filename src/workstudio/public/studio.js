"use strict";
const el=(id)=>document.getElementById(id);
const FALLBACK_AVATAR="/workstudio/assets/default-agent.png.png";
let registry={teams:{},agents:{}};
let roster=[],sessions=[],selection=null,teamFilter="all",source=null;
function safeAvatar(path){return typeof path==="string" && /^\/workstudio\/assets\/[a-zA-Z0-9_.-]+\.(png|webp|jpg|jpeg|svg)$/.test(path)?path:FALLBACK_AVATAR;}
function mk(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
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
 const identity=mk("div","detail-identity");const avatar=mk("img","detail-avatar");avatar.src=safeAvatar(registry.agents?.[a.agentId]?.avatar);avatar.alt="";avatar.onerror=()=>{if(!avatar.src.endsWith(FALLBACK_AVATAR))avatar.src=FALLBACK_AVATAR;};const names=mk("div");names.append(mk("div","detail-name",a.name||a.agentId),mk("div","detail-sub",a.agentId));identity.append(avatar,names);root.append(identity,mk("span","detail-state",state(a)));
 const dl=mk("dl","detail-rows");const info=activities(a.agentId);
 row(dl,"團隊",teamName(agentTeam(a)));row(dl,"角色",agentRole(a)==="coordinator"?"主控 Agent":"團隊成員");row(dl,"模型",a.model||"未提供");row(dl,"工作區",a.workspace||"未提供");row(dl,"最後互動",formatTime(info.interactionAt));row(dl,"最後自動化",formatTime(info.automationAt));row(dl,"互動階段",String(info.interactions.length));row(dl,"自動化階段",String(info.automations.length));
 root.append(dl);
}
function renderPins(){
 const root=el("agentPins");root.replaceChildren();
 for(const a of roster){const conf=registry.agents?.[a.agentId]||{};const pos=conf.scene;
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))continue;
 if(teamFilter!=="all"&&agentTeam(a)!==teamFilter)continue;
 const pin=mk("button","agent-pin "+(a.status==="working"?"working":a.status==="error"?"error":"idle")+(agentRole(a)==="coordinator"?" coordinator":"")+(selection===a.agentId?" selected":""));
 pin.type="button";pin.style.left=Math.max(5,Math.min(95,pos.x))+"%";pin.style.top=Math.max(12,Math.min(93,pos.y))+"%";pin.setAttribute("aria-label",`${a.name||a.agentId}，${teamName(agentTeam(a))}，${state(a)}，點選查看詳細資訊`);
 const avatar=mk("img","pin-avatar");avatar.src=safeAvatar(conf.avatar);avatar.alt="";avatar.loading="lazy";avatar.onerror=()=>{if(!avatar.src.endsWith(FALLBACK_AVATAR))avatar.src=FALLBACK_AVATAR;};
 pin.append(avatar,mk("span","pin-name",a.name||a.agentId));const stat=mk("span","pin-status");stat.append(mk("i","pin-dot"),document.createTextNode(state(a)));pin.append(stat);
 if(agentRole(a)==="coordinator")pin.append(mk("span","pin-badge","主控"));
 pin.addEventListener("click",()=>{selection=a.agentId;renderPins();renderDetail();});
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
 if(unplaced.length){const block=mk("div","unplaced-agents");block.append(mk("p","muted","尚未配置場景位置的 Agent（仍可查看）："));for(const a of unplaced){const b=mk("button","filter-btn",a.name||a.agentId);b.type="button";b.addEventListener("click",()=>{selection=a.agentId;renderDetail();renderPins();});block.append(b);}root.append(block);}
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
loadRegistry().then(connect);
