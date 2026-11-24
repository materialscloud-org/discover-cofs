// The three pages, with this app's config.
import { useSearchParams, Navigate, useParams } from "react-router-dom";

import InfoAccordions from "../AccordionContent.jsx";
import { Failed, Loading } from "../common/Common.jsx";
import DetailView from "../common/DetailView.jsx";
import Explorer from "../common/Explorer.jsx";
import Gallery from "../common/Gallery.jsx";
import { useTable } from "../common/queries.js";
import { config } from "./config.js";

export const GalleryPage = () => (
  <div className="space-y-6">
    {/* as the sibling apps: subtitle and accordions in a narrower column */}
    <div className="mx-auto max-w-4xl space-y-3 px-6 pt-2 sm:px-10">
      <p className="text-lg">
        A database of 70k two- and three-dimensional covalent organic
        frameworks, screened for methane storage.
      </p>
      <InfoAccordions />
    </div>
    <Gallery config={config} />
  </div>
);

export function FigurePage() {
  const [params] = useSearchParams();
  const preset = params.get("preset") ?? config.defaultPreset;
  const { data, error, isPending } = useTable();
  if (isPending) return <Loading />;
  if (error) return <Failed error={error} />;
  // key: a link to another preset restarts the controls
  return <Explorer key={preset} config={config} table={data} preset={preset} />;
}

export function DetailPage() {
  const { name } = useParams();
  return <DetailView name={name} shardCount={config.shardCount} />;
}

/** the old detail?name=<name> links */
export function LegacyDetailRedirect() {
  const [params] = useSearchParams();
  const name = params.get("name");
  return (
    <Navigate to={name ? `/detail/${encodeURIComponent(name)}` : "/"} replace />
  );
}
