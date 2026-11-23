// The configuration of this app: legacy-python/figure/static/{columns,filters,presets}.yml,
// figure/config.py (bond type colours) and select-figure/main.py (captions)
// as one object, in the format src/common/ reads. The other apps of the family
// (MOFs, ...) replace this file and the data.

// Where the shards of public/data/details/ are chosen (scripts/prepareForFrontend.py: SHARDS)
export const SHARD_COUNT = 1024;

const uptakeRange = [0.0, 400.0];

export const config = {
  title: "Covalent Organic Frameworks",
  itemName: "COFs", // in messages: "12 of 69840 COFs"
  dois: ["10.24435/materialscloud:2018.0003/v2"],
  shardCount: SHARD_COUNT,

  // type "float": a numeric column (a plot axis, a colour, a range filter);
  // type "list": a column of a few values (a checkbox filter)
  columns: [
    { column: "dimensions", type: "list", label: "Dimensionality", values: [2, 3], labels: ["2D layers", "3D network"] },
    { column: "bond_type", type: "list", label: "Bond type", values: ["amide", "amine", "imine", "CC", "mixed"] },
    { column: "density", type: "float", label: "Density", range: [10.0, 1200.0], unit: "kg/m^3" },
    { column: "deliverable_capacity", type: "float", label: "Deliverable capacity", range: [0.0, 300.0], unit: "v STP/v" },
    // uptake in v STP/v (columns.yml said mol/kg: see scripts/prepareForFrontend.py)
    { column: "absolute_methane_uptake_high_P", type: "float", label: "CH4 uptake High-P", range: uptakeRange, unit: "v STP/v" },
    { column: "absolute_methane_uptake_low_P", type: "float", label: "CH4 uptake Low-P", range: uptakeRange, unit: "v STP/v" },
    { column: "heat_desorption_high_P", type: "float", label: "CH4 heat of desorption High-P", range: [0.0, 30.0], unit: "kJ/mol" },
    { column: "heat_desorption_low_P", type: "float", label: "CH4 heat of desorption Low-P", range: [0.0, 30.0], unit: "kJ/mol" },
    { column: "supercell_volume", type: "float", label: "Supercell volume", range: [0.0, 1000000.0], unit: "A^3" },
    { column: "surface_area", type: "float", label: "Geometric surface area", range: [0.0, 12000.0], unit: "m^2/g" },
    // not in columns.yml (only an old preset used them); in the CSV, useful axes
    { column: "largest_free_sphere_diameter", type: "float", label: "Largest free sphere diameter", range: [0.0, 100.0], unit: "A" },
    { column: "largest_included_sphere_diameter", type: "float", label: "Largest included sphere diameter", range: [0.0, 100.0], unit: "A" },
  ],

  // filters.yml, in this order
  filters: ["dimensions", "bond_type", "deliverable_capacity", "density", "surface_area"],

  // list columns that can colour the points, with the colour of each value (figure/config.py);
  // every float column can colour them too (Viridis)
  categoryColors: {
    bond_type: { amide: "#1f77b4", amine: "#d62728", imine: "#ff7f0e", CC: "#2ca02c", mixed: "#778899" },
  },

  // presets.yml: x, y, clr and the filters that differ from "everything"
  defaultPreset: "default",
  presets: {
    default: { clr: "bond_type", x: "density", y: "deliverable_capacity", deliverable_capacity: [175, 300] },
    "3a": { x: "density", y: "surface_area", dimensions: [2], density: [0, 800] },
    "3b": { x: "density", y: "surface_area", dimensions: [3], density: [0, 1200] },
    "7a": { x: "density", y: "absolute_methane_uptake_low_P", density: [0, 1000] },
    "7b": { x: "density", y: "absolute_methane_uptake_high_P", density: [0, 1000] },
    "8b": { x: "density", y: "deliverable_capacity", dimensions: [2] },
    "9b": { x: "density", y: "deliverable_capacity", dimensions: [3] },
    11: { x: "surface_area", y: "deliverable_capacity", deliverable_capacity: [0, 250] },
  },

  // the landing page (select-figure/main.py): the default figure, then these
  galleryDefault: { title: "High-performing COFs", caption: { y: "Deliverable Capacity", x: "Density" } },
  gallery: [
    { key: "3a", caption: { y: "Surface area", x: "Density", note: "(2d COFs)" } },
    { key: "3b", caption: { y: "Surface area", x: "Density", note: "(3d COFs)" } },
    { key: "7a", caption: { y: "Methane uptake (low P)", x: "Density" } },
    { key: "7b", caption: { y: "Methane uptake (high P)", x: "Density" } },
    { key: "8b", caption: { y: "Deliverable capacity", x: "Density", note: "(2d COFs)" } },
    { key: "9b", caption: { y: "Deliverable capacity", x: "Density", note: "(3d COFs)" } },
    { key: "11", caption: { y: "Deliverable capacity", x: "Surface area" } },
  ],
};
