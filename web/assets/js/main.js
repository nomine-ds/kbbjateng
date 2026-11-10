// KBB Jateng -- hero + peta + timeline + agama + breakdown + kasus
const RED = "#c1272d";

async function loadJSON(name) {
  const r = await fetch("assets/data/" + name);
  if (!r.ok) throw new Error("Gagal load " + name);
  return r.json();
}

function animateValue(el, target, format, duration) {
  const start = performance.now();
  const isPct = format === "pct";
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const current = target * eased;
    el.textContent = isPct ? current.toFixed(1) + "%" : Math.round(current);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function initHero() {
  const r = await loadJSON("ringkasan.json");
  const stats = [
    { num: r.total_pelanggaran, label: "Kasus pelanggaran", format: "int" },
    { num: r.pct_negara, label: "Melibatkan negara", format: "pct" },
    { num: r.pct_penghayat_negara, label: "Kasus penghayat melibatkan negara", format: "pct" },
  ];
  const container = document.getElementById("hero-stats");
  container.innerHTML = stats.map(
    (s) => '<div class="stat"><div class="stat-number" data-target="' + s.num +
      '" data-format="' + s.format + '">0</div><div class="stat-label">' + s.label + "</div></div>"
  ).join("");

  const nums = container.querySelectorAll(".stat-number");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    nums.forEach((el) => {
      const t = parseFloat(el.dataset.target);
      el.textContent = el.dataset.format === "pct" ? t.toFixed(1) + "%" : Math.round(t);
    });
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const t = parseFloat(el.dataset.target);
      const f = el.dataset.format;
      setTimeout(() => animateValue(el, t, f, 1400), 300);
      obs.unobserve(el);
    });
  }, { threshold: 0.3 });
  nums.forEach((el) => obs.observe(el));
}

let mapInstance = null;
let allMarkers = [];
let allMapData = [];

let activeMarker = null;
let lastHashKode = null;
let filterTahun = null;

async function initMap() {
  if (typeof L === "undefined") {
    document.getElementById("map").innerHTML =
      '<p style="padding:2rem;text-align:center;color:#888">Peta butuh koneksi internet.</p>';
    return;
  }
  allMapData = await loadJSON("choropleth.json");
  try {
    window.kasusByWilayah = await loadJSON("kasus_per_wilayah.json");
  } catch (e) {
    console.warn("kasus_per_wilayah.json tidak ditemukan. Panel detail tidak akan bekerja.");
    window.kasusByWilayah = {};
  }

  mapInstance = L.map("map", {
    scrollWheelZoom: false,
    minZoom: 7,
    maxZoom: 13,
  }).setView([-7.3, 110.3], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "OpenStreetMap", maxZoom: 19 }).addTo(mapInstance);

  const kategoriSet = new Set();
  allMapData.forEach((d) => {
    if (d.kategori_terbanyak) kategoriSet.add(d.kategori_terbanyak);
  });
  const kategoriSelect = document.getElementById("filter-kategori");
  Array.from(kategoriSet).sort().forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    kategoriSelect.appendChild(opt);
  });

  renderMarkers();

  ["filter-jenis", "filter-kategori", "filter-jumlah"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => renderMarkers({ fit: true }));
  });

  document.querySelectorAll(".legend-item").forEach((el) => {
    el.addEventListener("click", () => {
      document.getElementById("filter-jumlah").value = el.dataset.tier;
      renderMarkers({ fit: true });
    });
  });

  const resetBtn = document.getElementById("map-reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", resetView);
  const emptyResetBtn = document.getElementById("empty-reset-btn");
  if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetView);

  window.addEventListener("hashchange", handleHash);
  handleHash();
}

function fitToMarkers(markers) {
  if (markers.length === 0) return;
  const bounds = L.featureGroup(markers).getBounds();
  if (bounds.isValid()) {
    mapInstance.fitBounds(bounds.pad(0.15), { maxZoom: 10, animate: true, duration: 0.5 });
  }
}

function setActiveMarker(marker) {
  if (activeMarker && activeMarker !== marker) {
    activeMarker.setStyle({ weight: 1.5, color: "#fff", fillOpacity: 0.8 });
  }
  if (marker) {
    marker.setStyle({ weight: 3, color: "#1a1a1a", fillOpacity: 0.95 });
    marker.bringToFront();
  }
  activeMarker = marker;
}

function handleHash() {
  const hash = window.location.hash;
  if (!hash.startsWith("#wilayah-")) return;
  const kode = hash.replace("#wilayah-", "");
  if (kode === lastHashKode) return;
  lastHashKode = kode;
  const marker = allMarkers.find((m) => m._wilayahKode === kode);
  if (marker) {
    setActiveMarker(marker);
    if (marker.getLatLng) mapInstance.panTo(marker.getLatLng(), { animate: true, duration: 0.5 });
    showDetail(kode);
  }
}

function resetView() {
  ["filter-jenis", "filter-kategori", "filter-jumlah"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  lastHashKode = null;
  setActiveMarker(null);
  if (window.location.hash.startsWith("#wilayah-")) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  renderMarkers({ fit: true });
  const detail = document.getElementById("map-detail");
  if (detail) {
    detail.innerHTML = '<p class="detail-hint">Klik wilayah di peta untuk melihat daftar kasus di wilayah tersebut.</p>';
  }
}

function renderMarkers(options = {}) {
  const { fit = false } = options;
  if (!mapInstance) return;

  allMarkers.forEach((m) => mapInstance.removeLayer(m));
  allMarkers = [];
  activeMarker = null;

  const fJenis = document.getElementById("filter-jenis").value;
  const fKategori = document.getElementById("filter-kategori").value;
  const fJumlah = document.getElementById("filter-jumlah").value;

  const mappable = allMapData.filter((d) => d.lat_perkiraan && d.lon_perkiraan);
  let visible = 0;

  mappable.forEach((d) => {
    let n = d.jumlah_kasus_unik;
    if (filterTahun) {
      const _d = window.kasusByWilayah && window.kasusByWilayah[String(d.kode_kabkota_bps)];
      if (!_d || !_d.kasus) return;
      n = _d.kasus.filter((k) => k.tahun === filterTahun).length;
      if (n === 0) return;
    }
    if (fJenis && d.jenis_kabkota !== fJenis) return;
    if (fKategori && d.kategori_terbanyak !== fKategori) return;
    if (fJumlah === "0" && n !== 0) return;
    if (fJumlah === "1-4" && (n < 1 || n > 4)) return;
    if (fJumlah === "5-14" && (n < 5 || n > 14)) return;
    if (fJumlah === "15+" && n < 15) return;

    const baseRadius = n === 0 ? 6 : 6 + Math.sqrt(n) * 6;
    const color = n === 0 ? "#bbb" : n >= 15 ? "#7a1a1e" : n >= 5 ? RED : "#e37a7e";

    const marker = L.circleMarker([d.lat_perkiraan, d.lon_perkiraan], {
      radius: baseRadius, fillColor: color, color: "#fff", weight: 1.5,
      fillOpacity: 0.8, bubblingMouseEvents: false,
    }).addTo(mapInstance);

    marker._wilayahKode = String(d.kode_kabkota_bps);

    marker.bindTooltip(
      "<strong>" + d.nama_wilayah + "</strong>" + n + " kasus unik",
      { direction: "top", offset: [0, -6], className: "custom-tooltip" }
    );

    marker.on("mouseover", function () {
      this.setRadius(baseRadius * 1.2);
      this.setStyle({ fillOpacity: 1, weight: 2.5 });
      this.bringToFront();
    });
    marker.on("mouseout", function () {
      this.setRadius(baseRadius);
      this.setStyle({ fillOpacity: 0.8, weight: 1.5 });
    });

    function activate() {
      lastHashKode = String(d.kode_kabkota_bps);
      history.replaceState(null, "", "#wilayah-" + d.kode_kabkota_bps);
      setActiveMarker(marker);
      showDetail(d.kode_kabkota_bps);
    }
    marker.on("click", activate);
    marker.on("add", function () {
      const el = this.getElement();
      if (el) {
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", d.nama_wilayah + ": " + n + " kasus");
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
        });
      }
    });

    allMarkers.push(marker);
    visible += 1;
  });

  const counter = document.getElementById("filter-count");
  if (counter) {
    counter.innerHTML = "Menampilkan <strong>" + visible + "</strong> dari " + mappable.length + " wilayah";
  }

  const emptyEl = document.getElementById("map-empty");
  if (emptyEl) emptyEl.style.display = visible === 0 ? "flex" : "none";

  document.querySelectorAll(".legend-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.tier === fJumlah);
  });

  if (fit) {
    const hasFilter = fJenis || fKategori || fJumlah;
    if (hasFilter && allMarkers.length > 0) fitToMarkers(allMarkers);
    else if (!hasFilter) mapInstance.setView([-7.3, 110.3], 8, { animate: true });
  }
}

async function initTimeline() {
  const data = await loadJSON("timeline.json");
  window.timelineData = data;
  const ctx = document.getElementById("timeline-chart").getContext("2d");
  let mi = 0;
  data.forEach((d, i) => { if (d.total > data[mi].total) mi = i; });
  const pk = data[mi];
  const i22 = data.findIndex((d) => d.tahun === 2022);
  const anns = {
    puncak: {
      type: "label", xValue: mi, yValue: pk.total,
      content: ["Puncak: " + pk.total + " kasus"],
      color: "#fff", backgroundColor: "rgba(193,39,45,0.9)",
      font: { size: 11, weight: "bold", family: "system-ui" },
      padding: 6, cornerRadius: 3, yAdjust: -20,
    },
  };
  if (i22 >= 0) {
    anns.format = {
      type: "label", xValue: i22, yValue: data[i22].total,
      content: ["Laporan 2022 mengakui", "keterbatasan pemantauan"],
      color: "#ccc", backgroundColor: "rgba(60,60,60,0.85)",
      font: { size: 10, family: "system-ui", style: "italic" },
      padding: 5, cornerRadius: 3, yAdjust: 40,
    };
  }
  window.timelineChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.tahun),
      datasets: [
        { label: "Negara", data: data.map((d) => d.negara), backgroundColor: RED },
        { label: "Campuran", data: data.map((d) => d.campuran), backgroundColor: "#e89ba0" },
        { label: "Non-negara", data: data.map((d) => d.non_negara), backgroundColor: "#4a4a4a" },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 30, bottom: 20 } },
      scales: {
        x: { stacked: true, ticks: { color: "#ccc" }, grid: { display: false } },
        y: { stacked: true, ticks: { color: "#ccc" }, grid: { color: "#333" } },
      },
      plugins: {
        legend: { labels: { color: "#eee" } },
        tooltip: { mode: "index", intersect: false },
        annotation: { annotations: anns },
      },
    },
  });
}

async function initAgamaChart() {
  const data = await loadJSON("agama_vs_negara.json");
  window.agamaData = data;
  const ctx = document.getElementById("agama-chart").getContext("2d");
  // median pct_negara dari 12 kelompok agama lain (lihat ANALYSIS.md)
  const med = 33.3;
  window.agamaChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.agama),
      datasets: [{
        label: "% melibatkan negara",
        data: data.map((d) => d.pct_negara),
        backgroundColor: data.map((d) => (d.highlight ? RED : "#c9c9c9")),
      }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 100 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const d = data[c.dataIndex];
              return d.pct_negara + "% (" + d.negara_terlibat + " dari " + d.kasus_unik + " kasus)";
            },
          },
        },
        annotation: {
          annotations: {
            median: {
              type: "line", xMin: med, xMax: med,
              borderColor: "#888", borderWidth: 1.5, borderDash: [5, 5],
              label: {
                display: true,
                content: "Median semua agama lain: " + med.toFixed(1) + "%",
                position: "end", color: "#333",
                backgroundColor: "rgba(255,255,255,0.95)",
                font: { size: 10, family: "system-ui", weight: "600" },
                padding: 5, borderRadius: 2,
              },
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: "#666", callback: (v) => v + "%" }, max: 80, grid: { color: "#e5e5e5" } },
        y: { ticks: { color: "#1a1a1a", font: { size: 14, weight: "600" } }, grid: { display: false } },
      },
    },
  });
}

async function initPenghayatBreakdown() {
  const data = await loadJSON("penghayat_breakdown.json");
  document.getElementById("breakdown").innerHTML = data.map((d) =>
    '<div class="bd-item"><div class="bd-num">' + d.jumlah +
    '</div><div class="bd-label">' + d.jenis + "</div></div>"
  ).join("");
}

async function initCases() {
  const data = await loadJSON("kasus_kunci.json");
  const order = ["C118", "C116", "C119", "C089"];
  data.sort((a, b) => order.indexOf(a.id_kasus) - order.indexOf(b.id_kasus));
  const labels = {
    C118: "PEMBUKA", C116: "KASUS 2",
    C119: "KASUS 3", C089: "RESOLUSI",
  };
  document.getElementById("cases").innerHTML = data.map((d, i) => {
    const sama = d.ringkasan_sesuai_laporan && d.judul_baku &&
      d.ringkasan_sesuai_laporan.trim() === d.judul_baku.trim();
    const ringkasanHtml = sama ? "" : '<p class="case-ringkasan">' + d.ringkasan_sesuai_laporan + "</p>";
    return (
      '<article class="case">' +
        '<div class="case-num">' + String(i + 1).padStart(2, "0") + "</div>" +
        '<div class="case-body">' +
          '<p class="case-label">' + (labels[d.id_kasus] || "") + "</p>" +
          '<p class="case-meta">' + d.nama_wilayah + " · " + d.tahun +
            " · " + d.peran_negara_ringkas + "</p>" +
          "<h3>" + d.judul_baku + "</h3>" +
          ringkasanHtml +
          '<p class="case-status"><strong>Status:</strong> ' + d.status + "</p>" +
        "</div>" +
      "</article>"
    );
  }).join("");
}


function initProgress() {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;
  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    bar.style.width = Math.min(pct, 100) + "%";
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    initProgress();
    await initHero();
    await initMap();
    await initTimeline();
    initTimelineClick();
    await initAgamaChart();
    await initPenghayatBreakdown();
    await initCases();
  } catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML("afterbegin",
      '<div style="padding:1rem;background:#fee;color:#a00;font-family:monospace">Error: ' +
      e.message + ". Jalankan via local server.</div>");
  }
});


/* Detail panel: tampilkan kasus per wilayah */
function showDetail(kode) {
  const detail = document.getElementById("map-detail");
  if (!detail) return;

  const data = window.kasusByWilayah && window.kasusByWilayah[String(kode)];
  if (!data || !data.kasus || data.kasus.length === 0) {
    detail.innerHTML =
      '<p class="detail-empty">Tidak ada kasus terpetakan di wilayah ini.</p>';
    return;
  }

  let html = '<div class="detail-header">';
  html += '<h3>' + data.nama_wilayah + '</h3>';
  html += '<p class="detail-count">' + data.kasus.length + ' kasus</p>';
  html += '</div><ul class="detail-list">';

  data.kasus.forEach((k) => {
    html += '<li>';
    html += '<div class="detail-meta">' + k.tahun + ' \u00b7 ' + k.peran_negara +
            (k.status ? ' \u00b7 ' + k.status : '') + '</div>';
    html += '<div class="detail-judul">' + k.judul + '</div>';
    if (k.ringkasan && k.ringkasan !== k.judul) {
      html += '<div class="detail-ringkasan">' + k.ringkasan + '</div>';
    }
    html += '</li>';
  });

  html += '</ul>';
  detail.innerHTML = html;

  detail.classList.remove("flash");
  void detail.offsetWidth;
  detail.classList.add("flash");

  setTimeout(() => {
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 300);
}


/* Cross-filter timeline -> peta */
function setFilterTahun(tahun) {
  if (filterTahun === tahun) filterTahun = null;
  else filterTahun = tahun;
  updateFilterBadge();
  renderMarkers({ fit: true });
}

function updateFilterBadge() {
  const badge = document.getElementById("filter-badge");
  if (!badge) return;
  if (filterTahun === null) {
    badge.style.display = "none";
    badge.innerHTML = "";
    return;
  }
  badge.style.display = "inline-flex";
  badge.innerHTML = 'Filter: Tahun <strong>' + filterTahun +
    '</strong> <button type="button" aria-label="Hapus filter tahun">&times;</button>';
  const btn = badge.querySelector("button");
  if (btn) btn.addEventListener("click", () => setFilterTahun(filterTahun));
}

function initTimelineClick() {
  if (!window.timelineChart) return;
  const chart = window.timelineChart;
  chart.canvas.style.cursor = "pointer";
  chart.canvas.addEventListener("click", (evt) => {
    const points = chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, false);
    if (points.length === 0) return;
    const idx = points[0].index;
    const labels = chart.data.labels;
    const tahun = parseInt(labels[idx], 10);
    if (!isNaN(tahun)) setFilterTahun(tahun);
  });
}


/* Toggle tabel untuk chart */
function initChartToggles() {
  document.querySelectorAll(".chart-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleChartTable(btn.dataset.chart));
  });
}

function toggleChartTable(id) {
  const tableEl = document.getElementById("table-" + id);
  const btn = document.querySelector('.chart-toggle-btn[data-chart="' + id + '"]');
  const chart = id === "timeline" ? window.timelineChart : window.agamaChart;
  if (!tableEl || !btn || !chart) return;
  const wrap = chart.canvas ? chart.canvas.closest(".chart-wrap") : null;

  const isHidden = tableEl.style.display === "none" || !tableEl.style.display;
  if (isHidden) {
    tableEl.innerHTML = buildTableHTML(id);
    tableEl.style.display = "block";
    if (wrap) wrap.style.display = "none";
    btn.textContent = "Lihat sebagai grafik";
  } else {
    tableEl.style.display = "none";
    if (wrap) wrap.style.display = "block";
    btn.textContent = "Lihat angkanya sebagai tabel";
  }
}

function buildTableHTML(id) {
  if (id === "timeline") {
    const data = window.timelineData || [];
    let html = '<table class="data-table"><thead><tr>' +
      '<th>Tahun</th><th>Negara</th><th>Campuran</th><th>Non-negara</th><th>Total</th>' +
      '</tr></thead><tbody>';
    data.forEach((d) => {
      const total = d.negara + d.campuran + d.non_negara;
      html += '<tr><td>' + d.tahun + '</td><td>' + d.negara +
              '</td><td>' + d.campuran + '</td><td>' + d.non_negara +
              '</td><td><strong>' + total + '</strong></td></tr>';
    });
    return html + '</tbody></table>';
  }
  if (id === "agama") {
    const data = window.agamaData || [];
    let html = '<table class="data-table"><thead><tr>' +
      '<th>Kelompok</th><th>Kasus unik</th><th>Negara terlibat</th><th>% negara</th>' +
      '</tr></thead><tbody>';
    data.forEach((d) => {
      html += '<tr><td>' + d.agama + '</td><td>' + d.kasus_unik +
              '</td><td>' + d.negara_terlibat + '</td><td><strong>' +
              d.pct_negara + '%</strong></td></tr>';
    });
    return html + '</tbody></table>';
  }
  return "";
}
