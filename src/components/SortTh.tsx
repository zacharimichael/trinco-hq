"use client";

import { useState } from "react";

export type SortState<K extends string> = { key: K; desc: boolean };

/** Click a column to sort by it; click again to flip the order. */
export function useSort<K extends string, T>(initial: SortState<K>, keys: Record<K, (row: T) => string | number | null>) {
  const [sort, setSort] = useState(initial);
  // Words start A to Z; numbers start highest first.
  const by = (key: K) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: !textKey(key) }));
  const textKey = (key: K) => ["name", "pos", "school"].includes(key);
  const apply = (rows: T[]) => {
    const get = keys[sort.key];
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b);
      // Blanks always go last.
      if (x == null || x === "") return 1;
      if (y == null || y === "") return -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.desc ? -c : c;
    });
  };
  return { sort, by, apply };
}

export function SortTh<K extends string>({ k, label, sort, by, num }: { k: K; label: string; sort: SortState<K>; by: (k: K) => void; num?: boolean }) {
  const on = sort.key === k;
  return (
    <th className={num ? "num" : undefined} aria-sort={on ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" className={`sortbtn ${on ? "on" : ""}`} onClick={() => by(k)}>
        {label}<span aria-hidden>{on ? (sort.desc ? " ▼" : " ▲") : " ↕"}</span>
      </button>
    </th>
  );
}
