import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { NewsContent } from "@/lib/content-types";
import content from "@/content/pages/news.json";
import { getArticle, getArticles } from "@/lib/articles";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { ArticleTemplate } from "@/templates/ArticleTemplate";

const news: NewsContent = content;

export const dynamicParams = false;
export const viewport = buildViewport(news.seo);

export function generateStaticParams() {
  return getArticles().map((a) => ({ slug: a.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return buildMetadata({
    title: article.title + news.article.titleSuffix,
    description: article.description,
    robots: news.seo.robots,
    author: article.author,
  });
}

export default async function ArticlePage({ params }: Params) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  return <ArticleTemplate content={news} article={article} />;
}
