import type { NewsContent } from "@/lib/content-types";
import content from "@/content/pages/news.json";
import { getArticles } from "@/lib/articles";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { NewsListTemplate } from "@/templates/NewsListTemplate";

const news: NewsContent = content;

// Not linked from the site and kept out of search results until the section launches.
export const metadata = buildMetadata(news.seo);
export const viewport = buildViewport(news.seo);

export default function NewsPage() {
  return <NewsListTemplate content={news} articles={getArticles()} />;
}
