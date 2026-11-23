import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { config } from "../src/CofsExplorer/config.js";
import { colorSpec, filterIndices, fnv1a32, propertiesJson, propertyRows, resolvePreset, shardFile, shardOf } from "../src/common/data.js";
import { scatterFigure, wrapTitle } from "../src/common/figure.js";

// a tiny table in the format of public/data/table.json
const table = {
  n: 5,
  names: ["a", "b", "c", "d", "e"],
  columns: {
    density: [100, 300, 500, 900, 1300],
    deliverable_capacity: [10, 200, 250, 180, 20],
    surface_area: [1, 2, 3, 4, 5],
  },
  categories: {
    dimensions: { values: [2, 3], codes: [0, 1, 1, 0, 1] },
    bond_type: { values: ["amide", "amine", "imine", "CC", "mixed"], codes: [0, 2, 2, 3, 4] },
  },
};

test("shard hash: fixed names (same values as the Python script)", () => {
  const expected = {
    default: 990,
    a: 300,
    linker91_CO_linker87_NH_hcb_relaxed: 459,
    linker100_CH_linker41_N_umc_relaxed_interp_3: 0,
    linker98_CO_linker95_NH_pto_relaxed: 983,
  };
  for (const [name, shard] of Object.entries(expected)) assert.equal(shardOf(name, 1024), shard, name);
  assert.equal(fnv1a32(""), 0x811c9dc5);
  assert.equal(fnv1a32("a"), 0xe40c292c); // the FNV-1a test vector
  assert.equal(shardFile("linker100_CH_linker41_N_umc_relaxed_interp_3", 1024), "details/000.json.gz");
  assert.equal(shardFile("linker91_CO_linker87_NH_hcb_relaxed", 1024), "details/1cb.json.gz");
  assert.equal(shardFile("é", 1024), shardFile("é", 1024)); // UTF-8, not UTF-16 units
  // no shard count: one file per entry
  assert.equal(shardFile("EDUVOO", undefined), "details/EDUVOO.json.gz");
});

test("shard hash agrees with scripts/prepareForFrontend.py", (t) => {
  const script = fileURLToPath(new URL("../scripts/prepareForFrontend.py", import.meta.url));
  const names = ["x", "COF-1", "linker1_N_linker2_CH_dia_relaxed", "naïve", "日本"];
  let out;
  try {
    out = execFileSync(
      "python3",
      [
        "-I",
        "-c",
        "import importlib.util, sys, json\n" +
          "s = importlib.util.spec_from_file_location('p', sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)\n" +
          "print(json.dumps([m.shard_of(n) for n in sys.argv[2:]]), m.SHARDS)",
        script,
        ...names,
      ],
      { encoding: "utf8" },
    );
  } catch {
    return t.skip("python3 not available");
  }
  const cut = out.trim().lastIndexOf(" ");
  const [shards, count] = [out.slice(0, cut), out.slice(cut)];
  assert.equal(Number(count), config.shardCount);
  assert.deepEqual(JSON.parse(shards), names.map((n) => shardOf(n, config.shardCount)));
});

test("preset: default, inheritance, unknown", () => {
  const d = resolvePreset(config, "default");
  assert.deepEqual([d.key, d.x, d.y, d.clr], ["default", "density", "deliverable_capacity", "bond_type"]);
  assert.deepEqual(d.filters, {
    dimensions: [2, 3],
    bond_type: ["amide", "amine", "imine", "CC", "mixed"],
    deliverable_capacity: [175, 300],
    density: [10, 1200],
    surface_area: [0, 12000],
  });
  // no clr in the preset: the default's; filters not set: everything (the default's 175-300 is not inherited)
  const p = resolvePreset(config, "3a");
  assert.equal(p.clr, "bond_type");
  assert.equal(p.y, "surface_area");
  assert.deepEqual(p.filters.dimensions, [2]);
  assert.deepEqual(p.filters.density, [0, 800]);
  assert.deepEqual(p.filters.deliverable_capacity, [0, 300]);
  assert.deepEqual(resolvePreset(config, "nope"), d);
  assert.deepEqual(resolvePreset(config, undefined), d);
  assert.equal(resolvePreset(config, "toString").key, "default");
});

test("presets: consistent with the config", () => {
  // a preset only sets axes, colour and filters that exist
  const known = new Set(["x", "y", "clr", ...config.filters]);
  for (const [key, preset] of Object.entries(config.presets)) {
    for (const field of Object.keys(preset)) assert.ok(known.has(field), `${key}.${field}`);
  }
  // every gallery figure is a preset; every preset has valid axes
  for (const { key } of config.gallery) assert.ok(config.presets[key], key);
  for (const key of Object.keys(config.presets)) {
    const r = resolvePreset(config, key);
    assert.ok(r.x && r.y && r.clr, key);
    assert.ok(r.filters.bond_type.length > 0, key);
  }
});

test("filters: ranges, lists, full selections do not filter", () => {
  const all = resolvePreset(config, "default").filters;
  const f = (patch) => filterIndices(table, config, { ...all, deliverable_capacity: [0, 300], ...patch });
  assert.deepEqual(f({}), [0, 1, 2, 3, 4]);
  // density 1300 is above the range (10-1200) but stays while the slider is untouched
  assert.deepEqual(f({ density: [10, 1200] }), [0, 1, 2, 3, 4]);
  assert.deepEqual(f({ density: [100, 500] }), [0, 1, 2]); // bounds inclusive
  assert.deepEqual(f({ dimensions: [3] }), [1, 2, 4]);
  assert.deepEqual(f({ bond_type: ["imine", "CC"] }), [1, 2, 3]);
  assert.deepEqual(f({ bond_type: [] }), []);
  assert.deepEqual(f({ dimensions: [3], bond_type: ["imine"], deliverable_capacity: [175, 300] }), [1, 2]);
});

test("filters: missing values", () => {
  const t = { n: 3, columns: { density: [100, null, 300], surface_area: [1, 2, null] }, categories: table.categories };
  const all = resolvePreset(config, "default").filters;
  const f = (patch, required) => filterIndices(t, config, { ...all, deliverable_capacity: [0, 300], dimensions: [2, 3], bond_type: config.columns[1].values, ...patch }, required);
  assert.deepEqual(f({}), [0, 1, 2]); // untouched filters keep missing values
  assert.deepEqual(f({ density: [0, 1000] }), [0, 2]); // an active filter does not
  assert.deepEqual(f({}, ["density", "surface_area"]), [0]); // the plotted columns must be there
  assert.deepEqual(f({}, ["bond_type"]), [0, 1, 2]); // list columns are never missing
});

test("colours: bond types and continuous", () => {
  const cat = colorSpec(table, config, "bond_type", [0, 1, 2, 3, 4]);
  assert.equal(cat.kind, "category");
  // the order of the values; amine has no point
  assert.deepEqual(cat.groups.map((g) => [g.value, g.color, g.indices]), [
    ["amide", "#1f77b4", [0]],
    ["imine", "#ff7f0e", [1, 2]],
    ["CC", "#2ca02c", [3]],
    ["mixed", "#778899", [4]],
  ]);
  const num = colorSpec(table, config, "density", [1, 3, 4]);
  assert.deepEqual(num, { kind: "continuous", values: [300, 900, 1300], min: 300, max: 1300, colorscale: "Viridis" });
});

test("figure: WebGL traces, one per bond type or one with a colorbar", () => {
  const byBond = scatterFigure(table, config, { x: "density", y: "deliverable_capacity", clr: "bond_type" }, [0, 1, 2]);
  assert.ok(byBond.data.every((t) => t.type === "scattergl"));
  assert.deepEqual(byBond.data.map((t) => t.name), ["amide", "imine"]);
  assert.deepEqual(byBond.data[1].x, [300, 500]);
  assert.deepEqual(byBond.data[1].customdata, [["b"], ["c"]]);
  assert.equal(byBond.layout.xaxis.title.text, "Density [kg/m^3]");
  const byNum = scatterFigure(table, config, { x: "density", y: "deliverable_capacity", clr: "surface_area" }, [3, 4]);
  assert.equal(byNum.data.length, 1);
  assert.deepEqual(byNum.data[0].marker.color, [4, 5]);
  assert.equal(byNum.data[0].marker.showscale, true);
  assert.deepEqual(byNum.data[0].customdata, [["d", 4], ["e", 5]]);
});

test("properties: sorted rows and JSON", () => {
  const props = { "num_carbon": 108, "density [kg/m^3]": 260.5, bond_type: "amide", name: "n" };
  assert.deepEqual(propertyRows(props), [
    ["bond_type", "amide"],
    ["density [kg/m^3]", "260.5"],
    ["name", "n"],
    ["num_carbon", "108"],
  ]);
  const json = propertiesJson(props);
  assert.deepEqual(Object.keys(JSON.parse(json)), ["bond_type", "density [kg/m^3]", "name", "num_carbon"]);
  assert.equal(JSON.parse(json).num_carbon, 108);
});

test("config: columns, filters and presets agree", () => {
  const columns = new Set(config.columns.map((q) => q.column));
  for (const f of config.filters) assert.ok(columns.has(f), f);
  for (const c of Object.keys(config.categoryColors)) {
    const q = config.columns.find((x) => x.column === c);
    assert.deepEqual(Object.keys(config.categoryColors[c]).sort(), [...q.values].sort());
  }
  for (const [key, preset] of Object.entries(config.presets)) {
    assert.ok(columns.has(preset.x) && columns.has(preset.y), key);
  }
});

test("wrapTitle: lines of at most 18 characters, long words kept whole", () => {
  assert.equal(wrapTitle("Largest included sphere diameter"), "Largest included<br>sphere diameter");
  assert.equal(wrapTitle("Density"), "Density");
  assert.equal(wrapTitle("Supercalifragilisticexpialidocious x"), "Supercalifragilisticexpialidocious<br>x");
});
