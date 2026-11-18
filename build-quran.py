import json
from pathlib import Path

source = Path("quran-uthmani.txt")
if not source.exists():
    raise SystemExit("ERROR: Quran source file is missing")

surahs = {}

for line in source.read_text(encoding="utf-8").splitlines():
    if not line or line.startswith("#"):
        continue

    parts = line.split("|", 2)
    if len(parts) != 3:
        continue

    s, a, text = parts
    s, a = int(s), int(a)

    surahs.setdefault(s, []).append({
        "number": a,
        "text": text
    })

total = sum(len(v) for v in surahs.values())

if len(surahs) != 114 or total != 6236:
    raise SystemExit(
        f"ERROR: Found {len(surahs)} surahs and {total} ayahs"
    )

if len(surahs[1]) != 7 or len(surahs[2]) != 286 or len(surahs[114]) != 6:
    raise SystemExit("ERROR: Quran validation failed")

for number, ayahs in surahs.items():
    if [x["number"] for x in ayahs] != list(range(1, len(ayahs) + 1)):
        raise SystemExit(f"ERROR: Ayah numbering problem in surah {number}")

data = [
    {"number": number, "ayahs": ayahs}
    for number, ayahs in surahs.items()
]

output = "window.OMNIX_QURAN = " + json.dumps(
    data, ensure_ascii=False, separators=(",", ":")
) + ";"

for target in [Path("quran-data.js"), Path("www/quran-data.js")]:
    target.write_text(output, encoding="utf-8")

Path("QURAN-SOURCE.txt").write_text(
    "Quran text source: Tanzil Project (tanzil.net)\n"
    "Uthmani text. Preserve the text unchanged.\n"
    "Attribution and license: https://tanzil.net/docs/terms\n",
    encoding="utf-8"
)

print("QURAN DATA READY")
print("Surahs:", len(surahs))
print("Ayahs:", total)
print("Al-Fatiha:", len(surahs[1]), "ayahs")
print("Al-Baqarah:", len(surahs[2]), "ayahs")
print("An-Nas:", len(surahs[114]), "ayahs")
print("Generated quran-data.js and www/quran-data.js")
