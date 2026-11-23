import "./index.css";
import MaterialsCloudHeader from "mc-react-header";
import { McAppHeader } from "mc-react-library";
import { Link, Navigate, Route, Routes, useMatch } from "react-router-dom";

import { BackButton } from "./common/Common.jsx";
import { config } from "./CofsExplorer/config.js";
import { DetailPage, FigurePage, GalleryPage, LegacyDetailRedirect } from "./CofsExplorer/Pages.jsx";

// The routes of the old section (select-figure, figure?preset=, detail?name=),
// relative to where the app is served.
export default function App() {
  const name = useMatch("/detail/:name")?.params.name;
  const onFigure = useMatch("/figure");
  return (
    <>
      <MaterialsCloudHeader
        activeSection="discover"
        breadcrumbsPath={[
          { name: "Discover", link: "https://www.materialscloud.org/discover" },
          { name: config.title, link: name || onFigure ? import.meta.env.BASE_URL : null },
          ...(onFigure ? [{ name: "Interactive plot", link: null }] : []),
          ...(name ? [{ name, link: null }] : []),
        ]}
      />
      <main className="min-h-screen bg-[aliceblue] pb-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="overflow-hidden bg-white p-4 shadow-sm">
            <McAppHeader
              title={
                <Link to="/" className="text-inherit hover:no-underline">
                  {config.title}
                </Link>
              }
              logo={`${import.meta.env.BASE_URL}cofs.png`}
              logoAlt="Covalent Organic Frameworks logo"
              dois={config.dois}
            />
            <div className="mt-4 px-4">
              {(name || onFigure) && (
                <div className="mb-3">
                  <BackButton />
                </div>
              )}
              <Routes>
                <Route path="/" element={<GalleryPage />} />
                <Route path="/figure" element={<FigurePage />} />
                <Route path="/detail/:name" element={<DetailPage />} />
                <Route path="/detail" element={<LegacyDetailRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
