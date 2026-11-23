// The properties of one COF as a table, sorted by name.
import { propertyRows } from "./data.js";

export default function PropertyTable({ properties }) {
  return (
    <div className="max-h-[570px] overflow-auto rounded border border-gray-300">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            <th className="border-b border-gray-300 px-2 py-1">Properties</th>
            <th className="border-b border-gray-300 px-2 py-1">Values</th>
          </tr>
        </thead>
        <tbody>
          {propertyRows(properties).map(([key, value]) => (
            <tr key={key} className="odd:bg-white even:bg-gray-50">
              <td className="px-2 py-1">{key}</td>
              <td className="px-2 py-1 font-mono">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
