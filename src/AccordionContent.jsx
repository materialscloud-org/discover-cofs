// The information accordions of the home page.
import { DoiBadge, McInfoAccordions } from "mc-react-library";

function AboutContent() {
  return (
    <div className="space-y-2">
      <p>
        We present 69,840 covalent organic frameworks (COFs) assembled <i>in silico</i> from a set of 666 distinct
        organic linkers into 2D layers and 3D networks. We investigate the feasibility of using these COFs for methane
        storage by using grand-canonical Monte Carlo (GCMC) simulations to calculate their deliverable capacities (DCs).
      </p>
      <p>
        This interactive figure allows to explore the full database of assembled COF structures, together with their
        properties. All structures and properties can be downloaded in bulk from the Materials Cloud archive entry
        linked above.
      </p>
    </div>
  );
}

function HowToCiteContent() {
  return (
    <p>
      Please find the appropriate journal reference in{" "}
      <span className="inline-block align-middle">
        <DoiBadge doi_id="2018.0003/v2" label="Data DOI" />
      </span>
      .
    </p>
  );
}

const ACCORDIONS = [
  { title: "About", content: <AboutContent /> },
  { title: "How to cite", content: <HowToCiteContent /> },
];

/** The information accordions, one open at a time. */
export default function InfoAccordions() {
  return <McInfoAccordions items={ACCORDIONS} />;
}
