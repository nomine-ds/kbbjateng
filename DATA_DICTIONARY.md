# Data Dictionary -- KBB Jateng 2016-2024

Sumber: laporan tahunan eLSA Semarang 2016-2024.
File: `data/raw/KBB_Jateng_2016-2024_recheck.xlsx`

## 7 Aturan Wajib Sebelum Analisis

1. Hitung per tahun pakai `SUM(hitung_kasus_unik_tahun)`, bukan `COUNT` baris.
   151 baris = 145 kasus-tahun (6 baris = respons/tindak lanjut).
2. Jangan jumlahkan aktor/kelompok lintas kategori. Satu kasus bisa >1 aktor.
3. Filter `arah != "Positif"` untuk hitung pelanggaran baru.
4. 3 kab/kota bernilai 0 (Purbalingga 3303, Grobogan 3315, Demak 3321)
   = TIDAK TERCATAT eLSA, bukan berarti tidak ada kasus.
5. 8 baris tidak dapat dipetakan (provinsi/lintas wilayah).
6. Data = kasus yang dilaporkan eLSA, bukan seluruh pelanggaran KBB di Jateng.
   Dominasi Semarang (33) & Surakarta (15) mencerminkan jangkauan pemantauan.
7. `terorisme_ringkas` di luar rekap utama -- satuannya beda, jangan dijumlahkan.

## Skema Tabel Master

| Sheet | Baris | Deskripsi | Kunci |
|---|---|---|---|
| `kasus` | 132 | Satu baris per kasus unik | `id_kasus` |
| `lokasi` | 34 | Kab/kota + provinsi | `id_lokasi` |
| `aktor` | 117 | Aktor dibakukan | `id_aktor` |
| `kelompok_terdampak` | 85 | Kelompok terdampak | `id_kelompok` |
| `laporan` | 9 | Metadata laporan 2016-2024 | `id_laporan` |

## Tabel Bridge

| Sheet | Baris | Deskripsi |
|---|---|---|
| `kemunculan_laporan` | 151 | Kasus x tahun laporan |
| `kemunculan_aktor` | 203 | Kasus x aktor |
| `kemunculan_kelompok` | 167 | Kasus x kelompok |
| `kemunculan_peran_negara` | 151 | Peran negara per kemunculan |
| `kasus_status_log` | 156 | Riwayat status per tahun |

## Tabel Siap Visualisasi

| Sheet | Untuk apa |
|---|---|
| `viz_kabkota` | Peta titik / choropleth (35 baris) |
| `viz_kabkota_tahun` | Heatmap kab/kota x tahun |
| `viz_tahun_kategori` | Bar/line tahun x kategori |
| `viz_tahun_peran_negara` | Bar tahun x peran negara |
| `viz_tahun_agama_terdampak` | Bar tahun x agama terdampak |
| `viz_kelompok_agama_peringkat` | Ranking kelompok terdampak |
| `viz_tahun_kategori_aktor` | Bar tahun x kategori aktor |
| `viz_sankey` | Alur aktor -> kasus -> agama terdampak |
| `viz_tabel_lebar` | Tabel per penyebutan |
| `viz_aktor_long` | Long format aktor |
| `viz_kelompok_long` | Long format kelompok |

## Kolom Kunci `viz_tabel_lebar`

| Kolom | Tipe | Deskripsi |
|---|---|---|
| `id_kemunculan` | str | ID unik penyebutan (M001-M151) |
| `id_kasus` | str | ID kasus (C001-C132) |
| `tahun` | int | Tahun laporan (2016-2024) |
| `hitung_kasus_unik_tahun` | 0/1 | 1 = kasus baru; 0 = respons |
| `dapat_dipetakan` | ya/tidak | `tidak` untuk 8 baris provinsi/lintas |
| `kategori_utama` | str | 9 kategori utama kasus |
| `arah` | str | Negatif / Positif / Netral |
| `peran_negara_ringkas` | str | Negara / Non-negara / Campuran |

## Sitasi

> eLSA Semarang. (2016-2024). Laporan Tahunan Kebebasan Beragama dan
> Berkeyakinan di Jawa Tengah. Semarang: eLSA.
