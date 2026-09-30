import "@/styles/news.css";
import type { NewsContent } from "@/lib/content-types";
import type { ArticleMeta } from "@/lib/articles";
import { formatDate } from "@/lib/articles";
import { Rich } from "@/components/shared/Rich";
import { MarketingTemplate } from "./MarketingTemplate";

export function NewsListTemplate({ content, articles }: { content: NewsContent; articles: ArticleMeta[] }) {
  return (
    <MarketingTemplate header={content.header}>
      <section className="news-page">
        <div className="container">
          <div className="chip chip-orange">
            <Rich text={content.list.chip} />
          </div>
          <h1>
            <Rich text={content.list.title} />
          </h1>
          {articles.length ? (
            <div className="news-list">
              {articles.map((a) => (
                <a className="news-card" href={`/news/${a.slug}`} key={a.slug}>
                  <time dateTime={a.date}>{formatDate(a.date)}</time>
                  <h2>{a.title}</h2>
                  <p>{a.description}</p>
                </a>
              ))}
            </div>
          ) : (
            <p className="news-empty">
              <Rich text={content.list.empty} />
            </p>
          )}
        </div>
      </section>
    </MarketingTemplate>
  );
}
