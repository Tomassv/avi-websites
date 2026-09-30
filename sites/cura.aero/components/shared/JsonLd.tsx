import { jsonLdString } from "@/lib/safe-url";

/** Structured data. Serialised with <, >, & and line separators escaped, so content can't close the tag. */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
