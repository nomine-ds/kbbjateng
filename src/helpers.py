"""Helper agregasi -- mencegah kesalahan hitung yang umum."""
import pandas as pd


def total_per_tahun(df):
    """Total kasus-tahun per tahun (SUM, bukan COUNT baris)."""
    return (
        df.groupby("tahun", as_index=False)["hitung_kasus_unik_tahun"]
        .sum()
        .rename(columns={"hitung_kasus_unik_tahun": "kasus"})
    )


def total_per_kategori(df):
    """Total kasus per kategori utama, HANYA pelanggaran (arah != Positif)."""
    pelanggaran = df[df["arah"] != "Positif"]
    return (
        pelanggaran.groupby("kategori_utama", as_index=False)
        ["hitung_kasus_unik_tahun"].sum()
        .rename(columns={"hitung_kasus_unik_tahun": "kasus"})
        .sort_values("kasus", ascending=False)
    )


def total_per_wilayah(df):
    """Total kasus-tahun per kab/kota (hanya yang terpetakan)."""
    sub = df[df["dapat_dipetakan"] == "ya"]
    return (
        sub.groupby(["kode_kabkota_bps", "nama_wilayah"], as_index=False)
        ["hitung_kasus_unik_tahun"].sum()
        .rename(columns={"hitung_kasus_unik_tahun": "kasus"})
        .sort_values("kasus", ascending=False)
    )


def distribusi_peran_negara(df):
    """Distribusi kasus menurut peran negara."""
    return (
        df[df["arah"] != "Positif"]
        .groupby("peran_negara_ringkas", as_index=False)
        ["hitung_kasus_unik_tahun"].sum()
        .rename(columns={"hitung_kasus_unik_tahun": "kasus"})
        .sort_values("kasus", ascending=False)
    )
