// The scatter plot page: X, Y and colour selectors, the filters, the plot.
// Starts from a preset (see resolvePreset) and filters live.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CheckboxGroup from "./CheckboxGroup.jsx";
import { colorColumns, filterIndices, floatColumns, quantity, resolvePreset, withUnit } from "./data.js";
import DualRangeSlider from "./DualRangeSlider.jsx";
import { scatterFigure } from "./figure.js";
import ScatterPlot from "./ScatterPlot.jsx";

function Select({ label, value, options, onChange }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1"
      >
        {options.map((q) => (
          <option key={q.column} value={q.column}>
            {q.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Mount with key={preset key}: the state restarts from the preset. */
export default function Explorer({ config, table, preset: requested }) {
  const navigate = useNavigate();
  const [state, setState] = useState(() => resolvePreset(config, requested));
  const { x, y, clr, filters } = state;
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const setFilter = (column, value) => set({ filters: { ...filters, [column]: value } });

  const indices = useMemo(() => filterIndices(table, config, filters), [table, config, filters]);
  const figure = useMemo(() => scatterFigure(table, config, { x, y, clr }, indices), [table, config, x, y, clr, indices]);

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="w-full shrink-0 space-y-4 md:w-80">
        <Select label="X" value={x} options={floatColumns(config)} onChange={(v) => set({ x: v })} />
        <Select label="Y" value={y} options={floatColumns(config)} onChange={(v) => set({ y: v })} />
        <Select label="Color" value={clr} options={colorColumns(config)} onChange={(v) => set({ clr: v })} />
        <hr />
        {config.filters.map((column) => {
          const q = quantity(config, column);
          return q.type === "float" ? (
            <div key={column} className="space-y-1">
              <span className="block text-sm font-semibold">{withUnit(q)}</span>
              <DualRangeSlider
                label=""
                value={filters[column]}
                min={q.range[0]}
                max={q.range[1]}
                step={0.1}
                onChange={(v) => setFilter(column, v)}
              />
            </div>
          ) : (
            <CheckboxGroup
              key={column}
              label={q.label}
              values={q.values}
              labels={q.labels}
              selected={filters[column]}
              onChange={(v) => setFilter(column, v)}
            />
          );
        })}
        <p className="text-sm italic text-gray-600">
          {indices.length
            ? `${indices.length} of ${table.n} ${config.itemName}. Click on a point for details.`
            : `No matching ${config.itemName} found.`}
        </p>
      </div>
      <div className="min-w-0 grow">
        <ScatterPlot figure={figure} onSelect={(name) => navigate(`/detail/${encodeURIComponent(name)}`)} />
      </div>
    </div>
  );
}
