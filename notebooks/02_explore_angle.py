"""02 -- Uji angle: Negara sebagai penghalang, penghayat sebagai korban utama.

Jalankan: python notebooks/02_explore_angle.py

Tujuan: uji 5 hipotesis sebelum menulis narasi.
1. Berapa "kasus pelanggaran" (setelah exclude arah=Positif)?
2. Negara: aksi langsung vs pembiaran -- mana yang dominan?
3. Penghayat vs kelompok lain: apakah penghayat outlier?
4. Trace kasus penghayat: mana yang bisa jadi narasi?
5. Distribusi per tahun: apakah 2021 & 2023 outlier?
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 220)
pd.set_option("display.max_colwidth", 70)

from src.load import load_viz, load_master


def header(no, title):
    print("\n" + "=" * 75)
    print(f"  {no}. {title}")
    print("=" * 75)


def main():
    d = load_viz()
    m = load_master()
    t = d["viz_tabel_lebar"]
    kl = d["viz_kelompok_long"]

    # ================================================================
    # 1. Berapa kasus "pelanggaran"?
    # ================================================================
    header(1, "KASUS PELANGGARAN = hitung=1 DAN arah != Positif")

    n_all = int(t["hitung_kasus_unik_tahun"].sum())
    n_positif = t[t["arah"] == "Positif"]
    n_pos_hitung1 = int(n_positif["hitung_kasus_unik_tahun"].sum())
    n_pelanggaran = n_all - n_pos_hitung1
    print(f"Total kasus-tahun (semua)       : {n_all}")
    print(f"  arah=Positif (semua)          : {len(n_positif)} baris "
          f"({n_pos_hitung1} di antaranya hitung=1)")
    print(f"KASUS PELANGGARAN (basis baru)  : {n_pelanggaran}")
    print()
    print("Positif yang dimaksud (10 baris):")
    print(n_positif[["id_kasus", "tahun", "nama_wilayah",
                    "peran_negara_ringkas", "status"]]
          .sort_values("tahun").to_string(index=False))

    # ================================================================
    # 2. Negara: aksi langsung vs pembiaran
    # ================================================================
    header(2, "NEGARA: AKSI LANGSUNG vs PEMBIARAN (hanya pelanggaran)")

    pel = t[(t["hitung_kasus_unik_tahun"] == 1) & (t["arah"] != "Positif")]

    print(f"Total kasus pelanggaran: {len(pel)}")
    print()
    print("Peran negara ringkas:")
    for k, v in pel["peran_negara_ringkas"].value_counts().items():
        print(f"  {k:<15}: {v:>3}  ({v/len(pel)*100:.1f}%)")
    print()
    print("Bentuk peran negara:")
    bentuk = pel["bentuk_peran_negara"].fillna("(non-negara)").replace("—", "(non-negara)")
    for k, v in bentuk.value_counts().items():
        print(f"  {k:<35}: {v:>3}")

    n_langsung = int((bentuk == "Aksi langsung").sum())
    n_pembiaran = int((bentuk == "Pembiaran/tidak memutuskan").sum())
    n_campur = int((bentuk == "Campuran").sum())
    print()
    print(f"Breakdown: {n_langsung} aksi langsung + "
          f"{n_pembiaran} pembiaran + {n_campur} campuran = "
          f"{n_langsung + n_pembiaran + n_campur}")

    # ================================================================
    # 3. Penghayat vs kelompok lain
    # ================================================================
    header(3, "PENGHATAT vs KELOMPOK LAIN: PROPORS1 NEGARA (kasus-level)")

    kl_pel = kl[(kl["hitung_kasus_unik_tahun"] == 1) & (kl["arah"] != "Positif")]
    kl_uniq = kl_pel.drop_duplicates(["id_kasus", "tahun", "agama_induk_baku"])

    rows = []
    for agama, grp in kl_uniq.groupby("agama_induk_baku"):
        cases = grp["id_kasus"].unique()
        total = len(cases)
        negara_cases = grp[grp["peran_negara_ringkas"].isin(["Negara", "Campuran"])]["id_kasus"].unique()
        nonnegara_only = grp[~grp["id_kasus"].isin(negara_cases)]["id_kasus"].unique()
        rows.append({
            "agama": agama,
            "kasus_unik": total,
            "negara_terlibat": len(negara_cases),
            "hanya_non_negara": len(nonnegara_only),
            "pct_negara": round(len(negara_cases) / total * 100, 1) if total else 0,
        })
    df_agama = pd.DataFrame(rows).sort_values("kasus_unik", ascending=False)
    print(df_agama.to_string(index=False))

    print()
    print("INTERPRETASI:")
    if len(df_agama[df_agama["agama"] == "Penghayat kepercayaan"]) > 0:
        pct_penghayat = df_agama[df_agama["agama"] == "Penghayat kepercayaan"]["pct_negara"].iloc[0]
        pct_lain = df_agama[df_agama["agama"] != "Penghayat kepercayaan"]["pct_negara"].tolist()
        median_lain = sorted(pct_lain)[len(pct_lain)//2] if pct_lain else 0
        print(f"  Penghayat: {pct_penghayat}%  |  Median agama lain: {median_lain}%")
        if pct_penghayat > median_lain + 10:
            print(f"  -> PENGHATAT OUTLIER: {pct_penghayat - median_lain:.1f}pp di atas median")
        else:
            print(f"  -> Penghayat TIDAK outlier (selisih < 10pp)")

    # ================================================================
    # 4. Trace kasus penghayat
    # ================================================================
    header(4, "TRACE KASUS PENGHATAT (pelanggaran saja)")

    penghayat_only = kl_uniq[kl_uniq["agama_induk_baku"] == "Penghayat kepercayaan"]
    print(f"Total kasus penghayat (unique case): {penghayat_only['id_kasus'].nunique()}")
    print()
    print("Detail per kasus:")
    print(penghayat_only[["id_kasus", "tahun", "kelompok_baku", "nama_wilayah",
                          "jenis_kasus_baku", "peran_negara_ringkas"]]
          .sort_values(["tahun", "id_kasus"])
          .to_string(index=False))

    # ================================================================
    # 5. Distribusi per tahun
    # ================================================================
    header(5, "PENGHATAT PER TAHUN")

    pt = (penghayat_only.groupby("tahun")
          .agg(kasus=("id_kasus", "nunique"))
          .reset_index())
    print(pt.to_string(index=False))
    max_year = pt.loc[pt["kasus"].idxmax()]
    print(f"\nPuncak: {int(max_year['tahun'])} dengan {int(max_year['kasus'])} kasus")
    print("WARNING: format laporan eLSA berubah tiap tahun -- jangan baca sebagai tren")

    # ================================================================
    # 6. Kandidat kasus kunci
    # ================================================================
    header(6, "KANDIDAT KASUS KUNCI UNTUK NARASI")

    kandidat = ["C014", "C019", "C067", "C089", "C116", "C118", "C119", "C122"]
    kd = t[t["id_kasus"].isin(kandidat)][[
        "id_kasus", "tahun", "nama_wilayah", "judul_baku",
        "peran_negara_ringkas", "status"
    ]].drop_duplicates(["id_kasus", "tahun"])
    print(kd.sort_values(["tahun", "id_kasus"]).to_string(index=False))

    # ================================================================
    # 7. Ekspor
    # ================================================================
    header(7, "EKSPOR HASIL EKSPLORASI")

    OUT = ROOT / "data" / "processed"
    OUT.mkdir(exist_ok=True, parents=True)
    df_agama.to_csv(OUT / "angle_agama_vs_negara.csv", index=False)
    penghayat_only.to_csv(OUT / "angle_penghayat_detail.csv", index=False)
    pt.to_csv(OUT / "angle_penghayat_per_tahun.csv", index=False)
    pel[["id_kemunculan", "id_kasus", "tahun", "nama_wilayah",
         "kategori_utama", "peran_negara_ringkas", "bentuk_peran_negara"]].to_csv(
        OUT / "angle_semua_pelanggaran.csv", index=False
    )
    print(f"Tersimpan di: {OUT}")
    for f in sorted(OUT.glob("angle_*.csv")):
        print(f"  - {f.name}")


if __name__ == "__main__":
    main()
