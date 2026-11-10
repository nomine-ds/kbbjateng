"""Memuat semua sheet yang dibutuhkan dari Excel KBB Jateng."""
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = ROOT / "data" / "raw" / "KBB_Jateng_2016-2024_recheck.xlsx"

VIZ_SHEETS = [
    "viz_kabkota",
    "viz_kabkota_tahun",
    "viz_tahun_kategori",
    "viz_tahun_peran_negara",
    "viz_tahun_agama_terdampak",
    "viz_kelompok_agama_peringkat",
    "viz_tahun_kategori_aktor",
    "viz_sankey",
    "viz_tabel_lebar",
    "viz_aktor_long",
    "viz_kelompok_long",
]

MASTER_SHEETS = [
    "kasus",
    "kemunculan_laporan",
    "kasus_status_log",
    "aktor",
    "kemunculan_aktor",
    "kelompok_terdampak",
    "kemunculan_kelompok",
    "kemunculan_peran_negara",
    "lokasi",
    "laporan",
]


def load_viz():
    """Muat semua sheet berawalan viz_ sebagai dict of DataFrame."""
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(
            f"Excel tidak ditemukan di {EXCEL_PATH}. "
            "Pastikan file ada di data/raw/."
        )
    return {
        name: pd.read_excel(EXCEL_PATH, sheet_name=name)
        for name in VIZ_SHEETS
    }


def load_master():
    """Muat tabel relasional master."""
    return {
        name: pd.read_excel(EXCEL_PATH, sheet_name=name)
        for name in MASTER_SHEETS
    }
