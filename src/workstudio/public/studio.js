"use strict";
const el=(id)=>document.getElementById(id);
const FALLBACK_AVATAR="/workstudio/assets/default-agent.png.png";
let registry={teams:{},agents:{}};
let roster=[],sessions=[],selection=null,teamFilter="all",source=null;
let activeView="workroom";
const decisionDefault="目前尚未連接可驗證的待決策資料來源；不顯示模擬事項。";
// UI is part of the same scene, not a viewport-fixed drawer.
function toggleMobilePanel(_open){
 el("openProfile").setAttribute("aria-expanded","true");
}
function setActiveView(view){
 activeView=view;
 document.querySelectorAll(".rail-action").forEach(button=>{
  const current=button.dataset.view===view;
  button.classList.toggle("active",current);
  if(current)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
 });
}
function sceneGoTo(id){
 const root=el("worldStage").closest(".world-scroll"),target=el(id);
 if(!root||!target)return;
 const area=root.getBoundingClientRect(),box=target.getBoundingClientRect();
 const nextLeft=root.scrollLeft+box.left-area.left;
 const nextTop=root.scrollTop+box.top-area.top;
 root.scrollTo({left:Math.max(0,nextLeft-20),top:Math.max(0,nextTop-18),behavior:"auto"});
}
function showPanel(view){
 if(view==="tasks")el("decisionSummary").textContent=decisionDefault;
 if(view==="settings")el("decisionSummary").textContent="工作室設定介面尚未整合。本頁不會修改 OpenClaw、Gateway 或 Railway 設定。";
 const target={workroom:"officeFloor",profile:"profilePanel",teams:"teamPanel",
   tasks:"decisionPanel",settings:"decisionPanel",records:"chatBoard"}[view]||"officeFloor";
 setActiveView(view==="profile"?"workroom":view);
 sceneGoTo(target);
}
function openDrawer(mode){showPanel(mode==="agent"?"profile":mode==="sessions"?"records":"teams");}
function closeDrawer(){setActiveView("workroom");}
function toggleActivity(){
 const panel=el("activityPanel"),button=el("activityToggle");
 const collapsed=panel.classList.toggle("collapsed");
 button.textContent=collapsed?"+":"−";
 button.setAttribute("aria-expanded",String(!collapsed));
 button.setAttribute("aria-label",collapsed?"展開活動日誌":"收合活動日誌");
}
function initDrawers(){
 document.querySelectorAll(".rail-action").forEach(button=>button.addEventListener("click",()=>showPanel(button.dataset.view)));
 el("openChat").addEventListener("click",()=>showPanel("records"));
 el("openProfile").addEventListener("click",()=>showPanel("profile"));
 el("openTeams").addEventListener("click",()=>showPanel("teams"));
 el("openSettings").addEventListener("click",()=>showPanel("settings"));
 el("mobileBackdrop").addEventListener("click",closeDrawer);
 el("closeMobilePanel").addEventListener("click",closeDrawer);
 el("closeInspector").addEventListener("click",closeDrawer);
 el("worldStage").addEventListener("click",(event)=>{if(!event.target.closest(".agent-pin"))closeDrawer();});
 el("activityToggle").addEventListener("click",toggleActivity);
 el("shuffleChat").addEventListener("click",buildDemoChat);
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


// All messages below are static, illustrative text, never Agent output.
const DEMO_LINES={
 "main":["大家有新的想法可以先貼在布告欄，我們一起看看。","先把想法整理清楚，接下來就容易討論了。","工作室今天想聊些什麼主題呢？"],
 "designer":["我喜歡保留空白，讓畫面有呼吸的空間。","配色如果更協調，整個作品會更有性格。","我在想，能不能讓操作介面更直覺一些？"],
 "brand":["品牌的個性應該能從每個小細節感受到。","一個好名稱，會讓故事更容易被記住。","比起跟風，我更喜歡建立自己的識別感。"],
 "copywriter":["有時候一句簡單的話，比長篇介紹更有力量。","換個說法，可能就能找到新的靈感。","今天的文字想走溫暖還是俐落路線？"],
 "researcher":["先弄清楚問題，再決定怎麼找答案。","不同來源的看法，也許能拼出更完整的輪廓。","我喜歡提出問題，因為問題常常帶來新方向。"],
 "technical":["結構越簡單，通常越容易維護。","好的系統應該讓使用者感覺不到背後的複雜。","先確認資料來源，再來討論畫面怎麼呈現。"],
 "critic":["我想先找出不夠清楚的地方。","如果使用情境改變，這個方案還成立嗎？","多問一個為什麼，可能就能少走一些彎路。"],
 "producer":["把想法變成可執行的步驟，才會真正往前走。","先完成可以驗證的部分，再慢慢打磨細節。","我偏好先把交付標準說清楚。"],
 "market-scout":["從不同市場觀察，常常能發現有趣的差異。","新的趨勢值得看，但適不適合自己更重要。","有些靈感來自觀察日常的小事。"],
 "finance-main":["把資料整理清楚，討論起來就會更安心。","每項收支都應該有能追溯的依據。","財務資訊應該清晰，而不是只有一堆數字。"],
 "bookkeeper":["清楚的分類，能讓日後查找方便很多。","記錄得好，整理時就不需要猜測。","我喜歡一致又容易理解的紀錄方式。"],
 "finance-auditor":["先確認每筆資料的來源，再來判斷是否合理。","核對時要注意容易被忽略的小細節。","能回頭查證的資料，才讓人更放心。"]
};
const GENERAL_DEMO_LINES=["大家好，我來布告欄留下我的想法。","有新的點子，歡迎一起交流。","期待和團隊分享更多觀察。"];
let demoRosterSignature="";
let demoLinesCache=[];
function shuffleList(array){
 const values=[...array];
 for(let i=values.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [values[i],values[j]]=[values[j],values[i]];
 }
 return values;
}
function buildDemoChat(){
 demoLinesCache=shuffleList(roster.map(agent=>{
  const possibilities=DEMO_LINES[agent.agentId]||GENERAL_DEMO_LINES;
  return {agent,message:possibilities[Math.floor(Math.random()*possibilities.length)]};
 }));
 demoRosterSignature=roster.map(a=>a.agentId).sort().join("|");
 renderDemoChat();
}
function renderDemoChat(){
 const root=el("demoChat");
 if(!root)return;
 root.replaceChildren();
 if(!demoLinesCache.length){
  root.append(mk("p","muted","目前尚未取得 Agent 名單，沒有展示對話。"));
  return;
 }
 demoLinesCache.forEach(({agent,message},index)=>{
  const note=mk("article","demo-note");
  note.style.setProperty("--note-tilt",["-1deg",".6deg","1deg","-.5deg"][index%4]);
  const head=mk("div","demo-note-head");
  const portrait=characterNode(agent,"demo-note-avatar");
  const identity=mk("div");
  identity.append(mk("span","demo-note-name",agent.name||agent.agentId),mk("small","demo-note-team",teamName(agentTeam(agent))));
  head.append(portrait,identity);
  note.append(head,mk("p","demo-note-message",message),mk("small","demo-note-label","展示對話 · 非 Agent 實際訊息"));
  root.append(note);
 });
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
function renderAll(){if(selection&&!roster.some(a=>a.agentId===selection))selection=null;if(!selection)selection=roster.find(a=>agentRole(a)==="coordinator")?.agentId||roster[0]?.agentId||null;renderFilters();renderPins();renderDetail();renderTeams();renderSessions();const signature=roster.map(a=>a.agentId).sort().join("|");if(signature!==demoRosterSignature)buildDemoChat();}
async function loadRegistry(){try{const response=await fetch("/workstudio/registry.json",{cache:"no-store"});if(!response.ok)throw new Error("registry");const data=await response.json();registry={teams:data.teams||{},agents:data.agents||{}};}catch{registry={teams:{},agents:{}};}}
function connect(){source?.close();source=new EventSource("/workstudio/api/events");const connection=el("connection");source.addEventListener("gateway-state",event=>{try{const data=JSON.parse(event.data||"{}");roster=Array.isArray(data.agents)?data.agents:[];sessions=Array.isArray(data.sessions)?data.sessions:[];connection.textContent=data.connected&&data.subscribed?"已連線":"連線中";connection.className="connection"+(data.connected&&data.subscribed?" online":"");renderAll();}catch{connection.textContent="資料解析失敗";connection.className="connection error";}});source.addEventListener("gateway-error",()=>{connection.textContent="Gateway 錯誤";connection.className="connection error";});source.onerror=()=>{if(document.visibilityState!=="hidden"){connection.textContent="重新連線中";connection.className="connection";}};}
function disconnect(){if(source){source.close();source=null;}}
window.addEventListener("pagehide",disconnect);window.addEventListener("beforeunload",disconnect);
initDrawers();
loadRegistry().then(connect);
