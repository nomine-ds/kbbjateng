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

async function initMap() {
  if (typeof L === "undefined") {
    document.getElementById("map").innerHTML =
      '<p style="padding:2rem;text-align:center;color:#888">Peta butuh koneksi internet.</p>';
    return;
  }
  const data = await loadJSON("choropleth.json");
  const map = L.map("map", { scrollWheelZoom: false }).setView([-7.3, 110.3], 8);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    { attribution: "OpenStreetMap / CartoDB", maxZoom: 18 }).addTo(map);
  data.forEach((d) => {
    if (!d.lat_perkiraan || !d.lon_perkiraan) return;
    const n = d.jumlah_kasus_unik;
    const radius = n === 0 ? 4 : 6 + Math.sqrt(n) * 6;
    const color = n === 0 ? "#bbb" : n >= 15 ? "#7a1a1e" : n >= 5 ? RED : "#e37a7e";
    L.circleMarker([d.lat_perkiraan, d.lon_perkiraan], {
      radius: radius, fillColor: color, color: "#fff", weight: 1.5, fillOpacity: 0.8,
    }).bindPopup("<strong>" + d.nama_wilayah + "</strong><br>" + n +
      " kasus unik" + (d.catatan ? "<br><em>" + d.catatan + "</em>" : "")).addTo(map);
  });
}

async function initTimeline() {
  const data = await loadJSON("timeline.json");
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
  new Chart(ctx, {
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
  const ctx = document.getElementById("agama-chart").getContext("2d");
  // median pct_negara dari 12 kelompok agama lain (lihat ANALYSIS.md)
  const med = 33.3;
  new Chart(ctx, {
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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initHero();
    await initMap();
    await initTimeline();
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
