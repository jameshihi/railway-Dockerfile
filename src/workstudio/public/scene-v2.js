"use strict";
const $=id=>document.getElementById(id);
const avatarBase="/workstudio/assets/";
let reg={teams:{},agents:{}}, roster=[], sessions=[], selected=null, eventStream=null;
const demoTexts={
 main:["先把資訊整理清楚，再決定接下來的方向。","歡迎大家在工作室分享新的想法。"],
 designer:["我想讓每個畫面都更直覺、更有一致性。","這個配色如果再調整，場景會更舒服。"],
 brand:["好的品牌識別應該融入每個細節。","我們可以先確認整體調性。"],
 copywriter:["我想試試更簡潔、卻有故事感的文字。","有些話換個表達就很不一樣。"],
 researcher:["我會先比較不同觀點，再整理結論。","提出好的問題，是研究的起點。"],
 technical:["保持結構簡單，未來才好維護。","資料來源需要明確而且可靠。"],
 critic:["我想先看看這個方案有哪些風險。","我們也要確認最容易忽略的情境。"],
 producer:["先建立可驗證的成果，再逐步完善。","我偏好具體、可交付的工作流程。"],
 "market-scout":["觀察市場變化，也要理解使用情境。","有些靈感藏在競品的小細節裡。"],
 "finance-main":["財務資訊要清楚，也要能夠追溯來源。","先確認收支依據，避免憑印象判斷。"],
 bookkeeper:["分類一致，後續整理會更方便。","每筆紀錄都應該有清楚的日期。"],
 "finance-auditor":["我會留意紀錄之間有沒有矛盾。","核對資料時，細節尤其重要。"]
};
const genericTexts=["大家好，這裡是工作室的展示留言。","期待與團隊交流新的想法。"];
function elem(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;}
function team(id){const key=reg.agents[id]?.team;return reg.teams[key]?.name||key||"未分組";}
function status(a){return a.status==="working"?"執行中":a.status==="error"?"錯誤":"閒置";}
function palette(id){const cs=["#b65065","#6a95bd","#bf865c","#a873b0","#659988","#cf8d73","#8c87c0","#bd9f5a"];let n=0;for(const ch of id)n=(n*31+ch.charCodeAt(0))>>>0;return cs[n%cs.length];}
function characterSVG(id){const shirt=palette(id);return `<svg viewBox="0 0 88 96" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">
<ellipse cx="44" cy="92" rx="28" ry="4" fill="#1f1826" opacity=".35"/>
<path fill="#252e47" d="M25 79h16v14H25zM47 79h16v14H47z"/>
<path fill="${shirt}" d="M20 63h48v21H20z"/>
<path fill="#f0bc92" d="M14 69h8v16h-8zM66 69h8v16h-8zM37 58h14v14H37z"/>
<path fill="#f2bf98" d="M24 24h40v39H24z"/>
<path fill="#3b303f" d="M19 21h50v18h-8v-5H28v5h-9zM27 14h34v11H27zM24 36h7v12h-7zM61 36h7v12h-7z"/>
<path fill="#223142" d="M30 44h10v5H30zM49 44h10v5H49z"/>
<path fill="#fff7e5" d="M35 44h3v3h-3zM54 44h3v3h-3z"/>
<path fill="#b97473" d="M40 56h9v3h-9z"/>
<path fill="#d9d8c5" d="M35 66h18l-9 9z"/>
<path fill="#392b3b" d="M21 80h45v4H21z"/>
</svg>`;}
function avatarNode(id,cls){const box=elem("span",cls);const p=reg.agents[id]?.avatar;
 if(typeof p==="string"&&/^\/workstudio\/assets\/[\w.-]+\.(png|jpg|jpeg|webp|svg)$/.test(p)){
  const img=elem("img");img.src=p;img.alt="";img.onerror=()=>{box.innerHTML=characterSVG(id);};box.append(img);
 }else box.innerHTML=characterSVG(id);
 return box;
}
function placeCharacters(){
 const root=$("scenePeople");root.replaceChildren();
 for(const a of roster){
  const p=reg.agents[a.agentId]?.sceneV2;
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
  const b=elem("button","character"+(reg.agents[a.agentId]?.role==="coordinator"?" character-coordinator":"")+(selected===a.agentId?" is-selected":""));
  b.type="button";b.style.left=p.x+"px";b.style.top=p.y+"px";b.dataset.state=a.status||"idle";
  b.setAttribute("aria-label",`${a.name||a.agentId}，${team(a.agentId)}，${status(a)}，點擊查看`);
  b.append(avatarNode(a.agentId,"character-art"),elem("span","character-name",a.name||a.agentId),elem("span","character-status",status(a)));
  b.addEventListener("click",()=>{selected=a.agentId;renderDetail();placeCharacters();markNav(null);});
  root.append(b);
 }
}
function row(dl,key,val){dl.append(elem("dt","",key),elem("dd","",val??"未提供"));}
function renderDetail(){
 const root=$("profileBody");root.replaceChildren();
 const a=roster.find(x=>x.agentId===selected);
 if(!a){root.append(elem("p","notice","請點選場景中的 Agent 人物。"));return;}
 const header=elem("div","profile-identity");
 const avatar=avatarNode(a.agentId,"profile-image");const title=elem("div");
 title.append(elem("div","profile-name",a.name||a.agentId),elem("div","profile-role",reg.agents[a.agentId]?.role==="coordinator"?"♛ 主控 Agent":"團隊成員"));
 header.append(avatar,title);root.append(header,elem("div","profile-state",status(a)));
 const dl=elem("dl","profile-meta");
 row(dl,"團隊",team(a.agentId));row(dl,"模型",a.model||"未提供");row(dl,"工作區",a.workspace||"未提供");row(dl,"階段",a.sessionCount==null?"未提供":String(a.sessionCount));
 root.append(dl);
}
function renderTeams(){
 const root=$("teamBoard");root.replaceChildren();
 const ids=[...new Set(roster.map(a=>reg.agents[a.agentId]?.team||"unassigned"))];
 for(const id of ids){
  const members=roster.filter(a=>(reg.agents[a.agentId]?.team||"unassigned")===id);
  const box=elem("div","team-group"),names=elem("div","members",members.map(a=>a.name||a.agentId).join(" · "));
  box.append(elem("strong","",reg.teams[id]?.name||id),elem("small","",members.find(a=>reg.agents[a.agentId]?.role==="coordinator")?.agentId||"主控未提供"),names);root.append(box);
 }
 if(!ids.length)root.append(elem("p","notice","尚未取得團隊資料。"));
}
let demoItems=[],lastRosterSignature="";
function shuffleDemo(){
 demoItems=roster.map(a=>{const arr=demoTexts[a.agentId]||genericTexts;return {id:a.agentId,name:a.name||a.agentId,message:arr[Math.floor(Math.random()*arr.length)]};});
 for(let i=demoItems.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[demoItems[i],demoItems[j]]=[demoItems[j],demoItems[i]];}
 renderChat();
}
function renderChat(){
 const root=$("demoChat");root.replaceChildren();
 if(!demoItems.length){root.append(elem("p","notice","尚未取得 Agent 名單。"));return;}
 for(const item of demoItems){const line=elem("div","chat-line");line.append(elem("b","",item.name),elem("span","",item.message));root.append(line);}
}
function render(){
 if(selected&&!roster.some(a=>a.agentId===selected))selected=null;
 if(!selected)selected=roster.find(a=>reg.agents[a.agentId]?.role==="coordinator")?.agentId||roster[0]?.agentId||null;
 placeCharacters();renderDetail();renderTeams();
 const signature=roster.map(a=>a.agentId).sort().join("|");
 if(signature!==lastRosterSignature){lastRosterSignature=signature;shuffleDemo();}
}
function markNav(id){document.querySelectorAll(".station-btn").forEach(b=>b.classList.toggle("selected",b.id===id));}
function highlight(id){const screen=$(id);screen?.scrollIntoView({block:"nearest",inline:"nearest",behavior:"auto"});}
function actions(){
 $("navHome").onclick=()=>{markNav("navHome");highlight("scene");};
 $("navTeam").onclick=()=>{markNav("navTeam");highlight("teamScreen");};
 $("navChat").onclick=()=>{markNav("navChat");highlight("chatScreen");};
 $("navTasks").onclick=()=>{markNav("navTasks");highlight("decisionScreen");};
 $("navSettings").onclick=()=>{$("sceneHint").textContent="目前尚未開放設定操作，現有系統設定不會被更動。";markNav("navSettings");};

 $("chatRefresh").onclick=shuffleDemo;
}
function updateSceneClock(){
 const node=$("sceneClock");if(!node)return;
 const date=new Date();
 const format=new Intl.DateTimeFormat("zh-TW",{
   timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",
   hour:"2-digit",minute:"2-digit",hour12:false
 });
 node.dateTime=date.toISOString();
 node.textContent="台灣時間  "+format.format(date).replaceAll("/","-");
}
function resize(){
 const v=$("studioViewport"),stage=$("scene"),doc=$("studioDocument");
 const width=v.clientWidth||window.innerWidth;
 const scale=Math.max(.66,Math.min(1,width/1600));
 stage.style.transform=`scale(${scale})`;
 doc.style.width=(1600*scale)+"px";doc.style.height=(980*scale)+"px";
}
async function start(){
 actions();resize();window.addEventListener("resize",resize);
 updateSceneClock();
 window.addEventListener("visibilitychange",()=>{if(!document.hidden)updateSceneClock();});
 window.setInterval(()=>{if(!document.hidden)updateSceneClock();},60_000);
 try{const r=await fetch("/workstudio/registry.json",{cache:"no-store"});if(r.ok){const data=await r.json();reg={agents:data.agents||{},teams:data.teams||{}};}}catch{ /* errors display as empty roster */ }
 eventStream=new EventSource("/workstudio/api/events");
 eventStream.addEventListener("gateway-state",e=>{
  try{const d=JSON.parse(e.data||"{}");roster=Array.isArray(d.agents)?d.agents:[];sessions=Array.isArray(d.sessions)?d.sessions:[];
   const badge=$("connection");badge.textContent=d.connected&&d.subscribed?"● 已連線":"連線中";badge.className="online-chip"+(d.connected&&d.subscribed?" online":"");render();
  }catch{$("connection").textContent="資料錯誤";$("connection").className="online-chip error";}
 });
 eventStream.addEventListener("gateway-error",()=>{$("connection").textContent="Gateway 錯誤";$("connection").className="online-chip error";});
 eventStream.onerror=()=>{if(document.visibilityState==="visible")$("connection").textContent="重新連線中";};
}
function shutdown(){eventStream?.close();eventStream=null;}
window.addEventListener("pagehide",shutdown);
window.addEventListener("beforeunload",shutdown);
start();
