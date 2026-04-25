import json
import os
import sqlite3
from pathlib import Path

# Ruta al archivo SQLite de origen
SQLITE_PATH = r"C:\Users\senis\Downloads\ExportarBas\ExportarBas\prueba.db"

# Carpeta destino para los JSON exportados
OUT_DIR = Path(__file__).resolve().parent.parent / "data_export"

TABLES = ["proveedores", "productos", "ventas", "venta_items"]

def export_table(cursor: sqlite3.Cursor, table: str) -> list[dict]:
    cursor.execute(f"SELECT * FROM {table}")
    rows = cursor.fetchall()
    colnames = [d[0] for d in cursor.description]
    result: list[dict] = []
    for r in rows:
        obj = {col: r[i] for i, col in enumerate(colnames)}
        result.append(obj)
    return result

def main() -> None:
    if not os.path.exists(SQLITE_PATH):
        raise SystemExit(f"No existe el archivo SQLite en: {SQLITE_PATH}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    con = sqlite3.connect(SQLITE_PATH)
    cur = con.cursor()

    report: dict[str, int] = {}
    for table in TABLES:
        data = export_table(cur, table)
        with open(OUT_DIR / f"{table}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        report[table] = len(data)

    con.close()

    with open(OUT_DIR / "_export_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("Exportación completa:")
    for t, n in report.items():
        print(f" - {t}: {n} registros")
    print(f"Archivos en: {OUT_DIR}")

if __name__ == "__main__":
    main()
