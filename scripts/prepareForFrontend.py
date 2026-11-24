#!/usr/bin/env python3
"""Rebuild everything the app reads (public/data/) from the original archive
files, with the Python standard library only:

    python3 scripts/prepareForFrontend.py [--verify]

Source: Materials Cloud Archive 10.24435/materialscloud:2018.0003/v2 (record
1mb1g-5gm52). raw/properties.tgz and raw/structures.tgz are downloaded from
the archive API when missing, and checked against the archive's md5 sums
(--verify checks the files already there too). The tarballs are read in place,
nothing is extracted. public/data/ is deleted and written again; the output is
deterministic (no timestamps, sorted names).

Output (public/data/):

- table.json: what the scatter plot needs, one entry per COF in CSV order:
    {"n": 69840, "names": [...],
     "columns":    {"density": [...], ...},                numeric columns
     "categories": {"bond_type": {"values": [...], "codes": [...]}, ...}}
  Floats are rounded to 5 decimal places, here and in the details.
- details/<xxx>.json.gz, xxx = hex digits of shard_of(name) (SHARDS files),
  gzipped JSON (the app unpacks it with the browser's DecompressionStream):
    {"<name>": {"properties": {"<column> [<unit>]": value, ...}, "cif": "<the archive's CIF>"}}
  properties holds all 53 CSV columns, keys sorted, floats rounded as above.
  cif is the archive's file as it is (the app parses it with matsci-parse and
  offers it unchanged as the CIF download). Gzipped, the CIFs are a third of
  their text (about 1.1 GB for all COFs); converting them to matsci-parse JSON
  would save only ~13% more and lose what matsci-parse does not read
  (labels, charges and bonds, which other apps' CIFs have).

shard_of is FNV-1a (32 bit) over the UTF-8 bytes of the name, modulo SHARDS;
src/common/data.js has the same function (tests/ compares them on fixed names).

Column keys follow the old app's import_db.py (commit d80c708): "[unit]" removed, text
trimmed, spaces to "_", the unit kept separately.

Decisions (data here, and src/CofsExplorer/config.js, against the old app):
- Methane uptake is in v STP/v (see SCATTER below); the old columns.yml said
  mol/kg, but the old app plotted the v STP/v values (its 7a figure goes to 200).
- The archive's properties.tgz also holds a macOS "._properties.csv": skipped.
- config.js: preset 10b (a duplicate YAML key), presets 12a-12d (colour by
  "net", never an option; 12d was a copy of 12a) and the uptake filters of 7a/7b
  (on a column without a filter, never applied) are dropped; the caption of 3a
  says what it plots (surface area vs density, 2d COFs); the two sphere
  diameters, in the CSV but not in columns.yml, are axes.
"""

import csv
import gzip
import hashlib
import io
import json
import math
import os
import re
import shutil
from concurrent.futures import ThreadPoolExecutor
import sys
import tarfile
import urllib.request

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(APP, "raw")
OUT = os.path.join(APP, "public", "data")

RECORD = "1mb1g-5gm52"
API = f"https://archive.materialscloud.org/api/records/{RECORD}/files"
NEEDED = ["properties.tgz", "structures.tgz"]

SHARDS = 16384
MAX_FILE_BYTES = 25 * 1024 * 1024  # Cloudflare Pages limit per file
MAX_FILES = 20000  # ... and per deployment
EXPECTED_ROWS = 69840

# The columns of the scatter table: (key, kind). "float": numbers;
# "category": codes into a values list (None: sorted values). For "float" the
# third item is the unit to pick when the key has several. Every column of
# columns.yml, filters.yml and presets.yml, and the two sphere diameters that
# the presets use but columns.yml lacks.
# The three uptake columns of the CSV all become absolute_methane_uptake_*_P in
# import_db.py; the ones in v STP/v are used (the ranges in columns.yml, 0-400,
# and the 0-200 filter of preset 7a only fit those).
SCATTER = [
    ("dimensions", "category", None),
    ("bond_type", "category", ["amide", "amine", "imine", "CC", "mixed"]),
    ("density", "float", None),
    ("deliverable_capacity", "float", None),
    ("absolute_methane_uptake_high_P", "float", "v STP/v"),
    ("absolute_methane_uptake_low_P", "float", "v STP/v"),
    ("heat_desorption_high_P", "float", None),
    ("heat_desorption_low_P", "float", None),
    ("supercell_volume", "float", None),
    ("surface_area", "float", None),
    ("largest_free_sphere_diameter", "float", None),
    ("largest_included_sphere_diameter", "float", None),
]


def shard_of(name):
    h = 0x811C9DC5
    for byte in name.encode("utf-8"):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return h % SHARDS


def column_key(label):
    """import_db.rename_columns(): (key, unit or None)."""
    label = label.strip()
    unit_regex = re.compile(r"\[(.*?)\]")
    match = unit_regex.search(label)
    if match:
        return unit_regex.sub("", label).strip().replace(" ", "_"), match.group(
            1
        ).strip()
    return label.replace(" ", "_"), None


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def archive_checksums():
    with urllib.request.urlopen(API) as response:
        entries = json.load(response)["entries"]
    return {e["key"]: e["checksum"].removeprefix("md5:") for e in entries}


def fetch_raw(verify):
    os.makedirs(RAW, exist_ok=True)
    missing = [f for f in NEEDED if not os.path.exists(os.path.join(RAW, f))]
    to_check = NEEDED if verify else missing
    if not to_check:
        return
    sums = archive_checksums()
    for name in to_check:
        path = os.path.join(RAW, name)
        if name in missing:
            print(f"downloading {name} ...")
            part = path + ".part"
            with (
                urllib.request.urlopen(f"{API}/{name}/content") as response,
                open(part, "wb") as out,
            ):
                shutil.copyfileobj(response, out, 1 << 20)
            os.replace(part, path)
        if md5_of(path) != sums[name]:
            sys.exit(f"md5 mismatch for raw/{name}: expected {sums[name]}")
        print(f"md5 ok: {name}")


def read_properties():
    """(keys, units, rows): the CSV's header renamed, rows as lists of str."""
    with tarfile.open(os.path.join(RAW, "properties.tgz")) as tar:
        # the archive also holds a macOS "._properties.csv" resource fork
        member = next(m for m in tar if m.isfile() and m.name == "properties.csv")
        text = io.TextIOWrapper(tar.extractfile(member), encoding="utf-8", newline="")
        reader = csv.reader(text, skipinitialspace=True)
        header = next(reader)
        rows = list(reader)
    keyed = [column_key(h) for h in header]
    keys = [k for k, _ in keyed]
    assert len(set(zip(keys, [u for _, u in keyed]))) == len(keys), (
        "duplicate (key, unit)"
    )
    return keys, [u for _, u in keyed], rows


SHARDS_PER_JOB = 64  # shards per job (~270 COFs); the jobs run in parallel
GZIP_LEVEL = 6  # level 9: 3x slower for 4% smaller files


def write_shards(first, names_by_shard, cifs, properties):
    """shards first .. first + SHARDS_PER_JOB - 1, written gzipped; returns {shard: number of entries}"""
    counts = {}
    for i in range(first, min(first + SHARDS_PER_JOB, SHARDS)):
        entries = {n: {"properties": properties(n), "cif": cifs[n]} for n in names_by_shard[i]}
        write_text_gz(os.path.join(OUT, "details", f"{i:03x}.json.gz"), json.dumps(entries, separators=(",", ":")))
        counts[i] = len(entries)
    return counts


def read_cifs():
    cifs = {}
    with tarfile.open(os.path.join(RAW, "structures.tgz")) as tar:
        for member in tar:
            base = os.path.basename(member.name)
            if (
                not member.isfile()
                or base.startswith("._")
                or not base.endswith(".cif")
            ):
                continue
            cifs[base[: -len(".cif")]] = tar.extractfile(member).read().decode("utf-8")
    return cifs


DECIMALS = (
    5  # the smallest non-zero value in the CSV is 0.0025: >= 3 significant digits kept
)


def number(text):
    """int, or float rounded to DECIMALS places, or None if text is not a finite number."""
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    try:
        value = float(text)
    except ValueError:
        return None
    return round(value, DECIMALS) if math.isfinite(value) else None


def write_json(path, value):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(value, f, separators=(",", ":"))


def write_text_gz(path, text):
    # mtime=0 and no file name in the header: the same bytes every run
    with open(path, "wb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", compresslevel=GZIP_LEVEL, mtime=0) as f:
        f.write(text.encode("utf-8"))


def read_json_gz(path):
    with gzip.open(path, "rb") as f:
        return json.loads(f.read().decode("utf-8"))


def build_table(keys, units, rows):
    index = {}
    for i, (k, u) in enumerate(zip(keys, units)):
        index.setdefault(k, {})[u] = i
    columns, categories = {}, {}
    for key, kind, spec in SCATTER:
        if kind == "float":
            by_unit = index[key]
            column = by_unit[spec] if spec else next(iter(by_unit.values()))
            assert spec or len(by_unit) == 1, f"{key}: several units"
            values = [number(r[column]) for r in rows]
            assert all(v is not None for v in values), key
            columns[key] = [float(v) for v in values]
        else:
            (column,) = index[key].values()
            raw = [r[column] for r in rows]
            values = spec if spec is not None else sorted(set(raw), key=number)
            assert set(raw) <= set(values), f"{key}: unexpected values"
            where = {v: i for i, v in enumerate(values)}
            categories[key] = {
                "values": [number(v) if key == "dimensions" else v for v in values],
                "codes": [where[v] for v in raw],
            }
    names = [r[keys.index("name")] for r in rows]
    return {
        "n": len(rows),
        "names": names,
        "columns": columns,
        "categories": categories,
    }


def detail_properties(keys, units, row):
    props = {}
    for k, u, text in zip(keys, units, row):
        value = number(text)
        props[k if u is None else f"{k} [{u}]"] = text if value is None else value
    return dict(sorted(props.items()))


def main():
    fetch_raw("--verify" in sys.argv)
    keys, units, rows = read_properties()
    print(f"{len(rows)} rows, {len(keys)} columns")
    cifs = read_cifs()
    print(f"{len(cifs)} CIFs")

    name_col = keys.index("name")
    names = [r[name_col] for r in rows]
    assert len(rows) == EXPECTED_ROWS, f"expected {EXPECTED_ROWS} rows, got {len(rows)}"
    assert len(set(names)) == len(names), "duplicate names"
    assert set(names) == set(cifs), "names and CIFs differ"

    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(os.path.join(OUT, "details"))
    table = build_table(keys, units, rows)
    write_json(os.path.join(OUT, "table.json"), table)

    # sorted by name within a shard: the output does not depend on the CSV order
    by_name = {r[name_col]: r for r in rows}
    names_by_shard = [[] for _ in range(SHARDS)]
    for name in sorted(by_name):
        names_by_shard[shard_of(name)].append(name)
    properties = lambda n: detail_properties(keys, units, by_name[n])  # noqa: E731
    counts = {}
    # threads: the compression (zlib) runs outside Python's lock
    with ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
        jobs = [pool.submit(write_shards, first, names_by_shard, cifs, properties) for first in range(0, SHARDS, SHARDS_PER_JOB)]
        for job in jobs:
            counts.update(job.result())
            print(f"  details: {len(counts)} of {SHARDS} shards", end="\r", flush=True)
    print()

    # self-check, from the files as written: every shard there, sizes; a sample read in full
    files = [os.path.join(d, f) for d, _, fs in os.walk(OUT) for f in fs]
    sizes = [os.path.getsize(f) for f in files]
    assert len(files) == SHARDS + 1 and len(files) < MAX_FILES
    assert max(sizes) < MAX_FILE_BYTES, f"file over 25 MiB: {max(sizes)}"
    assert sum(counts.values()) == EXPECTED_ROWS
    for i in range(0, SHARDS, 97):
        shard = read_json_gz(os.path.join(OUT, "details", f"{i:03x}.json.gz"))
        assert len(shard) == counts[i] and all(
            shard_of(n) == i
            and "_cell_length_a" in v["cif"]
            and len(v["properties"]) == len(keys)
            for n, v in shard.items()
        ), f"shard {i:03x}"
    with open(os.path.join(OUT, "table.json"), encoding="utf-8") as f:
        t = json.load(f)
    assert t["n"] == len(t["names"]) == EXPECTED_ROWS
    assert all(len(c) == EXPECTED_ROWS for c in t["columns"].values())
    assert all(len(c["codes"]) == EXPECTED_ROWS for c in t["categories"].values())

    shard_sizes = [
        os.path.getsize(os.path.join(OUT, "details", f"{i:03x}.json.gz"))
        for i in range(SHARDS)
    ]
    mib = 1024 * 1024
    print(f"public/data/: {len(files)} files, {sum(sizes) / mib:.0f} MiB")
    print(
        f"  table.json: {os.path.getsize(os.path.join(OUT, 'table.json')) / mib:.1f} MiB"
    )
    print(
        f"  details/: {SHARDS} shards, {min(shard_sizes) / mib:.1f} to {max(shard_sizes) / mib:.1f} MiB"
    )


if __name__ == "__main__":
    main()
