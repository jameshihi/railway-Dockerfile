document.documentElement.dataset.workstudio = "v1";

const statusEl = document.getElementById("systemStatus");
const summaryEl = document.getElementById("snapshotSummary");
const agentListEl = document.getElementById("agentList");
const sessionListEl = document.getElementById("sessionList");

let eventSource = null;
let registry = { teams: {}, agents: {} };

function sessionState(session) {
  if (session.hasActiveRun || session.running === true) return "執行中";
  if (session.queued === true) return "排隊中";
  const state = String(session.status || session.state || "").toLowerCase();
  if (["error", "failed", "failure"].includes(state)) return "錯誤";
  return "閒置";
}

function agentStatusLabel(status) {
  const value = String(status || "idle").toLowerCase();
  if (value === "working") return "執行中";
  if (value === "error") return "錯誤";
  return "閒置";
}

function formatTime(value) {
  if (!value) return "尚無活動";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function sessionTimestamp(session) {
  for (const value of [
    session?.lastInteractionAt,
    session?.lastActivityAt,
    session?.updatedAt,
    session?.lastMessageAt,
    session?.createdAt,
  ]) {
    if (value == null) continue;
    const timestamp = typeof value === "number" ? value : Date.parse(value);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

function sessionAgentId(session) {
  const direct = session?.agentId || session?.owner || null;
  if (direct && direct !== "unknown") return direct;
  const key = String(session?.key || session?.id || "");
  return /^agent:([^:]+):/.exec(key)?.[1] || direct;
}

function isAutomationSession(session) {
  if (String(session?.kind || "").toLowerCase() === "cron") return true;
  const key = String(session?.key || "");
  return key.includes(":cron:");
}

function latestSessionTime(rows) {
  let latest = null;
  for (const row of rows) {
    const timestamp = sessionTimestamp(row);
    if (timestamp == null) continue;
    if (latest == null || timestamp > latest) latest = timestamp;
  }
  return latest == null ? null : new Date(latest).toISOString();
}

function activityByAgent(sessions) {
  const result = new Map();

  for (const session of sessions) {
    const agentId = sessionAgentId(session);
    if (!agentId) continue;
    const current = result.get(agentId) || { interaction: [], automation: [] };
    if (isAutomationSession(session)) current.automation.push(session);
    else current.interaction.push(session);
    result.set(agentId, current);
  }

  return result;
}

function registryAgent(agentId) {
  return registry.agents?.[agentId] || {};
}

function teamIdForAgent(agent) {
  return agent.team || registryAgent(agent.agentId).team || "unassigned";
}

function teamLabel(agent) {
  const teamId = teamIdForAgent(agent);
  if (teamId === "unassigned") return "未設定";
  return registry.teams?.[teamId]?.name || teamId;
}

function agentRole(agent) {
  return registryAgent(agent.agentId).role || "member";
}

function renderRows(container, rows, emptyText) {
  container.replaceChildren();

  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = emptyText;
    container.appendChild(p);
    return;
  }

  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "agent-row";

    const label = document.createElement("span");
    label.textContent = row.label;

    const state = document.createElement("strong");
    state.textContent = row.state;

    item.append(label, state);
    container.appendChild(item);
  }
}

function createAgentCard(agent, activities, isCoordinator = false) {
  const agentActivity = activities.get(agent.agentId) || { interaction: [], automation: [] };
  const lastInteractionAt = latestSessionTime(agentActivity.interaction);
  const lastAutomationAt = latestSessionTime(agentActivity.automation);

  const item = document.createElement("div");
  item.className = `agent-overview agent-${agent.status || "idle"}${isCoordinator ? " agent-coordinator" : ""}`;
  item.tabIndex = 0;

  const main = document.createElement("div");
  main.className = "agent-main";

  const identity = document.createElement("div");
  identity.className = "agent-identity";

  const titleLine = document.createElement("div");
  titleLine.className = "agent-title-line";

  const title = document.createElement("strong");
  title.className = "agent-name";
  title.textContent = agent.name || agent.agentId || "未知";
  titleLine.appendChild(title);

  if (isCoordinator) {
    const role = document.createElement("span");
    role.className = "role-chip";
    role.textContent = "主控 Agent";
    titleLine.appendChild(role);
  }

  const id = document.createElement("span");
  id.className = "agent-id";
  id.textContent = agent.agentId || "未知";

  identity.append(titleLine, id);

  const status = document.createElement("span");
  status.className = `agent-status status-${agent.status || "idle"}`;
  status.textContent = agentStatusLabel(agent.status);

  main.append(identity, status);

  const quick = document.createElement("div");
  quick.className = "agent-quick";

  const team = document.createElement("span");
  team.className = "agent-team";
  team.textContent = isCoordinator ? "團隊主控" : "團隊成員";

  const activity = document.createElement("span");
  activity.className = "agent-activity";
  activity.textContent = lastInteractionAt ? `最近互動 ${formatTime(lastInteractionAt)}` : "尚無互動";

  quick.append(team, activity);

  const meta = document.createElement("div");
  meta.className = "agent-meta";

  const metaItems = [
    ["模型", agent.model || "未提供"],
    ["工作區", agent.workspace || "未提供"],
    ["執行環境", agent.runtime || "未提供"],
    ["團隊", teamLabel(agent)],
    ["綁定數", agent.bindings ?? "未提供"],
    ["最後互動", formatTime(lastInteractionAt)],
    ["最後自動化", formatTime(lastAutomationAt)],
    ["工作階段", `${agentActivity.interaction.length} 個互動 / ${agentActivity.automation.length} 個自動化`],
  ];

  for (const [label, value] of metaItems) {
    const cell = document.createElement("div");
    cell.className = "agent-meta-item";

    const key = document.createElement("span");
    key.className = "agent-meta-label";
    key.textContent = label;

    const text = document.createElement("span");
    text.className = "agent-meta-value";
    text.textContent = String(value);

    cell.append(key, text);
    meta.appendChild(cell);
  }

  item.append(main, quick, meta);
  return item;
}

function renderTeamSection(teamId, teamName, agents, activities) {
  const section = document.createElement("section");
  section.className = "team-section";

  const header = document.createElement("div");
  header.className = "team-header";

  const heading = document.createElement("div");
  const kicker = document.createElement("span");
  kicker.className = "team-kicker";
  kicker.textContent = "TEAM";

  const title = document.createElement("h3");
  title.textContent = teamName;
  heading.append(kicker, title);

  const state = document.createElement("span");
  state.className = "team-count";
  state.textContent = `${agents.length} 位 Agent`;
  header.append(heading, state);

  const coordinator = agents.find((agent) => agentRole(agent) === "coordinator") || null;
  const members = agents.filter((agent) => agent !== coordinator);

  const coordinatorArea = document.createElement("div");
  coordinatorArea.className = "team-coordinator-area";

  if (coordinator) {
    const label = document.createElement("div");
    label.className = "team-subtitle";
    label.textContent = "主控 Agent";
    coordinatorArea.append(label, createAgentCard(coordinator, activities, true));
  }

  const memberArea = document.createElement("div");
  memberArea.className = "team-members-area";

  if (members.length) {
    const label = document.createElement("div");
    label.className = "team-subtitle";
    label.textContent = "團隊成員";

    const grid = document.createElement("div");
    grid.className = "team-member-grid";
    for (const member of members) grid.appendChild(createAgentCard(member, activities, false));
    memberArea.append(label, grid);
  }

  section.append(header, coordinatorArea, memberArea);
  return section;
}

function renderAgents(agents, sessions = []) {
  agentListEl.replaceChildren();

  if (!agents.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Gateway 沒有回傳 Agent 清單。";
    agentListEl.appendChild(p);
    return;
  }

  const activities = activityByAgent(sessions);
  const groups = new Map();

  for (const agent of agents) {
    const teamId = teamIdForAgent(agent);
    const rows = groups.get(teamId) || [];
    rows.push(agent);
    groups.set(teamId, rows);
  }

  const orderedTeamIds = [
    ...Object.keys(registry.teams || {}).filter((teamId) => groups.has(teamId)),
    ...[...groups.keys()].filter((teamId) => !registry.teams?.[teamId]),
  ];

  for (const teamId of orderedTeamIds) {
    const rows = groups.get(teamId) || [];
    const teamName = teamId === "unassigned" ? "未分組" : registry.teams?.[teamId]?.name || teamId;
    agentListEl.appendChild(renderTeamSection(teamId, teamName, rows, activities));
  }
}

function renderGatewayState(data) {
  const agents = Array.isArray(data.agents) ? data.agents : [];
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];

  const recentSessions = sessions.slice(0, 12).map((session) => ({
    label: session.label || session.key || session.id || session.agentId || session.owner || "工作階段",
    state: `${isAutomationSession(session) ? "自動化" : "互動"} · ${sessionState(session)}`,
  }));

  renderAgents(agents, sessions);
  renderRows(sessionListEl, recentSessions, "目前沒有工作階段。");

  statusEl.textContent = data.connected && data.subscribed ? "已連線" : "連線中";
  summaryEl.textContent = `Gateway ${data.serverVersion || "unknown"} · 協定 ${data.protocol ?? "-"} · 訂閱 ${data.subscribed ? "啟用" : "未啟用"} · Agent 清單 ${agents.length} · 工作階段 ${sessions.length}。Agent 已依團隊與主控角色分組；頁面關閉後訂閱會跟著釋放。`;
}

function renderError(message) {
  statusEl.textContent = "錯誤";
  summaryEl.textContent = `無法讀取 Gateway 訂閱：${message || "未知錯誤"}`;
  renderAgents([]);
  renderRows(sessionListEl, [], "尚未取得工作階段資料。");
}

async function loadRegistry() {
  try {
    const response = await fetch("/workstudio/registry.json", { cache: "no-store" });
    if (!response.ok) return;
    const parsed = await response.json();
    registry = {
      teams: parsed?.teams && typeof parsed.teams === "object" ? parsed.teams : {},
      agents: parsed?.agents && typeof parsed.agents === "object" ? parsed.agents : {},
    };
  } catch {
    registry = { teams: {}, agents: {} };
  }
}

function connectEventStream() {
  if (eventSource) eventSource.close();

  statusEl.textContent = "連線中";
  summaryEl.textContent = "正在建立工作台即時連線…";

  const source = new EventSource("/workstudio/api/events");
  eventSource = source;

  source.addEventListener("gateway-state", (event) => {
    try {
      renderGatewayState(JSON.parse(event.data || "{}"));
    } catch (error) {
      renderError(String(error));
    }
  });

  source.addEventListener("gateway-error", (event) => {
    try {
      const payload = JSON.parse(event.data || "{}");
      renderError(payload.message || "Gateway 連線失敗");
    } catch (error) {
      renderError(String(error));
    }
  });

  source.onerror = () => {
    if (document.visibilityState === "hidden") return;
    statusEl.textContent = "重新連線中";
    summaryEl.textContent = "即時連線中斷，瀏覽器正在重新連線…";
  };
}

function disconnectEventStream() {
  if (!eventSource) return;
  eventSource.close();
  eventSource = null;
}

window.addEventListener("pagehide", disconnectEventStream);
window.addEventListener("beforeunload", disconnectEventStream);

loadRegistry().finally(connectEventStream);
