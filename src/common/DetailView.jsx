// The page of one COF: structure (with the CIF download), property table (with the JSON download).
import { lazy, Suspense } from "react";

import { Failed, DownloadButton, Loading } from "./Common.jsx";
import { propertiesJson } from "./data.js";
import PropertyTable from "./PropertyTable.jsx";
import { useDetail } from "./queries.js";

// the viewer (3Dmol, matsci-parse) is loaded when the first structure is shown
const StructureView = lazy(() => import("./StructureView.jsx"));

export default function DetailView({ name, shardCount }) {
  const { data, error, isPending } = useDetail(name, shardCount);
  if (isPending) return <Loading />;
  if (error) return <Failed error={error} />;
  if (!data) return <p className="py-4">No matching COF found: {name}</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Suspense fallback={<Loading />}>
          <StructureView cif={data.cif} />
        </Suspense>
        <DownloadButton filename={`${name}.cif`} text={data.cif}>
          Download cif
        </DownloadButton>
      </div>
      <div className="min-w-0 space-y-2">
        <PropertyTable properties={data.properties} />
        <DownloadButton filename={`${name}.json`} text={propertiesJson(data.properties)} mime="application/json">
          Download json
        </DownloadButton>
      </div>
    </div>
  );
}
