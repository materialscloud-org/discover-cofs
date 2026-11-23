// The 3D structure of a CIF: parsed with matsci-parse, drawn by mc-react-structure-visualizer.
import { fromCIF } from "matsci-parse";
import { useMemo } from "react";
import StructureVisualizer from "mc-react-structure-visualizer";

import { Failed } from "./Common.jsx";

export default function StructureView({ cif }) {
  // parsed once per CIF, not on every render (the viewer redraws on a new structure)
  const parsed = useMemo(() => {
    try {
      return { structure: fromCIF(cif) };
    } catch (error) {
      return { error };
    }
  }, [cif]);
  if (parsed.error) return <Failed error={parsed.error} />;
  return (
    <div className="h-[600px] w-full">
      <StructureVisualizer structure={parsed.structure} />
    </div>
  );
}
