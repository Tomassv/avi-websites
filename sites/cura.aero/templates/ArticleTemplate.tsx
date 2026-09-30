import "@/styles/news.css";
import Image from "next/image";
import type { NewsContent } from "@/lib/content-types";
import type { Article } from "@/lib/articles";
import { formatDate } from "@/lib/articles";
import { safeImageSrc } from "@/lib/safe-url";
import { Markdown } from "@/components/news/Markdown";
import { DraftBanner } from "@/components/shared/DraftBanner";
import { MarketingTemplate } from "./MarketingTemplate";

export function ArticleTemplate({ content, article }: { content: NewsContent; article: Article }) {
  const hero = safeImageSrc(article.image);
  return (
    <MarketingTemplate header={content.header}>
      <article className="article">
        <div className="container article-inner">
          <a className="article-back" href="/news">
            {content.article.back}
          </a>
          <div>
            <time className="chip chip-orange" dateTime={article.date}>
              {formatDate(article.date)}
            </time>
          </div>
          <h1>{article.title}</h1>
          <p className="article-lead">{article.description}</p>
          {article.author && (
            <p className="article-byline">
              {content.article.by} {article.author}
            </p>
          )}
          {hero && (
            <span className="article-hero">
              <Image src={hero} alt="" fill priority sizes="(max-width: 860px) 100vw, 784px" />
            </span>
          )}
          <div className="article-body">
            <Markdown source={article.body} />
          </div>
        </div>
      </article>
      {article.draft && <DraftBanner />}
    </MarketingTemplate>
  );
}
