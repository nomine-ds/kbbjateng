"""01 -- Load & validasi data KBB Jateng 2016-2024.

Jalankan sebagai skrip: python notebooks/01_load_validate.py
Atau konversi ke notebook: jupytext --to notebook notebooks/01_load_validate.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pandas as pd
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 140)

from src.load import load_viz
from src.validate import validate
from src.helpers import (
    total_per_tahun,
    total_per_kategori,
    total_per_wilayah,
    distribusi_peran_negara,
)


def main():
    print("\n== 1. VALIDASI ==\n")
    validate()

    print("\n== 2. MUAT DATA ==\n")
    d = load_viz()
    t = d["viz_tabel_lebar"]
    print(f"viz_tabel_lebar: {t.shape[0]} baris x {t.shape[1]} kolom")

    print("\n== 3. ANGKA KUNCI #1 -- Total kasus-tahun ==\n")
    n_baris = len(t)
    n_unik = int(t["hitung_kasus_unik_tahun"].sum())
    n_respons = int((t["hitung_kasus_unik_tahun"] == 0).sum())
    n_kasus_unik_id = t.loc[t["hitung_kasus_unik_tahun"] == 1, "id_kasus"].nunique()
    print(f"Baris total             : {n_baris}")
    print(f"Kasus-tahun (SUM)       : {n_unik}")
    print(f"Baris respons (hitung=0): {n_respons}")
    print(f"ID kasus unik           : {n_kasus_unik_id}")

    print("\n== 4. ANGKA KUNCI #2 -- Distribusi per tahun ==\n")
    per_tahun = total_per_tahun(t)
    per_tahun["persen"] = (per_tahun["kasus"] / per_tahun["kasus"].sum() * 100).round(1)
    print(per_tahun.to_string(index=False))
    print(f"Total: {per_tahun['kasus'].sum()}")

    print("\n== 5. ANGKA KUNCI #3 -- Top wilayah ==\n")
    per_wilayah = total_per_wilayah(t)
    per_wilayah["persen"] = (per_wilayah["kasus"] / per_wilayah["kasus"].sum() * 100).round(1)
    print("TOP 5 wilayah:")
    print(per_wilayah.head(5).to_string(index=False))
    print(f"Jumlah wilayah dengan >=1 kasus: {len(per_wilayah)}/35")

    print("\n== 6. ANGKA KUNCI #4 -- Kategori kasus terbanyak ==\n")
    per_kategori = total_per_kategori(t)
    per_kategori["persen"] = (per_kategori["kasus"] / per_kategori["kasus"].sum() * 100).round(1)
    print(per_kategori.to_string(index=False))

    print("\n== 7. ANGKA KUNCI #5 -- Peran negara ==\n")
    peran = distribusi_peran_negara(t)
    peran["persen"] = (peran["kasus"] / peran["kasus"].sum() * 100).round(1)
    print(peran.to_string(index=False))
    print(f"Total: {peran['kasus'].sum()}")

    print("\n== 8. EKSPOR HASIL ==\n")
    OUT = ROOT / "data" / "processed"
    OUT.mkdir(exist_ok=True, parents=True)
    per_tahun.to_csv(OUT / "ringkasan_per_tahun.csv", index=False)
    per_kategori.to_csv(OUT / "ringkasan_per_kategori.csv", index=False)
    per_wilayah.to_csv(OUT / "ringkasan_per_wilayah.csv", index=False)
    peran.to_csv(OUT / "ringkasan_peran_negara.csv", index=False)
    print(f"Tersimpan di: {OUT}")
    for f in sorted(OUT.glob("*.csv")):
        print(f"  - {f.name}")


if __name__ == "__main__":
    main()
