import ReactMarkdown, { type Components } from "react-markdown";
import Image from "next/image";
import { safeImageSrc } from "@/lib/safe-url";
import { SafeLink } from "@/components/shared/SafeLink";

/**
 * Renders an article body. Article files are untrusted input: raw HTML is dropped, only the
 * listed elements are kept (anything else is unwrapped to its text), links go through the
 * SafeLink allowlist, and images must be files under /images/.
 */
const ALLOWED = ["p", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "strong", "em", "a", "code", "pre", "hr", "img", "br"];

const components: Components = {
  a: ({ href, children }) => (
    <SafeLink href={href} newTab={href?.startsWith("https://")}>
      {children}
    </SafeLink>
  ),
  img: ({ src, alt }) => {
    const safe = safeImageSrc(src);
    if (!safe) return null;
    return (
      <span className="article-image">
        <Image src={safe} alt={alt ?? ""} fill sizes="(max-width: 760px) 100vw, 720px" />
      </span>
    );
  },
};

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown skipHtml allowedElements={ALLOWED} unwrapDisallowed components={components}>
      {source}
    </ReactMarkdown>
  );
}
