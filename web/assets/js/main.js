const RED = "#c1272d";
let mapInstance = null;
let geojsonLayer = null;
let geojsonData = null;
let allMapData = [];
let selectedKodes = new Set();
let filterTahun = null;

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
  if (!container) return;
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

async function initMap() {
  if (typeof L === "undefined") {
    document.getElementById("map").innerHTML = '<p style="padding:2rem;text-align:center;color:#888">Peta butuh koneksi internet.</p>';
    return;
  }
  
  const mapEl = document.getElementById("map");
  mapEl.innerHTML = '<div class="map-loading"><div class="spinner"></div><p>Memuat data peta...</p></div>';

  allMapData = await loadJSON("choropleth.json");
  try { window.kasusByWilayah = await loadJSON("kasus_per_wilayah.json"); } catch (e) { window.kasusByWilayah = {}; }

  mapEl.innerHTML = "";
  mapInstance = L.map("map", { scrollWheelZoom: false, minZoom: 7, maxZoom: 13 }).setView([-7.3, 110.3], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "OpenStreetMap", maxZoom: 19 }).addTo(mapInstance);

  initMultiSelect();

  const kategoriSet = new Set();
  allMapData.forEach((d) => { if (d.kategori_terbanyak) kategoriSet.add(d.kategori_terbanyak); });
  const kategoriSelect = document.getElementById("filter-kategori");
  if (kategoriSelect) {
    Array.from(kategoriSet).sort().forEach((k) => {
      const opt = document.createElement("option"); opt.value = k; opt.textContent = k; kategoriSelect.appendChild(opt);
    });
  }

  await renderChoropleth();

  setTimeout(() => {
    mapInstance.invalidateSize();
    if (geojsonLayer) mapInstance.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
  }, 300);

  ["filter-jenis", "filter-kategori", "filter-jumlah"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => renderChoropleth({ fit: true }));
  });

  const resetBtn = document.getElementById("map-reset-btn");
  if (resetBtn) resetBtn.addEventListener("click", resetView);
  const emptyResetBtn = document.getElementById("empty-reset-btn");
  if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetView);
}

function initMultiSelect() {
  const container = document.getElementById("multi-select-wilayah");
  if (!container) return;

  container.innerHTML = `
    <div class="multi-select-header" id="ms-header">-- Pilih Wilayah --</div>
    <div class="multi-select-options" id="ms-options">
      <div class="ms-actions">
        <button type="button" id="ms-select-all">Pilih Semua</button>
        <button type="button" id="ms-clear-all">Hapus Semua</button>
      </div>
      <div id="ms-list"></div>
    </div>
  `;

  const header = document.getElementById("ms-header");
  const optionsBox = document.getElementById("ms-options");
  const msList = document.getElementById("ms-list");

  header.addEventListener("click", (e) => {
    e.stopPropagation();
    optionsBox.style.display = optionsBox.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", () => { optionsBox.style.display = "none"; });

  const sortedData = [...allMapData].sort((a, b) => {
    const nameA = a.nama_kabkota || a.nama_wilayah || a.shapeName || "";
    const nameB = b.nama_kabkota || b.nama_wilayah || b.shapeName || "";
    return nameA.localeCompare(nameB);
  });

  sortedData.forEach((d) => {
    const namaWilayah = d.nama_kabkota || d.nama_wilayah || d.shapeName || ("Wilayah " + d.kode_kabkota_bps);
    const label = document.createElement("label");
    label.className = "ms-option";
    label.innerHTML = `<input type="checkbox" value="${d.kode_kabkota_bps}"> <span>${namaWilayah}</span>`;
    msList.appendChild(label);
  });

  document.getElementById("ms-select-all").addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll('#ms-list input[type="checkbox"]').forEach(cb => {
      cb.checked = true;
      selectedKodes.add(String(cb.value));
    });
    updateMultiSelectHeader(); applyMultiHighlight(); updateDetailPanel();
  });

  document.getElementById("ms-clear-all").addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll('#ms-list input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    selectedKodes.clear();
    updateMultiSelectHeader(); applyMultiHighlight(); updateDetailPanel();
  });

  msList.addEventListener("change", (e) => {
    if (e.target.tagName === "INPUT") {
      const kode = String(e.target.value);
      if (e.target.checked) selectedKodes.add(kode);
      else selectedKodes.delete(kode);
      updateMultiSelectHeader(); applyMultiHighlight(); updateDetailPanel();
    }
  });
}

function updateMultiSelectHeader() {
  const header = document.getElementById("ms-header");
  if (!header) return;
  if (selectedKodes.size === 0) header.innerHTML = '<span style="color:#9ca3af">-- Pilih Wilayah --</span>';
  else header.innerHTML = '<span style="font-weight:600; color:#c1272d;">' + selectedKodes.size + ' Wilayah Dipilih</span>';
}

function applyMultiHighlight() {
  if (!geojsonLayer) return;
  geojsonLayer.eachLayer((layer) => {
    const kodeStr = String(layer.feature.properties.kode_bps);
    if (selectedKodes.has(kodeStr)) {
      layer.setStyle({ weight: 4, color: "#1a1a1a", dashArray: "4, 4", fillColor: layer._baseFillColor, fillOpacity: 0.9 });
      layer.bringToFront();
    } else {
      geojsonLayer.resetStyle(layer);
    }
  });
}

async function renderChoropleth(options = {}) {
  const { fit = false } = options;
  if (!mapInstance) return;

  if (geojsonLayer) mapInstance.removeLayer(geojsonLayer);
  if (!geojsonData) geojsonData = await loadJSON("kabkota_jateng.geojson");

  const fJenis = document.getElementById("filter-jenis") ? document.getElementById("filter-jenis").value : "";
  const fKategori = document.getElementById("filter-kategori") ? document.getElementById("filter-kategori").value : "";
  const fJumlah = document.getElementById("filter-jumlah") ? document.getElementById("filter-jumlah").value : "";

  const kasusByKode = {};
  allMapData.forEach((d) => { kasusByKode[String(d.kode_kabkota_bps)] = d; });

  function computeN(d, kodeStr) {
    let n = d ? d.jumlah_kasus_unik : 0;
    if (filterTahun && window.kasusByWilayah && window.kasusByWilayah[kodeStr]) {
      n = window.kasusByWilayah[kodeStr].kasus.filter((k) => k.tahun === filterTahun).length;
    }
    return n;
  }

  function passes(d, n) {
    if (fJenis && (!d || d.jenis_kabkota !== fJenis)) return false;
    if (fKategori && (!d || d.kategori_terbanyak !== fKategori)) return false;
    if (fJumlah === "0" && n !== 0) return false;
    if (fJumlah === "1-4" && (n < 1 || n > 4)) return false;
    if (fJumlah === "5-14" && (n < 5 || n > 14)) return false;
    if (fJumlah === "15+" && n < 15) return false;
    if (filterTahun && n === 0) return false;
    return true;
  }

  let visible = 0;

  geojsonLayer = L.geoJSON(geojsonData, {
    style: function (feature) {
      const kodeStr = String(feature.properties.kode_bps);
      const d = kasusByKode[kodeStr];
      const n = computeN(d, kodeStr);
      if (!passes(d, n)) return { opacity: 0, fillOpacity: 0 };

      let fillColor = "#d9d9d9";
      if (n >= 15) fillColor = "#7a1a1e";
      else if (n >= 5) fillColor = "#c1272d";
      else if (n >= 1) fillColor = "#e37a7e";

      return { fillColor: fillColor, weight: 1, opacity: 1, color: "white", fillOpacity: 0.8 };
    },
    onEachFeature: function (feature, layer) {
      const kodeStr = String(feature.properties.kode_bps);
      const nama = feature.properties.shapeName || "Wilayah " + kodeStr;
      const d = kasusByKode[kodeStr];
      const n = computeN(d, kodeStr);

      let baseColor = "#d9d9d9";
      if (n >= 15) baseColor = "#7a1a1e";
      else if (n >= 5) baseColor = "#c1272d";
      else if (n >= 1) baseColor = "#e37a7e";
      layer._baseFillColor = baseColor;

      layer.bindTooltip("<strong>" + nama + "</strong><br>" + n + " kasus unik", { sticky: true, className: "custom-tooltip" });

      layer.on("click", () => {
        if (selectedKodes.has(kodeStr)) selectedKodes.delete(kodeStr);
        else selectedKodes.add(kodeStr);
        
        const cb = document.querySelector('#ms-list input[value="' + kodeStr + '"]');
        if (cb) cb.checked = selectedKodes.has(kodeStr);

        updateMultiSelectHeader(); applyMultiHighlight(); updateDetailPanel();
      });

      layer.on("mouseover", function () {
        if (!selectedKodes.has(kodeStr)) this.setStyle({ weight: 3, color: "#c1272d", fillOpacity: 0.95 });
        this.bringToFront();
      });

      layer.on("mouseout", function () {
        if (!selectedKodes.has(kodeStr)) geojsonLayer.resetStyle(this);
      });

      if (passes(d, n)) visible++;
    }
  }).addTo(mapInstance);

  applyMultiHighlight();
  const counter = document.getElementById("filter-count");
  if (counter) counter.innerHTML = "Menampilkan <strong>" + visible + "</strong> dari " + allMapData.length + " wilayah";
  
  if (fit && visible > 0) {
    const hasFilter = fJenis || fKategori || fJumlah || filterTahun;
    if (hasFilter) mapInstance.flyToBounds(geojsonLayer.getBounds().pad(0.1), { maxZoom: 10, duration: 1 });
  }
}

function updateDetailPanel() {
  const detail = document.getElementById("map-detail");
  if (!detail) return;

  if (selectedKodes.size === 0) {
    detail.innerHTML = '<p class="detail-hint">Klik wilayah di peta atau centang dari dropdown untuk melihat dan membandingkan kasus.</p>';
    return;
  }

  let html = '';
  Array.from(selectedKodes).forEach(kode => {
    const data = window.kasusByWilayah && window.kasusByWilayah[kode];
    if (!data || !data.kasus || data.kasus.length === 0) return;

    let filteredKasus = filterTahun ? data.kasus.filter(k => k.tahun === filterTahun) : data.kasus;
    if (filteredKasus.length === 0) return;

    html += `<div class="detail-header" style="margin-top: 1.5rem; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;"><h3>${data.nama_wilayah} ${filterTahun ? '(Tahun '+filterTahun+')' : ''}</h3><p class="detail-count">${filteredKasus.length} kasus</p></div><ul class="detail-list" style="margin-top: 0.5rem;">`;
    filteredKasus.forEach(k => {
      html += `<li><div class="detail-meta">${k.tahun} · ${k.peran_negara} ${k.status ? '· '+k.status : ''}</div><div class="detail-judul">${k.judul}</div>`;
      if (k.ringkasan && k.ringkasan !== k.judul) html += `<div class="detail-ringkasan">${k.ringkasan}</div>`;
      html += `</li>`;
    });
    html += `</ul>`;
  });

  detail.innerHTML = html !== '' ? html : '<p class="detail-empty">Tidak ada kasus terpetakan di wilayah terpilih.</p>';
  detail.classList.remove("flash"); void detail.offsetWidth; detail.classList.add("flash");
}

function resetView() {
  ["filter-jenis", "filter-kategori", "filter-jumlah"].forEach(id => { 
    const el = document.getElementById(id);
    if(el) el.value = ""; 
  });
  selectedKodes.clear();
  document.querySelectorAll('#ms-list input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateMultiSelectHeader();
  filterTahun = null;
  updateFilterBadge();
  if (geojsonLayer) mapInstance.flyToBounds(geojsonLayer.getBounds(), { padding: [20, 20], duration: 1 });
  renderChoropleth();
  updateDetailPanel();
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
      color: "#fff", backgroundColor: "rgba(193,39,45,0.95)",
      font: { size: 11, weight: "bold", family: "system-ui" },
      padding: 6, cornerRadius: 4, yAdjust: -25,
    },
  };
  
  if (i22 >= 0) {
    anns.format = {
      type: "label", xValue: i22, yValue: data[i22].total,
      content: ["Laporan 2022 mengakui", "keterbatasan"],
      color: "#fff", backgroundColor: "#333333", // Latar belakang gelap solid
      font: { size: 10, family: "system-ui", style: "italic" },
      padding: 6, cornerRadius: 4, yAdjust: -45, // Digeser ke atas menjauhi batang
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
      responsive: true, 
      maintainAspectRatio: false,
      layout: { padding: { top: 50, bottom: 10, left: 10, right: 10 } },
      scales: {
        x: { 
          stacked: true, 
          ticks: { color: "#a3a3a3", font: { size: 13, weight: "500" } }, 
          grid: { display: false } 
        },
        y: { 
          stacked: true, 
          ticks: { color: "#a3a3a3", font: { size: 13 } }, 
          // TAMBAHAN: Gridlines halus putus-putus
          grid: { color: "rgba(255, 255, 255, 0.08)", drawBorder: false, borderDash: [4, 4] } 
        },
      },
      plugins: {
        legend: { 
          labels: { color: "#fff", font: { size: 13, weight: "600" }, usePointStyle: true, padding: 20 } 
        },
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
  
  // Hitung Median dari seluruh data persentase
  const pcts = data.map(d => d.pct_negara).sort((a, b) => a - b);
  const mid = Math.floor(pcts.length / 2);
  const median = pcts.length % 2 !== 0 ? pcts[mid] : (pcts[mid - 1] + pcts[mid]) / 2;

  // Plugin kustom untuk menampilkan angka persen di ujung batang
  const dataLabelsPlugin = {
    id: 'dataLabels',
    afterDatasetsDraw(chart, args, options) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = '#1a1a1a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      chart.getDatasetMeta(0).data.forEach((bar, index) => {
        const value = chart.data.datasets[0].data[index];
        // Hanya tampilkan angka jika nilainya > 0
        if (value > 0) {
          ctx.fillText(value.toFixed(1) + '%', bar.x + 8, bar.y);
        }
      });
      ctx.restore();
    }
  };

  window.agamaChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.agama),
      datasets: [{
        label: "% melibatkan negara",
        data: data.map((d) => d.pct_negara),
        backgroundColor: data.map((d) => (d.highlight ? RED : "#e5e7eb")), // Warna abu dibuat lebih soft
        borderRadius: 4, // Ujung batang membulat
        barPercentage: 0.7, // Mengatur ketebalan batang
      }],
    },
    options: {
      indexAxis: "y", 
      responsive: true, 
      maintainAspectRatio: false,
      layout: { padding: { right: 60 } }, // Ruang ekstra di kanan untuk angka
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
            medianLine: {
              type: "line", xMin: median, xMax: median,
              borderColor: "#888", borderWidth: 1.5, borderDash: [6, 4],
              label: {
                display: true,
                content: "Median Agama Lain: " + median.toFixed(1) + "%",
                position: "end", color: "#fff",
                backgroundColor: "rgba(80, 80, 80, 0.9)",
                font: { size: 11, family: "system-ui", weight: "600" },
                padding: 6, borderRadius: 4, xAdjust: -10, yAdjust: -20
              },
            },
          },
        },
      },
      scales: {
        x: { 
          ticks: { 
            color: "#6b7280", 
            font: { size: 12 },
            callback: (v) => v + "%" // TAMBAHKAN SIMBOL %
          }, 
          max: 80, 
          grid: { color: "rgba(0, 0, 0, 0.04)", borderDash: [3, 3] } // Gridline vertikal pudar
        },
        y: { 
          ticks: { color: "#1a1a1a", font: { size: 13, weight: "600" } }, 
          grid: { display: false } 
        },
      },
    },
    plugins: [dataLabelsPlugin] // Daftarkan plugin datalabels
  });
}

async function initPenghayatBreakdown() {
  const data = await loadJSON("penghayat_breakdown.json");
  const el = document.getElementById("breakdown");
  if (el) el.innerHTML = data.map((d) => '<div class="bd-item"><div class="bd-num">' + d.jumlah + '</div><div class="bd-label">' + d.jenis + "</div></div>").join("");
}

async function initCases() {
  const data = await loadJSON("kasus_kunci.json");
  const el = document.getElementById("cases");
  if (!el) return;
  const order = ["C118", "C116", "C119", "C089"];
  data.sort((a, b) => order.indexOf(a.id_kasus) - order.indexOf(b.id_kasus));
  el.innerHTML = data.map((d, i) => '<article class="case"><div class="case-num">' + String(i + 1).padStart(2, "0") + '</div><div class="case-body"><p class="case-label">' + (d.id_kasus || "") + '</p><h3>' + d.judul_baku + '</h3></div></article>').join("");
}

function initChartToggles() {
  document.querySelectorAll(".chart-toggle-btn").forEach((btn) => {
    // Tambahkan ikon tabel pada load pertama
    if (btn.textContent.includes("tabel")) btn.innerHTML = "📊 " + btn.textContent;
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
    btn.innerHTML = "📈 Lihat sebagai grafik";
  } else {
    tableEl.style.display = "none";
    if (wrap) wrap.style.display = "block";
    btn.innerHTML = "📊 Lihat angkanya sebagai tabel";
  }
}





function setFilterTahun(tahun) {
  if (filterTahun === tahun) filterTahun = null;
  else filterTahun = tahun;
  updateFilterBadge();
  renderChoropleth({ fit: true });
}

function updateFilterBadge() {
  const badge = document.getElementById("filter-badge");
  if (!badge) return;
  if (filterTahun === null) { badge.style.display = "none"; badge.innerHTML = ""; return; }
  badge.style.display = "inline-flex";
  badge.innerHTML = 'Filter: Tahun <strong>' + filterTahun + '</strong> <button type="button" aria-label="Hapus filter tahun">&times;</button>';
  const btn = badge.querySelector("button");
  if (btn) btn.addEventListener("click", () => setFilterTahun(filterTahun));
}

function initTimelineClick() {
  if (!window.timelineChart) return;
  window.timelineChart.canvas.style.cursor = "pointer";
  window.timelineChart.canvas.addEventListener("click", (evt) => {
    const points = window.timelineChart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, false);
    if (points.length === 0) return;
    const idx = points[0].index;
    const tahun = parseInt(window.timelineChart.data.labels[idx], 10);
    if (!isNaN(tahun)) setFilterTahun(tahun);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initHero(); await initMap(); await initTimeline(); initTimelineClick(); await initAgamaChart(); await initPenghayatBreakdown(); await initCases(); initChartToggles();
  } catch (e) { console.error(e); }
});


