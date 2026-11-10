"""Validasi integritas data sesuai aturan di sheet BACA_DULU.

Jalankan: python -m src.validate
Semua assertion harus lolos sebelum mulai analisis.
"""
from src.load import load_viz


def validate():
    d = load_viz()
    t = d["viz_tabel_lebar"]
    kk = d["viz_kabkota"]
    kkt = d["viz_kabkota_tahun"]
    tk = d["viz_tahun_kategori"]
    tn = d["viz_tahun_peran_negara"]

    print("=" * 60)
    print("VALIDASI DATA KBB JATENG 2016-2024")
    print("=" * 60)

    # --- 1. Jumlah baris & kasus unik ---
    n_baris = len(t)
    n_unik = int(t["hitung_kasus_unik_tahun"].sum())
    assert n_baris == 151, f"Harusnya 151 baris, dapat {n_baris}"
    assert n_unik == 145, f"Harusnya 145 kasus-tahun unik, dapat {n_unik}"
    print(f"[OK] {n_baris} baris = {n_unik} kasus-tahun unik "
          f"(6 baris adalah respons/tindak lanjut)")

    # --- 2. Baris respons (hitung = 0) ---
    respons = t[t["hitung_kasus_unik_tahun"] == 0]
    assert len(respons) == 6, f"Harusnya 6 baris respons, dapat {len(respons)}"
    print(f"[OK] Baris respons (hitung=0): {len(respons)}")
    print(f"     -> id_kasus: {respons['id_kasus'].tolist()}")

    # --- 3. 35 kab/kota lengkap, 3 di antaranya nol ---
    assert len(kk) == 35, f"Harusnya 35 kab/kota, dapat {len(kk)}"
    nol = kk[kk["jumlah_kasus_unik"] == 0]
    assert set(nol["kode_kabkota_bps"]) == {3303, 3315, 3321}, (
        f"Kab/kota bernilai 0 harus 3303/3315/3321, dapat "
        f"{set(nol['kode_kabkota_bps'])}"
    )
    print(f"[OK] 35 kab/kota; 3 dengan nilai 0: {nol['nama_wilayah'].tolist()}")

    # --- 4. Baris tidak dapat dipetakan ---
    tdk_peta = t[t["dapat_dipetakan"] == "tidak"]
    assert len(tdk_peta) == 8, f"Harusnya 8 tidak terpetakan, dapat {len(tdk_peta)}"
    print(f"[OK] Tidak dapat dipetakan (provinsi/lintas wilayah): {len(tdk_peta)}")

    # --- 5. Agregasi lintas tabel ---
    # Tabel level kasus-tahun: harus 145
    for label, df in [
        ("viz_tahun_kategori", tk),
        ("viz_tahun_peran_negara", tn),
    ]:
        s = int(df["jumlah_kasus"].sum())
        assert s == 145, f"{label} harus 145 (kasus-tahun), dapat {s}"
        print(f"[OK] {label} = {s} (kasus-tahun)")

    # Tabel level kasus-tahun TERPETAKAN: 145 - 7 = 138
    s_kkt = int(kkt["jumlah_kasus"].sum())
    assert s_kkt == 138, (
        f"viz_kabkota_tahun harus 138 (kasus-tahun terpetakan), dapat {s_kkt}"
    )
    print(f"[OK] viz_kabkota_tahun = {s_kkt} (kasus-tahun terpetakan)")

    # Tabel level kasus UNIK TERPETAKAN: 132 - 7 = 125
    s_kk = int(kk["jumlah_kasus_unik"].sum())
    assert s_kk == 125, (
        f"viz_kabkota harus 125 (kasus unik terpetakan), dapat {s_kk}"
    )
    print(f"[OK] viz_kabkota = {s_kk} (kasus unik terpetakan)")
    print("[OK] Angka konsisten: 145 kasus-tahun = 138 terpetakan + 7 non-mappable; "
          "132 kasus unik = 125 terpetakan + 7 non-mappable")

    # --- 6. Rentang tahun 2016-2024 ---
    tahun = sorted(t["tahun"].unique().tolist())
    assert tahun == list(range(2016, 2025)), f"Tahun tidak lengkap: {tahun}"
    print(f"[OK] Rentang tahun: {tahun[0]}-{tahun[-1]} ({len(tahun)} laporan)")

    # --- 7. Cek duplikat id_kemunculan ---
    assert t["id_kemunculan"].is_unique, "id_kemunculan duplikat"
    print(f"[OK] id_kemunculan unik: {t['id_kemunculan'].nunique()}")

    # --- 8. Peringatan ---
    print("")
    print("[PENGINGAT METODOLOGIS]")
    print("  - Total per tahun: SUM(hitung_kasus_unik_tahun), BUKAN COUNT baris.")
    print("  - Aktor/kelompok TIDAK bisa dijumlahkan jadi total kasus.")
    print("  - Filter arah != 'Positif' untuk hitung kasus pelanggaran baru.")
    print("=" * 60)
    print("[SUKSES] SEMUA VALIDASI LOLOS")
    print("=" * 60)


if __name__ == "__main__":
    validate()
