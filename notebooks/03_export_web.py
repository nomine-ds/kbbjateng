"""03 -- Export data ke JSON untuk visualisasi web.

Output ke web/assets/data/:
  - ringkasan.json            : angka kunci hero
  - choropleth.json           : 35 kab/kota
  - timeline.json             : 141 pelanggaran per tahun
  - penghayat.json            : 21 kasus penghayat detail
  - kasus_kunci.json          : 4 kasus scrollytelling
  - agama_vs_negara.json      : perbandingan 4 agama
  - penghayat_breakdown.json  : breakdown 14 kasus penghayat negara
"""
import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd
from src.load import load_viz

OUT = ROOT / "web" / "assets" / "data"


def clean_records(df):
    records = df.to_dict(orient="records")
    cleaned = []
    for rec in records:
        clean = {}
        for k, v in rec.items():
            if pd.isna(v):
                clean[k] = None
            elif hasattr(v, "item"):
                clean[k] = v.item()
            else:
                clean[k] = v
        cleaned.append(clean)
    return cleaned


def save_json(obj, name):
    OUT.mkdir(exist_ok=True, parents=True)
    path = OUT / name
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    size_kb = path.stat().st_size // 1024
    print(f"  - {name:<28} ({size_kb} KB)")


def main():
    d = load_viz()
    t = d["viz_tabel_lebar"]
    kk = d["viz_kabkota"]
    kl = d["viz_kelompok_long"]

    pel = t[(t["hitung_kasus_unik_tahun"] == 1) & (t["arah"] != "Positif")]

    print("=" * 60)
    print("EXPORT JSON UNTUK WEB")
    print("=" * 60)

    n_pelanggaran = len(pel)
    n_negara = int(pel["peran_negara_ringkas"].isin(["Negara", "Campuran"]).sum())
    pct_negara = round(n_negara / n_pelanggaran * 100, 1)

    bentuk = pel["bentuk_peran_negara"].fillna("(non-negara)").replace("—", "(non-negara)")
    n_langsung = int((bentuk == "Aksi langsung").sum())
    n_pembiaran = int((bentuk == "Pembiaran/tidak memutuskan").sum())

    kl_pel = kl[(kl["hitung_kasus_unik_tahun"] == 1) & (kl["arah"] != "Positif")]
    kl_uniq = kl_pel.drop_duplicates(["id_kasus", "tahun", "agama_induk_baku"])
    penghayat = kl_uniq[kl_uniq["agama_induk_baku"] == "Penghayat kepercayaan"]
    n_penghayat = penghayat["id_kasus"].nunique()
    n_penghayat_negara = penghayat[
        penghayat["peran_negara_ringkas"].isin(["Negara", "Campuran"])
    ]["id_kasus"].nunique()
    pct_penghayat = round(n_penghayat_negara / n_penghayat * 100, 1)

    ringkasan = {
        "total_kasus_tahun": int(t["hitung_kasus_unik_tahun"].sum()),
        "total_pelanggaran": n_pelanggaran,
        "negara_terlibat": n_negara,
        "pct_negara": pct_negara,
        "aksi_langsung": n_langsung,
        "pembiaran": n_pembiaran,
        "penghayat_kasus": n_penghayat,
        "penghayat_negara": n_penghayat_negara,
        "pct_penghayat_negara": pct_penghayat,
        "tahun_min": int(t["tahun"].min()),
        "tahun_max": int(t["tahun"].max()),
    }
    save_json(ringkasan, "ringkasan.json")

    choropleth = clean_records(kk[[
        "kode_kabkota_bps", "nama_wilayah", "jenis_kabkota",
        "lat_perkiraan", "lon_perkiraan",
        "jumlah_kasus_unik", "jumlah_penyebutan", "catatan"
    ]])
    save_json(choropleth, "choropleth.json")

    timeline = []
    for tahun in sorted(pel["tahun"].unique()):
        sub = pel[pel["tahun"] == tahun]
        timeline.append({
            "tahun": int(tahun),
            "total": len(sub),
            "negara": int(sub["peran_negara_ringkas"].eq("Negara").sum()),
            "campuran": int(sub["peran_negara_ringkas"].eq("Campuran").sum()),
            "non_negara": int(sub["peran_negara_ringkas"].eq("Non-negara").sum()),
        })
    save_json(timeline, "timeline.json")

    penghayat_detail = clean_records(
        penghayat[[
            "id_kasus", "tahun", "kelompok_baku", "nama_wilayah",
            "kategori_utama", "jenis_kasus_baku",
            "peran_negara_ringkas", "arah"
        ]].sort_values(["tahun", "id_kasus"])
    )
    save_json(penghayat_detail, "penghayat.json")

    kandidat = ["C118", "C116", "C119", "C089"]
    kasus_df = (
        t[t["id_kasus"].isin(kandidat)]
        .sort_values(["id_kasus", "hitung_kasus_unik_tahun"],
                     ascending=[True, False])
        .drop_duplicates("id_kasus")
    )
    kasus_kunci = clean_records(kasus_df[[
        "id_kasus", "tahun", "nama_wilayah", "judul_baku",
        "ringkasan_sesuai_laporan", "peran_negara_ringkas",
        "bentuk_peran_negara", "status"
    ]])
    save_json(kasus_kunci, "kasus_kunci.json")

    rows = []
    for agama, grp in kl_uniq.groupby("agama_induk_baku"):
        cases = grp["id_kasus"].unique()
        total = len(cases)
        if total < 5:
            continue
        negara_cases = grp[grp["peran_negara_ringkas"].isin(["Negara", "Campuran"])]["id_kasus"].unique()
        rows.append({
            "agama": agama,
            "kasus_unik": total,
            "negara_terlibat": len(negara_cases),
            "pct_negara": round(len(negara_cases) / total * 100, 1),
            "highlight": agama == "Penghayat kepercayaan",
        })
    rows.sort(key=lambda r: -r["pct_negara"])
    save_json(rows, "agama_vs_negara.json")

    pen_negara = penghayat[penghayat["peran_negara_ringkas"].isin(["Negara", "Campuran"])]
    kategori_map = {
        "Pendidikan agama/kepercayaan di sekolah": "Pendidikan agama",
        "Administrasi kependudukan & layanan sipil": "Administrasi kependudukan",
        "Hambatan pendirian/izin rumah ibadah": "Perizinan rumah ibadah",
    }
    breakdown = {}
    for j in pen_negara["jenis_kasus_baku"]:
        key = kategori_map.get(j, "Lainnya")
        breakdown[key] = breakdown.get(key, 0) + 1
    breakdown_list = [{"jenis": k, "jumlah": v} for k, v in breakdown.items()]
    breakdown_list.sort(key=lambda x: (x["jenis"] == "Lainnya", -x["jumlah"]))
    save_json(breakdown_list, "penghayat_breakdown.json")

    print("=" * 60)
    print(f"Selesai. {len(list(OUT.glob('*.json')))} file JSON tersimpan.")
    print(f"Lokasi: {OUT}")
    print("=" * 60)


if __name__ == "__main__":
    main()
