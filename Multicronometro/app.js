const STORAGE_KEY = "mx-multicronometro-v5";

const defaultState = {
  tracks: ["Pista MX locale"],
  selectedTrack: "Pista MX locale",
  riders: [
    { id: crypto.randomUUID(), name: "Pilota 1", number: 21, status: "idle", startAt: null, elapsed: 0, laps: [] },
  ],
  history: [],
};

let state = loadState();
let tickTimer = null;
let dialogMode = null;
let dialogRiderId = null;

const trackSelect = document.querySelector("#trackSelect");
const riderList = document.querySelector("#riderList");
const historyList = document.querySelector("#historyList");
const textDialog = document.querySelector("#textDialog");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogInput = document.querySelector("#dialogInput");
const riderDialog = document.querySelector("#riderDialog");
const riderDialogTitle = document.querySelector("#riderDialogTitle");
const riderDialogStats = document.querySelector("#riderDialogStats");
const riderDialogLaps = document.querySelector("#riderDialogLaps");

document.querySelector("#addTrackBtn").addEventListener("click", () => openTextDialog("track"));
document.querySelector("#addRiderBtn").addEventListener("click", () => openTextDialog("rider"));
document.querySelector("#resetSessionBtn").addEventListener("click", resetActiveSession);
document.querySelector("#exportBtn").addEventListener("click", exportHistory);
registerServiceWorker();
trackSelect.addEventListener("change", () => {
  state.selectedTrack = trackSelect.value;
  saveAndRender();
});

textDialog.addEventListener("close", () => {
  if (textDialog.returnValue !== "confirm") return;
  const value = dialogInput.value.trim();
  if (!value) return;

  if (dialogMode === "track") {
    if (!state.tracks.includes(value)) state.tracks.push(value);
    state.selectedTrack = value;
  }

  if (dialogMode === "rider") {
    state.riders.push({
      id: crypto.randomUUID(),
      name: value,
      number: nextRiderNumber(),
      status: "idle",
      startAt: null,
      elapsed: 0,
      laps: [],
    });
  }

  if (dialogMode === "rename" && dialogRiderId) {
    const rider = state.riders.find((item) => item.id === dialogRiderId);
    if (rider) {
      rider.name = value;
      state.history.forEach((item) => {
        if (item.riderId === rider.id) item.rider = value;
      });
    }
  }

  saveAndRender();
});

riderDialog.addEventListener("close", () => {
  if (riderDialog.returnValue === "rename" && dialogRiderId) {
    const rider = state.riders.find((item) => item.id === dialogRiderId);
    if (rider) openTextDialog("rename", rider.id);
  }
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function render() {
  renderTracks();
  renderRiders();
  renderHistory();
  scheduleTicker();
}

function renderTracks() {
  trackSelect.innerHTML = "";
  state.tracks.forEach((track) => {
    const option = document.createElement("option");
    option.value = track;
    option.textContent = track;
    option.selected = track === state.selectedTrack;
    trackSelect.append(option);
  });
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
    const card = document.createElement("article");
    card.className = "rider-card";
    card.innerHTML = `
      <div class="rider-card-header">
        <button class="rider-name" data-action="detail" data-id="${rider.id}" type="button" aria-label="Dettaglio ${escapeHtml(rider.name)}">
          <span class="rider-number">${rider.number}</span>
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

  if (!state.history.length) {
    historyList.innerHTML = '<p class="empty">Le sessioni concluse appariranno qui.</p>';
    return;
  }

  state.history.slice(0, 20).forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.innerHTML = `
      <strong>${escapeHtml(item.rider)} - ${escapeHtml(item.track)}</strong>
      <span>Best ${formatOptionalTime(item.bestLap)} - Ultimo ${formatOptionalTime(item.lastLap)}</span>
    `;
    historyList.append(row);
  });
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

function openTextDialog(mode, riderId = null) {
  dialogMode = mode;
  dialogRiderId = riderId;
  const rider = state.riders.find((item) => item.id === riderId);
  dialogTitle.textContent = mode === "track" ? "Aggiungi pista" : mode === "rename" ? "Rinomina pilota" : "Aggiungi pilota";
  dialogInput.value = mode === "rename" && rider ? rider.name : "";
  textDialog.showModal();
  dialogInput.select();
  dialogInput.focus();
}

function openRiderDetail(rider) {
  dialogRiderId = rider.id;
  const sessionBest = bestLapFor(rider);
  const lastLap = lastLapFor(rider);
  const trackBest = bestHistoricalLapFor(rider, state.selectedTrack);

  riderDialogTitle.textContent = `${rider.number} ${rider.name}`;
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

function nextRiderNumber() {
  return state.riders.reduce((highest, rider) => Math.max(highest, Number(rider.number) || 0), 0) + 1;
}

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
    .replace(/[\u0300-\u036f]/g, "")
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
