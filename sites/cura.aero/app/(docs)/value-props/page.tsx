import "@/styles/pages/value-props.css";
import type { ValuePropsContent } from "@/lib/content-types";
import content from "@/content/pages/value-props.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { DocTemplate } from "@/templates/DocTemplate";
import { DocFooter, DocTitle } from "@/components/docs/Doc";
import { VpRows } from "@/components/docs/VpRows";
import { MaterialIcons } from "@/components/shared/MaterialIcons";

const page: ValuePropsContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo);

export default function ValuePropsPage() {
  return (
    <DocTemplate header={page.docHeader}>
      <MaterialIcons />
      <DocTitle content={page.title} />
      <VpRows content={page} />
      <DocFooter content={page.footer} />
    </DocTemplate>
  );
}
