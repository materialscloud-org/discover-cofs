// The shape of public/data/ (made by scripts/prepareForFrontend.py).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { fromCIF } from "matsci-parse";

import { config } from "../src/CofsExplorer/config.js";
import { shardFile, shardOf } from "../src/common/data.js";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
const skip = !fs.existsSync(path.join(DIR, "table.json")) && "run python3 scripts/prepareForFrontend.py first";
const MAX = 25 * 1024 * 1024;
const ROWS = 69840;

const read = (file) => {
  const bytes = fs.readFileSync(path.join(DIR, file));
  return JSON.parse((file.endsWith(".gz") ? zlib.gunzipSync(bytes) : bytes).toString("utf8"));
};
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

test("files: one table, SHARD_COUNT shards, all under 25 MiB, fewer than 20000", { skip }, () => {
  const details = fs.readdirSync(path.join(DIR, "details")).sort();
  assert.equal(details.length, config.shardCount);
  assert.deepEqual(details, Array.from({ length: config.shardCount }, (_, i) => `${i.toString(16).padStart(3, "0")}.json.gz`).sort());
  const files = [...details.map((f) => `details/${f}`), "table.json"];
  assert.deepEqual(fs.readdirSync(DIR).sort(), ["details", "table.json"]);
  for (const f of files) assert.ok(fs.statSync(path.join(DIR, f)).size < MAX, f);
});

test("table.json: every config column, one value per COF", { skip }, () => {
  const table = read("table.json");
  assert.equal(table.n, ROWS);
  assert.equal(table.names.length, ROWS);
  assert.equal(new Set(table.names).size, ROWS);
  for (const q of config.columns) {
    if (q.type === "float") {
      const values = table.columns[q.column];
      assert.equal(values.length, ROWS, q.column);
      assert.ok(values.every(Number.isFinite), q.column);
    } else {
      const { values, codes } = table.categories[q.column];
      assert.deepEqual(values, q.values, q.column);
      assert.equal(codes.length, ROWS);
      assert.ok(codes.every((c) => Number.isInteger(c) && c >= 0 && c < values.length), q.column);
    }
  }
  assert.equal(Object.keys(table.columns).length + Object.keys(table.categories).length, config.columns.length);
});

test("details: the shard of a name holds it, with all 53 properties and a CIF", { skip }, () => {
  const table = read("table.json");
  // a spread of names, the first and last included, from a handful of shards
  const sample = [0, 1, 777, 12345, 40000, 69838, ROWS - 1].map((i) => table.names[i]);
  for (const name of sample) {
    const shard = read(shardFile(name, config.shardCount));
    const entry = shard[name];
    assert.ok(entry, name);
    assert.ok(Object.keys(shard).every((n) => shardOf(n, config.shardCount) === shardOf(name, config.shardCount)));
    assert.equal(Object.keys(entry.properties).length, 53);
    assert.equal(entry.properties.name, name);
    assert.match(entry.cif, /_cell_length_a/);
    // the table and the details agree (the table is rounded to 7 digits)
    const row = table.names.indexOf(name);
    const density = entry.properties["density [kg/m^3]"];
    assert.ok(Math.abs(table.columns.density[row] - density) <= Math.abs(density) * 1e-6);
    assert.equal(entry.properties.bond_type, table.categories.bond_type.values[table.categories.bond_type.codes[row]]);
    assert.ok(Object.hasOwn(entry.properties, "absolute_methane_uptake_high_P [mol/kg]"));
    assert.ok(Object.hasOwn(entry.properties, "absolute_methane_uptake_high_P [v STP/v]"));
  }
});

test("details: the CIFs are the archive's files, and matsci-parse reads them", { skip }, () => {
  const fixtures = fs.readdirSync(FIXTURES).filter((f) => f.endsWith(".cif"));
  assert.equal(fixtures.length, 3);
  for (const file of fixtures) {
    const name = file.slice(0, -".cif".length);
    const entry = read(shardFile(name, config.shardCount))[name];
    assert.equal(entry.cif, fs.readFileSync(path.join(FIXTURES, file), "utf8"), name);
    assert.ok(fromCIF(entry.cif).sites.length > 0, name);
  }
});
