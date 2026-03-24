const API = "http://localhost:5000";
const COORDS = {
  Rampur:     [26.9124, 80.9152],
  Sundarpur:  [25.3176, 83.0102],
  Chandpur:   [28.4595, 77.0266],
  Devpur:     [24.5854, 73.7125],
  Krishnapur: [22.5726, 88.3639]
};
const RC = { Safe: "#16a34a", Warning: "#d97706", Critical: "#dc2626" };
const RE = { Safe: "🟢", Warning: "🟡", Critical: "🔴" };
const SM = {
  "Reduce irrigation immediately":                    { i: "🚱", c: "s-c" },
  "Switch to drought-resistant crops":                { i: "🌾", c: "s-w" },
  "Use drip irrigation to conserve water":            { i: "💧", c: "s-i" },
  "Water levels are stable — continue current practices": { i: "✅", c: "s-s" }
};

let rows = [], lastRes = null, leafMap = null, markers = [], wChart = null;

function el(id) { return document.getElementById(id); }

// ── Init map ──
leafMap = L.map("map").setView([23.5, 80], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 18
}).addTo(leafMap);

// ── Backend health ──
(async () => {
  try {
    const r = await fetch(API + "/villages", { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      el("sb-dot").className = "sb-dot ok";
      el("sb-txt").textContent = "Backend connected";
    } else throw 0;
  } catch {
    el("sb-dot").className = "sb-dot err";
    el("sb-txt").textContent = "Backend offline";
  }
})();

// ── Page navigation ──
function showPage(name, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  el("page-" + name).classList.add("active");
  document.querySelectorAll(".sb-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const T = {
    dashboard: "Regional Overview", upload: "Data Upload",
    predict: "Prediction AI", map: "Village Map",
    records: "Village Records", alerts: "Alerts"
  };
  el("page-title").textContent = T[name] || name;
  if (name === "map") setTimeout(() => leafMap.invalidateSize(), 120);
}

// ── File select ──
function onFile(input, key) {
  const f = input.files[0];
  if (!f) return;
  el("fdt-" + key).textContent = "📄 " + f.name;
  el("drop-" + key).classList.add("has-file");
}

// ── Upload ──
async function doUpload(key) {
  const input = el("file-" + key);
  const btn   = el("ubtn-" + key);
  const msg   = el("umsg-" + key);
  const f = input.files[0];
  if (!f) { setMsg(msg, "Please select a CSV file first.", "err"); return; }
  const fd = new FormData();
  fd.append("file", f);
  btn.disabled = true;
  setMsg(msg, "Uploading and validating…", "info");
  try {
    const res = await fetch(API + "/upload-data", { method: "POST", body: fd });
    const d   = await res.json();
    if (!res.ok) { setMsg(msg, "❌ " + d.error, "err"); return; }
    setMsg(msg, "✅ " + d.rows + " rows loaded successfully.", "ok");
    const txt = await f.text();
    rows = parseCSV(txt);
    renderTable(rows);
    fillDropdowns(rows);
    el("pbtn-d").disabled = false;
    el("pbtn-p").disabled = false;
    const vs = [...new Set(rows.map(r => r.village).filter(Boolean))];
    el("s-rows").textContent = rows.length;
    el("s-vill").textContent = vs.length;
    el("hero-v").textContent = vs.length;
    el("rec-count").textContent = rows.length + " rows";
  } catch {
    setMsg(msg, "❌ Cannot reach backend. Is Flask running on port 5000?", "err");
  } finally {
    btn.disabled = false;
  }
}

// ── Predict ──
async function doPredict(key) {
  const vKey = (key === "p") ? "vsel-p" : "vsel-d";
  const dKey = (key === "p") ? "days-p" : "days-d";
  const btn  = el("pbtn-" + key);
  const msg  = el("pmsg-" + key);
  const village = el(vKey).value;
  const days    = parseInt(el(dKey).value);
  if (!village) { setMsg(msg, "Please select a village.", "err"); return; }
  btn.disabled = true;
  setMsg(msg, "Running AI prediction model…", "info");
  try {
    const res = await fetch(API + "/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ village, days })
    });
    const d = await res.json();
    if (!res.ok) { setMsg(msg, "❌ " + d.error, "err"); return; }
    lastRes = d;
    setMsg(msg, "✅ Prediction complete for " + village + ".", "ok");
    renderAll(d);
    el("dl-btn").disabled = false;
  } catch {
    setMsg(msg, "❌ Cannot reach backend.", "err");
  } finally {
    btn.disabled = false;
  }
}

function renderAll(d) {
  renderAlert(d);
  renderBadge(d);
  renderSugg(d.suggestions);
  renderChart(d);
  renderMarkers(d);
  const lvls = d.predictions.map(p => p.groundwater_level);
  el("s-risk").textContent = d.highest_risk;
  el("s-risk").style.color = RC[d.highest_risk] || "inherit";
  el("s-lvl").textContent  = Math.min(...lvls).toFixed(1) + "m";
  if (d.highest_risk !== "Safe") el("alert-bdg").style.display = "inline";
}

function renderAlert(d) {
  const b = el("alert-banner");
  const days = d.predictions.length;
  if (d.highest_risk === "Critical") {
    b.style.cssText = "display:flex;margin-bottom:20px;border-radius:8px;padding:14px 18px;font-size:.88rem;font-weight:600;align-items:center;gap:12px;border:1px solid #fca5a5;background:#fee2e2;color:#dc2626";
    b.innerHTML = '<span style="font-size:1.4rem">⚠️</span><div><strong>Critical Alert:</strong> Groundwater level expected to drop critically within ' + days + ' days. Immediate action required.</div>';
  } else if (d.highest_risk === "Warning") {
    b.style.cssText = "display:flex;margin-bottom:20px;border-radius:8px;padding:14px 18px;font-size:.88rem;font-weight:600;align-items:center;gap:12px;border:1px solid #fcd34d;background:#fef3c7;color:#d97706";
    b.innerHTML = '<span style="font-size:1.4rem">⚠️</span><div><strong>Warning:</strong> Water levels may drop in the next ' + days + ' days. Take precautionary measures.</div>';
  } else {
    b.style.display = "none";
  }
  el("alerts-box").innerHTML = (d.highest_risk !== "Safe")
    ? '<div class="card" style="padding:18px">' + b.outerHTML + '</div>'
    : '<div class="card"><div class="empty-state"><div class="es-icon">✅</div><p>All villages are at Safe risk level.</p></div></div>';
}

function renderBadge(d) {
  const cls = { Safe: "rb-s", Warning: "rb-w", Critical: "rb-c" };
  const e = el("risk-badge");
  e.className = "risk-badge " + (cls[d.highest_risk] || "rb-e");
  e.textContent = (RE[d.highest_risk] || "") + " " + d.highest_risk;
  const lvls = d.predictions.map(p => p.groundwater_level);
  el("ms-avg").textContent = (lvls.reduce((a, b) => a + b, 0) / lvls.length).toFixed(1);
  el("ms-min").textContent = Math.min(...lvls).toFixed(1);
}

function renderSugg(suggestions) {
  const c = el("sugg-box");
  if (!suggestions || !suggestions.length) {
    c.innerHTML = '<div class="empty-state"><p>No recommendations.</p></div>';
    return;
  }
  c.innerHTML = suggestions.map(s => {
    const m = SM[s] || { i: "💡", c: "s-i" };
    return '<div class="sugg-item ' + m.c + '"><span style="font-size:1rem;flex-shrink:0">' + m.i + '</span><span>' + s + '</span></div>';
  }).join("");
}

function renderChart(d) {
  const { predictions, highest_risk, village } = d;
  const labels = predictions.map(p => p.date);
  const values = predictions.map(p => p.groundwater_level);
  const colour = RC[highest_risk] || "#2563eb";
  el("chart-empty").style.display = "none";
  const canvas = el("water-chart");
  canvas.style.display = "block";
  el("chart-sub").textContent = "Village: " + village + " · " + predictions.length + "-day forecast";
  if (wChart) wChart.destroy();
  wChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Groundwater Level (m)", data: values, borderColor: colour, backgroundColor: colour + "18", borderWidth: 2.5, pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: true },
        { label: "Critical threshold (5m)", data: Array(labels.length).fill(5), borderColor: "#dc2626", borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false },
        { label: "Safe threshold (10m)", data: Array(labels.length).fill(10), borderColor: "#16a34a", borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { afterBody: items => { const idx = items[0]?.dataIndex; if (idx !== undefined && predictions[idx]) return ["Risk: " + predictions[idx].risk_level]; } } }
      },
      scales: {
        y: { title: { display: true, text: "Groundwater Level (m)" }, grid: { color: "#f1f5f9" } },
        x: { title: { display: true, text: "Forecast Date" }, grid: { display: false }, ticks: { maxRotation: 40 } }
      }
    }
  });
}

function renderMarkers(d) {
  markers.forEach(m => leafMap.removeLayer(m));
  markers = [];
  const { village, predictions, highest_risk } = d;
  const coords = COORDS[village];
  if (!coords) return;
  const colour = RC[highest_risk] || "#2563eb";
  const avg = (predictions.reduce((s, p) => s + p.groundwater_level, 0) / predictions.length).toFixed(2);
  const icon = L.divIcon({
    className: "",
    html: '<div style="width:22px;height:22px;border-radius:50%;background:' + colour + ';border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
    iconSize: [22, 22], iconAnchor: [11, 11]
  });
  const m = L.marker(coords, { icon }).addTo(leafMap).bindPopup(
    '<div style="font-family:Inter,sans-serif;min-width:160px;padding:4px">' +
    '<strong>' + village + '</strong><br>' +
    '<span style="color:#64748b;font-size:.78rem">Avg Groundwater Level</span><br>' +
    '<span style="font-size:1.1rem;font-weight:800">' + avg + ' m</span><br>' +
    '<span style="color:' + colour + ';font-weight:700">' + RE[highest_risk] + ' ' + highest_risk + '</span></div>'
  );
  markers.push(m);
  leafMap.flyTo(coords, 8, { duration: 1.2 });
}

function renderTable(rows) {
  if (!rows.length) return;
  el("tbl-body").innerHTML = rows.map(r =>
    '<tr><td><strong>' + (r.village || "—") + '</strong></td>' +
    '<td>' + (r.groundwater_level || "—") + '</td>' +
    '<td>' + (r.rainfall || "—") + '</td>' +
    '<td>' + (r.temperature || "—") + '</td>' +
    '<td><span class="pill">' + (r.crop_type || "—") + '</span></td></tr>'
  ).join("");
}

function fillDropdowns(rows) {
  const vs = [...new Set(rows.map(r => r.village).filter(Boolean))].sort();
  const opts = '<option value="">Select a village…</option>' + vs.map(v => '<option value="' + v + '">' + v + '</option>').join("");
  el("vsel-d").innerHTML = opts;
  el("vsel-p").innerHTML = opts;
}

function doDownload() {
  if (!lastRes) return;
  const { village, predictions, suggestions } = lastRes;
  const sg = suggestions.join("; ");
  const hdr = "village,date,groundwater_level_m,risk_level,recommendations\n";
  const body = predictions.map(p =>
    '"' + village + '","' + p.date + '",' + p.groundwater_level + ',"' + p.risk_level + '","' + sg + '"'
  ).join("\n");
  const blob = new Blob([hdr + body], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = "jal_drishti_" + village + "_" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

function setMsg(el, text, type) { el.textContent = text; el.className = "smsg " + type; }

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(",");
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  });
}
