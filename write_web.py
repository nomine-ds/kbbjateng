"""Tulis file web Week 3 Step 2 (4 section)."""
from pathlib import Path

HTML = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bagi Penghayat, Negara Adalah Penghalang Pertama</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<header class="hero">
  <div class="hero-inner">
    <p class="kicker">Investigasi Data &middot; KBB Jawa Tengah 2016&ndash;2024</p>
    <h1>Bagi Penghayat Kepercayaan, Negara Adalah Penghalang Pertama</h1>
    <p class="dek">
      Dari 21 kasus pelanggaran terhadap penghayat di Jawa Tengah, 14 melibatkan
      negara &mdash; mulai dari KK yang tak bisa diubah hingga izin ibadah yang
      tak kunjung terbit.
    </p>
    <div class="stats" id="hero-stats"></div>
    <p class="byline">Berdasarkan 9 laporan tahunan eLSA Semarang, 2016&ndash;2024</p>
  </div>
</header>

<section class="section">
  <div class="section-inner">
    <p class="kicker">01 &middot; Peta</p>
    <h2>Bukan tentang intoleransi, tapi tentang jangkauan pemantauan</h2>
    <p class="lead">
      Kota Semarang dan Surakarta mendominasi &mdash; tapi itu karena kantor
      eLSA ada di sana, bukan karena paling intoleran. Tiga kabupaten bernilai
      nol karena tidak tercatat, bukan karena tidak ada kasus.
    </p>
    <div id="map" class="map"></div>
    <p class="caption">
      Ukuran &amp; warna lingkaran sebanding dengan jumlah kasus unik per
      kab/kota. Tiga kabupaten bernilai nol ditandai abu-abu.
    </p>
  </div>
</section>

<section class="section section-dark">
  <div class="section-inner">
    <p class="kicker">02 &middot; Waktu</p>
    <h2>Negara terlibat di 41% pelanggaran</h2>
    <p class="lead">
      Dari 141 kasus pelanggaran (2016&ndash;2024), 58 melibatkan negara.
      Mayoritas berupa aksi langsung &mdash; bukan sekadar pembiaran.
    </p>
    <div class="chart-wrap"><canvas id="timeline-chart"></canvas></div>
    <p class="caption">
      Per tahun. &ldquo;Negara&rdquo; termasuk aparat, pemkab, disdukcapil,
      kemenag. &ldquo;Campuran&rdquo; = negara &amp; non-negara terlibat dalam
      kasus yang sama.
    </p>
  </div>
</section>

<section class="section">
  <div class="section-inner">
    <p class="kicker">03 &middot; Yang Terdampak</p>
    <h2>Penghayat: dua kali lipat lebih sering berhadapan dengan negara</h2>
    <p class="lead">
      Dari semua kelompok agama di Jawa Tengah, penghayat kepercayaan adalah
      yang paling sering berhadapan dengan negara. Bukan karena mereka lebih
      rentan terhadap ormas &mdash; tapi karena jalur administratif lebih
      mudah dihambat.
    </p>
    <div class="chart-wrap"><canvas id="agama-chart"></canvas></div>
    <p class="caption">
      Persentase kasus yang melibatkan negara, per agama/keyakinan terdampak.
      Hanya kelompok dengan &ge;5 kasus yang ditampilkan.
    </p>

    <h3 class="sub-head">Dari 14 kasus penghayat yang melibatkan negara:</h3>
    <div class="breakdown" id="breakdown"></div>
    <p class="caption">
      Tidak satu pun berupa kekerasan fisik. Sebelas dari 14 (79%) lewat jalur
      administratif &mdash; pendidikan, kependudukan, atau perizinan.
    </p>
  </div>
</section>

<section class="section section-dark">
  <div class="section-inner">
    <p class="kicker">04 &middot; Suara dari Lapangan</p>
    <h2>Empat kasus yang menjelaskan pola</h2>
    <div class="cases" id="cases"></div>
  </div>
</section>

<footer class="footer">
  <div class="footer-inner">
    <h3>Metodologi &amp; Disclaimer</h3>
    <ul>
      <li>Basis analisis: 141 kasus pelanggaran (dari 145 kasus-tahun; 4 positif &amp; 6 respons dikeluarkan).</li>
      <li>&ldquo;Negara&rdquo; termasuk aksi langsung (kepolisian, Pemkab, Disdukcapil, Kemenag) dan pembiaran (IMB tidak diputuskan, dll).</li>
      <li>Data = kasus yang dilaporkan eLSA, bukan seluruh pelanggaran KBB di Jateng.</li>
      <li>Dominasi Semarang &amp; Surakarta mencerminkan jangkauan pemantauan, bukan tingkat intoleransi.</li>
      <li>Format laporan eLSA berubah tiap tahun &mdash; jangan dibaca sebagai tren linier.</li>
    </ul>
    <p class="credit">
      Sumber: eLSA Semarang, <em>Laporan Tahunan Kebebasan Beragama dan
      Berkeyakinan di Jawa Tengah</em>, 2016&ndash;2024.
    </p>
  </div>
</footer>

<script src="assets/js/main.js"></script>
</body>
</html>
"""

CSS = """\"\"\"CSS utama KBB Jateng.\"\"\"
:root {
  --ink: #1a1a1a; --paper: #fafaf7; --accent: #c1272d;
  --muted: #666; --border: #e0ddd6;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, "Times New Roman", serif; color: var(--ink);
  background: var(--paper); line-height: 1.6; }
.hero { padding: 8rem 1.5rem 6rem; border-bottom: 1px solid var(--border); }
.hero-inner { max-width: 720px; margin: 0 auto; }
.kicker { font-family: system-ui, sans-serif; font-size: 0.75rem;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent);
  font-weight: 600; margin-bottom: 1.5rem; }
h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; font-weight: 700;
  margin-bottom: 1.5rem; letter-spacing: -0.02em; }
h2 { font-size: clamp(1.5rem, 3vw, 2.25rem); line-height: 1.2; font-weight: 700;
  margin-bottom: 1.5rem; }
h3.sub-head { font-size: 1.15rem; margin: 3rem 0 1.5rem;
  font-family: system-ui, sans-serif; font-weight: 600; }
.dek, .lead { font-size: 1.25rem; line-height: 1.5; color: #333;
  margin-bottom: 2rem; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;
  margin: 3rem 0 2rem; padding: 2rem 0;
  border-top: 2px solid var(--ink); border-bottom: 1px solid var(--border); }
.stat-number { font-size: 3rem; font-weight: 700; line-height: 1;
  color: var(--accent); margin-bottom: 0.5rem; }
.stat-label { font-family: system-ui, sans-serif; font-size: 0.85rem;
  color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.byline { font-family: system-ui, sans-serif; font-size: 0.85rem;
  color: var(--muted); margin-top: 2rem; }
.section { padding: 6rem 1.5rem; }
.section-dark { background: #1a1a1a; color: #f0ede5; }
.section-dark .lead { color: #ccc; }
.section-dark .caption { color: #888; }
.section-inner { max-width: 900px; margin: 0 auto; }
.map { height: 500px; width: 100%; margin: 2rem 0; border-radius: 4px;
  overflow: hidden; border: 1px solid var(--border); }
.chart-wrap { position: relative; height: 400px; margin: 2rem 0; }
.caption { font-family: system-ui, sans-serif; font-size: 0.85rem;
  color: var(--muted); font-style: italic; margin-top: 1rem; }
.breakdown { display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 1px; background: var(--border); margin: 1.5rem 0;
  border: 1px solid var(--border); }
.bd-item { background: var(--paper); padding: 1.5rem 1rem; text-align: center; }
.bd-num { font-size: 2.5rem; font-weight: 700; color: var(--accent);
  line-height: 1; }
.bd-label { font-family: system-ui, sans-serif; font-size: 0.8rem;
  color: var(--muted); margin-top: 0.5rem; text-transform: uppercase;
  letter-spacing: 0.05em; }
.cases { margin-top: 3rem; }
.case { display: grid; grid-template-columns: 80px 1fr; gap: 2rem;
  padding: 3rem 0; border-top: 1px solid #333; }
.case:first-child { border-top: none; padding-top: 0; }
.case-num { font-size: 3rem; font-weight: 700; color: var(--accent);
  line-height: 1; font-family: Georgia, serif; }
.case-label { font-family: system-ui, sans-serif; font-size: 0.7rem;
  color: var(--accent); text-transform: uppercase; letter-spacing: 0.15em;
  margin-bottom: 0.5rem; font-weight: 600; }
.case-meta { font-family: system-ui, sans-serif; font-size: 0.85rem;
  color: #888; margin-bottom: 1rem; }
.case h3 { font-size: 1.5rem; line-height: 1.3; margin-bottom: 1rem;
  color: #fff; }
.case-ringkasan { font-size: 1.05rem; line-height: 1.6; color: #ccc;
  margin-bottom: 1rem; }
.case-status { font-family: system-ui, sans-serif; font-size: 0.85rem;
  color: #999; }
.footer { padding: 4rem 1.5rem; background: #0f0f0f; color: #aaa;
  font-family: system-ui, sans-serif; font-size: 0.9rem; }
.footer-inner { max-width: 720px; margin: 0 auto; }
.footer h3 { color: #fff; font-size: 1.1rem; margin-bottom: 1.5rem; }
.footer ul { list-style: none; padding: 0; margin-bottom: 2rem; }
.footer li { padding: 0.5rem 0 0.5rem 1.5rem; position: relative;
  line-height: 1.5; }
.footer li::before { content: "\\2192"; position: absolute; left: 0;
  color: var(--accent); }
@media (max-width: 640px) {
  .stats { grid-template-columns: 1fr; gap: 1.5rem; }
  .map { height: 350px; }
  .breakdown { grid-template-columns: repeat(2, 1fr); }
  .case { grid-template-columns: 1fr; gap: 1rem; padding: 2rem 0; }
  .case-num { font-size: 2rem; }
}
"""

JS = """// KBB Jateng -- hero + peta + timeline + agama + breakdown + kasus
const RED = "#c1272d";

async function loadJSON(name) {
  const r = await fetch("assets/data/" + name);
  if (!r.ok) throw new Error("Gagal load " + name);
  return r.json();
}

async function initHero() {
  const r = await loadJSON("ringkasan.json");
  const stats = [
    { num: r.total_pelanggaran, label: "Kasus pelanggaran" },
    { num: r.pct_negara + "%", label: "Melibatkan negara" },
    { num: r.pct_penghayat_negara + "%", label: "Kasus penghayat melibatkan negara" },
  ];
  document.getElementById("hero-stats").innerHTML = stats.map(
    (s) => '<div class="stat"><div class="stat-number">' + s.num +
      '</div><div class="stat-label">' + s.label + "</div></div>"
  ).join("");
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
      scales: {
        x: { stacked: true, ticks: { color: "#ccc" }, grid: { display: false } },
        y: { stacked: true, ticks: { color: "#ccc" }, grid: { color: "#333" } },
      },
      plugins: { legend: { labels: { color: "#eee" } },
        tooltip: { mode: "index", intersect: false } },
    },
  });
}

async function initAgamaChart() {
  const data = await loadJSON("agama_vs_negara.json");
  const ctx = document.getElementById("agama-chart").getContext("2d");
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
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = data[ctx.dataIndex];
              return d.pct_negara + "% (" + d.negara_terlibat +
                " dari " + d.kasus_unik + " kasus)";
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: "#666", callback: (v) => v + "%" }, max: 80,
          grid: { color: "#e5e5e5" } },
        y: { ticks: { color: "#1a1a1a", font: { size: 14, weight: "600" } },
          grid: { display: false } },
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
  document.getElementById("cases").innerHTML = data.map((d, i) =>
    '<article class="case">' +
      '<div class="case-num">' + String(i + 1).padStart(2, "0") + "</div>" +
      '<div class="case-body">' +
        '<p class="case-label">' + (labels[d.id_kasus] || "") + "</p>" +
        '<p class="case-meta">' + d.nama_wilayah + " · " + d.tahun +
          " · " + d.peran_negara_ringkas + "</p>" +
        "<h3>" + d.judul_baku + "</h3>" +
        '<p class="case-ringkasan">' + d.ringkasan_sesuai_laporan + "</p>" +
        '<p class="case-status"><strong>Status:</strong> ' + d.status + "</p>" +
      "</div>" +
    "</article>"
  ).join("");
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
"""

FILES = {
    "web/index.html": HTML,
    "web/assets/css/style.css": CSS,
    "web/assets/js/main.js": JS,
}

for path, content in FILES.items():
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print("OK", path, "(" + str(len(content)) + " chars)")
