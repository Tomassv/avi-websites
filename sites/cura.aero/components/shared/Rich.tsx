import { Fragment, type ReactNode } from "react";
import { parseRich, type RichNode } from "@/lib/rich";

/**
 * Renders a content string that may contain the whitelisted inline markup (see lib/rich.ts).
 * Everything is rendered as React elements; text is escaped by React.
 */
export function Rich({ text }: { text: string | undefined }) {
  return <>{renderNodes(parseRich(text))}</>;
}

function renderNodes(nodes: RichNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (typeof node === "string") return <Fragment key={i}>{node}</Fragment>;
    switch (node.tag) {
      case "br":
        return <br key={i} />;
      case "strong":
        return <strong key={i}>{renderNodes(node.children)}</strong>;
      case "b":
        return <b key={i}>{renderNodes(node.children)}</b>;
      case "em":
        return <em key={i}>{renderNodes(node.children)}</em>;
      case "span":
        return (
          <span key={i} className={node.className}>
            {renderNodes(node.children)}
          </span>
        );
    }
  });
}
