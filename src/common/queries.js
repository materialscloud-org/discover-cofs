// Fetching the static data (TanStack Query caches it; it never changes).
import { useQuery } from "@tanstack/react-query";

import { DATA, getJson } from "./api.js";
import { shardFile } from "./data.js";

export const useTable = () => useQuery({ queryKey: ["table"], queryFn: () => getJson(`${DATA}table.json`) });

/** { properties, cif } of one COF, or null if there is none of that name; the whole shard is cached */
export const useDetail = (name, shardCount) =>
  useQuery({
    queryKey: ["shard", shardFile(name, shardCount)],
    queryFn: () => getJson(`${DATA}${shardFile(name, shardCount)}`),
    select: (shard) => shard[name] ?? null,
  });
