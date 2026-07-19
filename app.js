const STORAGE_KEY = "mx-multicronometro-v5";

const SPONSOR_IMAGES = [
  "Sponsors/sponsor-1.png",
  "Sponsors/sponsor-2.png",
  "Sponsors/sponsor-3.png",
  "Sponsors/sponsor-4.png",
  "Sponsors/sponsor-5.png",
  "Sponsors/sponsor-6.png",
  "Sponsors/sponsor-7.png",
  "Sponsors/sponsor-8.png",
  "Sponsors/sponsor-9.png",
  "Sponsors/sponsor-10.png",
  "Sponsors/sponsor-11.png",
];

const defaultState = {
  trackArchive: [{ id: crypto.randomUUID(), name: "Pista MX locale", length: null }],
  riderArchive: [],
  selectedTrack: "Pista MX locale",
  riders: [],
  history: [],
};

let state = loadState();
let tickTimer = null;

const trackSelect = document.querySelector("#trackSelect");
const trackRecordEl = document.querySelector("#trackRecord");
const riderList = document.querySelector("#riderList");
const historyList = document.querySelector("#historyList");
const sponsorTrack = document.querySelector("#sponsorTrack");

const manageBtn = document.querySelector("#manageBtn");
const manageDialog = document.querySelector("#manageDialog");
const closeManageBtn = document.querySelector("#closeManageBtn");
const manageTabs = document.querySelectorAll(".tab-btn");
const managePanels = document.querySelectorAll(".manage-panel");

const trackForm = document.querySelector("#trackForm");
const trackFormId = document.querySelector("#trackFormId");
const trackFormName = document.querySelector("#trackFormName");
const trackFormLength = document.querySelector("#trackFormLength");
const trackFormCancel = document.querySelector("#trackFormCancel");
const trackManageList = document.querySelector("#trackManageList");

const riderForm = document.querySelector("#riderForm");
const riderFormId = document.querySelector("#riderFormId");
const riderFormName = document.querySelector("#riderFormName");
const riderFormSurname = document.querySelector("#riderFormSurname");
const riderFormNumber = document.querySelector("#riderFormNumber");
const riderFormCancel = document.querySelector("#riderFormCancel");
const riderManageList = document.querySelector("#riderManageList");

const addRiderBtn = document.querySelector("#addRiderBtn");
const pickRiderDialog = document.querySelector("#pickRiderDialog");
const closePickRiderBtn = document.querySelector("#closePickRiderBtn");
const pickRiderSearch = document.querySelector("#pickRiderSearch");
const pickRiderList = document.querySelector("#pickRiderList");

const riderDialog = document.querySelector("#riderDialog");
const riderDialogTitle = document.querySelector("#riderDialogTitle");
const riderDialogStats = document.querySelector("#riderDialogStats");
const riderDialogLaps = document.querySelector("#riderDialogLaps");

document.querySelector("#resetSessionBtn").addEventListener("click", resetActiveSession);
document.querySelector("#exportBtn").addEventListener("click", exportHistory);
registerServiceWorker();

trackSelect.addEventListener("change", () => {
  state.selectedTrack = trackSelect.value;
  saveAndRender();
});

manageBtn.addEventListener("click", () => openManageDialog("tracks"));
closeManageBtn.addEventListener("click", () => manageDialog.close());
manageTabs.forEach((btn) => btn.addEventListener("click", () => setManageTab(btn.dataset.tab)));

trackForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const length = trackFormLength.value !== "" ? Number(trackFormLength.value) : null;
  if (upsertTrack(trackFormId.value || null, trackFormName.value, length)) {
    resetTrackForm();
    saveAndRender();
  }
});
trackFormCancel.addEventListener("click", resetTrackForm);

riderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const number = riderFormNumber.value !== "" ? Number(riderFormNumber.value) : null;
  if (upsertRider(riderFormId.value || null, riderFormName.value, riderFormSurname.value, number)) {
    resetRiderForm();
    saveAndRender();
  }
});
riderFormCancel.addEventListener("click", resetRiderForm);

addRiderBtn.addEventListener("click", openPickRiderDialog);
closePickRiderBtn.addEventListener("click", () => pickRiderDialog.close());
pickRiderSearch.addEventListener("input", () => renderPickRiderList(pickRiderSearch.value));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const migrated = migrateState(JSON.parse(saved));
    return { ...structuredClone(defaultState), ...migrated };
  } catch {
    return structuredClone(defaultState);
  }
}

function migrateState(parsed) {
  const loaded = { ...parsed };

  if (!Array.isArray(loaded.trackArchive)) {
    const names = Array.isArray(loaded.tracks) && loaded.tracks.length ? loaded.tracks : [defaultState.trackArchive[0].name];
    loaded.trackArchive = names.map((name) => ({ id: crypto.randomUUID(), name, length: null }));
  }
  delete loaded.tracks;

  if (!Array.isArray(loaded.riderArchive)) {
    const existingRiders = Array.isArray(loaded.riders) ? loaded.riders : [];
    loaded.riderArchive = existingRiders.map((rider) => {
      const parts = String(rider.name || "").trim().split(" ");
      return {
        id: rider.id || crypto.randomUUID(),
        name: parts[0] || rider.name || "Pilota",
        surname: parts.slice(1).join(" "),
        number: rider.number ?? null,
      };
    });
  }

  return loaded;
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function render() {
  renderTracks();
  renderTrackRecord();
  renderRiders();
  renderHistory();
  renderManageTracks();
  renderManageRiders();
  scheduleTicker();
}

function sortedTrackArchive() {
  return [...state.trackArchive].sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
}

function sortedRiderArchive() {
  return [...state.riderArchive].sort((a, b) =>
    `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, "it", { sensitivity: "base" })
  );
}

function fullRiderName(rider) {
  return [rider.name, rider.surname].filter(Boolean).join(" ").trim();
}

function renderTracks() {
  const tracks = sortedTrackArchive();

  if (tracks.length && !tracks.some((track) => track.name === state.selectedTrack)) {
    state.selectedTrack = tracks[0].name;
  }
  if (!tracks.length) state.selectedTrack = "";

  trackSelect.innerHTML = "";

  if (!tracks.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nessuna pista in archivio";
    option.disabled = true;
    option.selected = true;
    trackSelect.append(option);
    return;
  }

  tracks.forEach((track) => {
    const option = document.createElement("option");
    option.value = track.name;
    option.textContent = track.length ? `${track.name} (${track.length} m)` : track.name;
    option.selected = track.name === state.selectedTrack;
    trackSelect.append(option);
  });
}

function renderTrackRecord() {
  if (!state.selectedTrack) {
    trackRecordEl.innerHTML = "Aggiungi una pista dall'anagrafica.";
    return;
  }

  const record = trackRecordFor(state.selectedTrack);
  trackRecordEl.innerHTML = record
    ? `Record pista: <strong>${formatTime(record.lap)}</strong> - ${escapeHtml(record.rider)}`
    : "Record pista: nessun tempo registrato.";
}

function renderRiders() {
  riderList.innerHTML = "";

  if (!state.riders.length) {
    riderList.innerHTML = '<p class="empty">Aggiungi un pilota per iniziare a cronometrare.</p>';
    return;
  }

  state.riders.forEach((rider) => {
    const sessionBest = bestLapFor(rider);
    const lastLap = lastLapFor(rider);
    const archiveBest = bestHistoricalLapFor(rider, state.selectedTrack);
    const card = document.createElement("article");
    card.className = "rider-card";
    card.innerHTML = `
      <div class="rider-card-header">
        <button class="rider-name" data-action="detail" data-id="${rider.id}" type="button" aria-label="Dettaglio ${escapeHtml(rider.name)}">
          <span class="rider-number">${rider.number ?? "-"}</span>
          <span>${escapeHtml(rider.name)}</span>
        </button>
        <button class="icon-button" data-action="remove" data-id="${rider.id}" type="button" aria-label="Rimuovi ${escapeHtml(rider.name)}">&times;</button>
      </div>
      <div class="rider-timing">
        <strong class="timer-display" data-timer-id="${rider.id}">${formatTime(currentElapsed(rider))}</strong>
        <div class="quick-metrics">
          <span>Ultimo <strong>${formatOptionalTime(lastLap)}</strong></span>
          <span>Best <strong>${formatOptionalTime(sessionBest)}</strong></span>
        </div>
        ${archiveBest ? `
        <div class="archive-metric">
          <span class="metric-label">Record pista (archivio)</span>
          <strong>${formatTime(archiveBest)}</strong>
        </div>` : ""}
      </div>
      <div class="timer-actions">
        <button class="start" data-action="start" data-id="${rider.id}" type="button">${rider.status === "running" ? "Riavvia" : "Start"}</button>
        <button class="lap" data-action="lap" data-id="${rider.id}" type="button" ${rider.status !== "running" ? "disabled" : ""}>Lap</button>
        <button class="stop" data-action="stop" data-id="${rider.id}" type="button" ${rider.status === "idle" ? "disabled" : ""}>Stop</button>
      </div>
    `;
    riderList.append(card);
  });

  riderList.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleRiderAction(button.dataset.action, button.dataset.id));
  });
}

function renderHistory() {
  historyList.innerHTML = "";
  const sessions = groupHistoryIntoSessions();

  if (!sessions.length) {
    historyList.innerHTML = '<p class="empty">Le sessioni concluse appariranno qui.</p>';
    return;
  }

  sessions.forEach((session) => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.innerHTML = `
      <div class="session-info">
        <strong>${escapeHtml(session.track)}</strong>
        <span>${new Date(session.date).toLocaleDateString("it-IT")} - ${escapeHtml(session.riders.join(", "))}</span>
      </div>
      <button class="icon-button" data-action="delete-session" data-key="${escapeHtml(session.key)}" type="button" aria-label="Elimina sessione">&times;</button>
    `;
    historyList.append(row);
  });

  historyList.querySelectorAll("button[data-action='delete-session']").forEach((button) => {
    button.addEventListener("click", () => deleteSession(button.dataset.key));
  });
}

function sessionDayKey(dateString) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function groupHistoryIntoSessions() {
  const groups = new Map();

  state.history.forEach((item) => {
    const key = `${sessionDayKey(item.date)}__${item.track}`;
    if (!groups.has(key)) {
      groups.set(key, { key, date: item.date, track: item.track, riders: [], entries: [] });
    }
    const group = groups.get(key);
    group.entries.push(item);
    if (new Date(item.date) > new Date(group.date)) group.date = item.date;
    if (!group.riders.includes(item.rider)) group.riders.push(item.rider);
  });

  return [...groups.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function deleteSession(key) {
  const session = groupHistoryIntoSessions().find((item) => item.key === key);
  if (!session) return;

  const confirmed = window.confirm(
    `Eliminare la sessione del ${new Date(session.date).toLocaleDateString("it-IT")} su ${session.track}? Verranno rimossi ${session.entries.length} tempi.`
  );
  if (!confirmed) return;

  const toRemove = new Set(session.entries);
  state.history = state.history.filter((item) => !toRemove.has(item));
  saveAndRender();
}

function trackRecordFor(track) {
  let best = null;

  state.history.forEach((item) => {
    if (item.track !== track) return;
    const lap = item.bestLap || bestLapFromHistory(item);
    if (Number.isFinite(lap) && lap > 0 && (!best || lap < best.lap)) {
      best = { lap, rider: item.rider };
    }
  });

  return best;
}

function handleRiderAction(action, id) {
  const rider = state.riders.find((item) => item.id === id);
  if (!rider) return;

  if (action === "start") startRider(rider);
  if (action === "lap") lapRider(rider);
  if (action === "stop") stopRider(rider);
  if (action === "remove") removeRider(id);
  if (action === "detail") openRiderDetail(rider);

  if (action !== "detail") saveAndRender();
}

function startRider(rider) {
  rider.status = "running";
  rider.startAt = Date.now();
  rider.elapsed = 0;
  rider.laps = [];
}

function lapRider(rider) {
  const elapsed = currentElapsed(rider);
  const previous = rider.laps.reduce((sum, lap) => sum + lap, 0);
  rider.laps.push(elapsed - previous);
}

function stopRider(rider) {
  const total = currentElapsed(rider);
  const bestLap = bestLapFor(rider) || total;
  const lastLap = lastLapFor(rider) || total;
  rider.status = "idle";
  rider.elapsed = total;
  rider.startAt = null;
  state.history.unshift({
    riderId: rider.id,
    rider: rider.name,
    track: state.selectedTrack,
    total,
    lapTimes: [...rider.laps],
    laps: rider.laps.length || 1,
    bestLap,
    lastLap,
    date: new Date().toISOString(),
  });
}

function removeRider(id) {
  state.riders = state.riders.filter((rider) => rider.id !== id);
}

function resetActiveSession() {
  state.riders = state.riders.map((rider) => ({
    ...rider,
    status: "idle",
    startAt: null,
    elapsed: 0,
    laps: [],
  }));
  saveAndRender();
}

function currentElapsed(rider) {
  if (rider.status !== "running" || !rider.startAt) return rider.elapsed || 0;
  return Date.now() - rider.startAt;
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function formatOptionalTime(ms) {
  return Number.isFinite(ms) && ms > 0 ? formatTime(ms) : "--:--.-";
}

function bestLapFor(rider) {
  return rider.laps.length ? Math.min(...rider.laps) : null;
}

function lastLapFor(rider) {
  return rider.laps.length ? rider.laps[rider.laps.length - 1] : null;
}

function bestHistoricalLapFor(rider, track) {
  const times = state.history
    .filter((item) => item.track === track && (item.riderId === rider.id || item.rider === rider.name))
    .map((item) => item.bestLap || bestLapFromHistory(item))
    .filter((time) => Number.isFinite(time) && time > 0);

  return times.length ? Math.min(...times) : null;
}

function bestLapFromHistory(item) {
  if (Array.isArray(item.lapTimes) && item.lapTimes.length) return Math.min(...item.lapTimes);
  return item.total || null;
}

function scheduleTicker() {
  clearInterval(tickTimer);
  if (state.riders.some((rider) => rider.status === "running")) {
    tickTimer = setInterval(updateRunningTimers, 100);
  }
}

function updateRunningTimers() {
  state.riders.forEach((rider) => {
    const timer = riderList.querySelector(`[data-timer-id="${rider.id}"]`);
    if (timer) timer.textContent = formatTime(currentElapsed(rider));
  });
}

function openRiderDetail(rider) {
  const sessionBest = bestLapFor(rider);
  const lastLap = lastLapFor(rider);
  const trackBest = bestHistoricalLapFor(rider, state.selectedTrack);

  riderDialogTitle.textContent = `${rider.number ?? "-"} ${rider.name}`;
  riderDialogStats.innerHTML = `
    <div><span class="metric-label">Pista</span><strong>${escapeHtml(state.selectedTrack)}</strong></div>
    <div><span class="metric-label">Best pista</span><strong>${formatOptionalTime(trackBest)}</strong></div>
    <div><span class="metric-label">Best sess.</span><strong>${formatOptionalTime(sessionBest)}</strong></div>
    <div><span class="metric-label">Ultimo</span><strong>${formatOptionalTime(lastLap)}</strong></div>
  `;

  if (!rider.laps.length) {
    riderDialogLaps.innerHTML = '<p class="empty">Nessun giro registrato in questa sessione.</p>';
  } else {
    riderDialogLaps.innerHTML = rider.laps.map((lap, index) => `
      <div class="detail-lap-row">
        <span>Giro ${index + 1}</span>
        <strong>${formatTime(lap)}</strong>
      </div>
    `).join("");
  }

  riderDialog.showModal();
}

/* --- Anagrafica: piste --- */

function upsertTrack(id, name, length) {
  name = name.trim();
  if (!name) return false;

  const duplicate = state.trackArchive.some(
    (track) => track.id !== id && track.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    window.alert("Esiste gia' una pista con questo nome.");
    return false;
  }

  if (id) {
    const track = state.trackArchive.find((item) => item.id === id);
    if (!track) return false;
    const oldName = track.name;
    track.name = name;
    track.length = length;

    if (oldName !== name) {
      if (state.selectedTrack === oldName) state.selectedTrack = name;
      state.history.forEach((item) => {
        if (item.track === oldName) item.track = name;
      });
    }
  } else {
    state.trackArchive.push({ id: crypto.randomUUID(), name, length });
    if (!state.selectedTrack) state.selectedTrack = name;
  }

  return true;
}

function deleteTrack(id) {
  const track = state.trackArchive.find((item) => item.id === id);
  if (!track) return;

  const confirmed = window.confirm(
    `Eliminare la pista "${track.name}" dall'anagrafica? Lo storico gia' registrato non verra' toccato.`
  );
  if (!confirmed) return;

  state.trackArchive = state.trackArchive.filter((item) => item.id !== id);
  if (state.selectedTrack === track.name) {
    const next = sortedTrackArchive()[0];
    state.selectedTrack = next ? next.name : "";
  }

  saveAndRender();
}

function resetTrackForm() {
  trackFormId.value = "";
  trackFormName.value = "";
  trackFormLength.value = "";
}

function startEditTrack(id) {
  const track = state.trackArchive.find((item) => item.id === id);
  if (!track) return;
  trackFormId.value = track.id;
  trackFormName.value = track.name;
  trackFormLength.value = track.length ?? "";
  trackFormName.focus();
}

function renderManageTracks() {
  trackManageList.innerHTML = "";
  const tracks = sortedTrackArchive();

  if (!tracks.length) {
    trackManageList.innerHTML = '<p class="empty">Nessuna pista in archivio.</p>';
    return;
  }

  tracks.forEach((track) => {
    const row = document.createElement("div");
    row.className = "manage-item";
    row.innerHTML = `
      <div class="manage-item-info">
        <strong>${escapeHtml(track.name)}</strong>
        <span>${track.length ? `${track.length} m` : "Lunghezza non impostata"}</span>
      </div>
      <div class="manage-item-actions">
        <button class="icon-button" data-action="edit-track" data-id="${track.id}" type="button" aria-label="Modifica ${escapeHtml(track.name)}">&#9998;</button>
        <button class="icon-button" data-action="delete-track" data-id="${track.id}" type="button" aria-label="Elimina ${escapeHtml(track.name)}">&times;</button>
      </div>
    `;
    trackManageList.append(row);
  });

  trackManageList.querySelectorAll("button[data-action='edit-track']").forEach((button) => {
    button.addEventListener("click", () => startEditTrack(button.dataset.id));
  });
  trackManageList.querySelectorAll("button[data-action='delete-track']").forEach((button) => {
    button.addEventListener("click", () => deleteTrack(button.dataset.id));
  });
}

/* --- Anagrafica: piloti --- */

function upsertRider(id, name, surname, number) {
  name = name.trim();
  surname = surname.trim();
  if (!name && !surname) return false;

  if (id) {
    const rider = state.riderArchive.find((item) => item.id === id);
    if (!rider) return false;
    rider.name = name;
    rider.surname = surname;
    rider.number = number;

    const fullName = fullRiderName(rider);
    const active = state.riders.find((item) => item.id === id);
    if (active) {
      active.name = fullName;
      active.number = number;
    }
    state.history.forEach((item) => {
      if (item.riderId === id) item.rider = fullName;
    });
  } else {
    state.riderArchive.push({ id: crypto.randomUUID(), name, surname, number });
  }

  return true;
}

function deleteRiderArchive(id) {
  const rider = state.riderArchive.find((item) => item.id === id);
  if (!rider) return;

  const confirmed = window.confirm(
    `Eliminare ${fullRiderName(rider)} dall'anagrafica? Lo storico gia' registrato non verra' toccato.`
  );
  if (!confirmed) return;

  state.riderArchive = state.riderArchive.filter((item) => item.id !== id);
  saveAndRender();
}

function resetRiderForm() {
  riderFormId.value = "";
  riderFormName.value = "";
  riderFormSurname.value = "";
  riderFormNumber.value = "";
}

function startEditRider(id) {
  const rider = state.riderArchive.find((item) => item.id === id);
  if (!rider) return;
  riderFormId.value = rider.id;
  riderFormName.value = rider.name;
  riderFormSurname.value = rider.surname;
  riderFormNumber.value = rider.number ?? "";
  riderFormName.focus();
}

function renderManageRiders() {
  riderManageList.innerHTML = "";
  const riders = sortedRiderArchive();

  if (!riders.length) {
    riderManageList.innerHTML = '<p class="empty">Nessun pilota in archivio.</p>';
    return;
  }

  riders.forEach((rider) => {
    const row = document.createElement("div");
    row.className = "manage-item";
    row.innerHTML = `
      <div class="manage-item-info">
        <strong>${escapeHtml(fullRiderName(rider))}</strong>
        <span>${rider.number != null && rider.number !== "" ? `Numero ${rider.number}` : "Nessun numero"}</span>
      </div>
      <div class="manage-item-actions">
        <button class="icon-button" data-action="edit-rider" data-id="${rider.id}" type="button" aria-label="Modifica ${escapeHtml(fullRiderName(rider))}">&#9998;</button>
        <button class="icon-button" data-action="delete-rider" data-id="${rider.id}" type="button" aria-label="Elimina ${escapeHtml(fullRiderName(rider))}">&times;</button>
      </div>
    `;
    riderManageList.append(row);
  });

  riderManageList.querySelectorAll("button[data-action='edit-rider']").forEach((button) => {
    button.addEventListener("click", () => startEditRider(button.dataset.id));
  });
  riderManageList.querySelectorAll("button[data-action='delete-rider']").forEach((button) => {
    button.addEventListener("click", () => deleteRiderArchive(button.dataset.id));
  });
}

/* --- Dialog anagrafica --- */

function openManageDialog(tab) {
  resetTrackForm();
  resetRiderForm();
  setManageTab(tab);
  manageDialog.showModal();
}

function setManageTab(tab) {
  manageTabs.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  managePanels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab;
  });
}

/* --- Selezione pilota per la sessione attiva --- */

function openPickRiderDialog() {
  pickRiderSearch.value = "";
  renderPickRiderList("");
  pickRiderDialog.showModal();
  pickRiderSearch.focus();
}

function renderPickRiderList(query) {
  if (!state.riderArchive.length) {
    pickRiderList.innerHTML = '<p class="empty">Nessun pilota in archivio. Aggiungine uno dall\'icona ingranaggio.</p>';
    return;
  }

  const activeIds = new Set(state.riders.map((rider) => rider.id));
  const normalizedQuery = query.trim().toLowerCase();

  const candidates = sortedRiderArchive().filter((rider) => {
    if (activeIds.has(rider.id)) return false;
    if (!normalizedQuery) return true;
    const haystack = `${fullRiderName(rider)} ${rider.number ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  if (!candidates.length) {
    pickRiderList.innerHTML = '<p class="empty">Nessun pilota disponibile.</p>';
    return;
  }

  pickRiderList.innerHTML = candidates.map((rider) => `
    <button class="manage-item pick-item" data-id="${rider.id}" type="button">
      <div class="manage-item-info">
        <strong>${escapeHtml(fullRiderName(rider))}</strong>
        <span>${rider.number != null && rider.number !== "" ? `Numero ${rider.number}` : "Nessun numero"}</span>
      </div>
    </button>
  `).join("");

  pickRiderList.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", () => addRiderToSession(button.dataset.id));
  });
}

function addRiderToSession(archiveId) {
  const archived = state.riderArchive.find((item) => item.id === archiveId);
  if (!archived) return;
  if (state.riders.some((rider) => rider.id === archiveId)) return;

  state.riders.push({
    id: archived.id,
    name: fullRiderName(archived),
    number: archived.number,
    status: "idle",
    startAt: null,
    elapsed: 0,
    laps: [],
  });

  pickRiderDialog.close();
  saveAndRender();
}

/* --- Sponsor --- */

const SPONSOR_SECONDS_PER_LOGO = 4;

function renderSponsors() {
  if (!sponsorTrack || !SPONSOR_IMAGES.length) return;
  sponsorTrack.innerHTML = [...SPONSOR_IMAGES, ...SPONSOR_IMAGES]
    .map((src) => `<div class="sponsor-item"><img src="${src}" alt="Sponsor" /></div>`)
    .join("");
  sponsorTrack.style.setProperty("--sponsor-duration", `${SPONSOR_IMAGES.length * SPONSOR_SECONDS_PER_LOGO}s`);
}

/* --- Esportazione PDF --- */

function exportHistory() {
  if (!state.history.length) return;

  const lines = [
    "Simega #304 - Tempi motocross",
    `Esportato: ${new Date().toLocaleString("it-IT")}`,
    "",
  ];

  state.history.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.rider} - ${item.track}`);
    lines.push(`Data: ${new Date(item.date).toLocaleString("it-IT")}`);
    lines.push(`Totale: ${formatTime(item.total)} | Giri: ${item.laps} | Miglior giro: ${formatOptionalTime(item.bestLap || bestLapFromHistory(item))} | Ultimo giro: ${formatOptionalTime(item.lastLap)}`);
    if (Array.isArray(item.lapTimes) && item.lapTimes.length) {
      lines.push(`Giri: ${item.lapTimes.map((lap, lapIndex) => `${lapIndex + 1}) ${formatTime(lap)}`).join("   ")}`);
    }
    lines.push("");
  });

  const blob = new Blob([createPdf(lines)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tempi-motocross.pdf";
  document.body.append(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function createPdf(lines) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 42;
  const top = 800;
  const lineHeight = 16;
  const bottom = 46;
  const pages = [];
  let current = [];
  let y = top;

  lines.forEach((line) => {
    const wrapped = wrapPdfLine(line, 88);
    wrapped.forEach((part) => {
      if (y < bottom) {
        pages.push(current);
        current = [];
        y = top;
      }
      current.push({ text: part, x: left, y });
      y -= lineHeight;
    });
  });

  if (current.length) pages.push(current);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];

  pages.forEach((page, index) => {
    const pageObjectNumber = 3 + index * 2;
    const streamObjectNumber = pageObjectNumber + 1;
    const stream = [
      "BT",
      "/F1 11 Tf",
      ...page.map((line) => `1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj`),
      "ET",
    ].join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${streamObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function wrapPdfLine(line, maxLength) {
  const text = normalizePdfText(line);
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let current = "";
  text.split(" ").forEach((word) => {
    if (`${current} ${word}`.trim().length > maxLength) {
      if (current) chunks.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

function normalizePdfText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfText(value) {
  return normalizePdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
renderSponsors();
