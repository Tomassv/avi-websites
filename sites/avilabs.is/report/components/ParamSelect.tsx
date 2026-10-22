"use client";

import { usePathname, useRouter } from "next/navigation";

/** A select that sets one search param and reloads the page; `params` are the current ones to keep. An empty value removes the param. */
export function ParamSelect({ name, label, value, options, params }: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  params: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      key={value}
      aria-label={label}
      defaultValue={value}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set(name, e.target.value);
        else next.delete(name);
        const query = next.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
