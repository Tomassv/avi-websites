import type { DocHeaderContent } from "@/lib/content-types";
import { DocHeader } from "@/components/docs/Doc";

/**
 * Internal document pages: a narrow container with the document header. `wide` pages
 * (evidence-package, workflow) use the .wf-doc container from site.css.
 */
export function DocTemplate({
  header,
  wide,
  children,
}: {
  header: DocHeaderContent;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "wf-doc container" : "container"}>
      <DocHeader content={header} />
      {children}
    </div>
  );
}
