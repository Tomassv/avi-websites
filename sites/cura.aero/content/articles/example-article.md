---
title: "Example article: how articles are written"
description: "A draft that shows the article format. Drafts appear in local development only and are never published."
date: 2026-10-01
author: AviLabs
draft: true
---

Articles are plain Markdown files in `content/articles/`. The file name is the URL: this file,
`example-article.md`, is served at `/news/example-article` once `draft` is set to `false`.

## Frontmatter

Every article starts with a frontmatter block. `title`, `description`, `date` and `draft` are
required; `author` and `image` are optional. An `image` must be a file under `/images/`.

## What Markdown can do

You can use **bold**, *italic*, [links](https://avilabs.is), lists and quotes:

- Headings from `##` down to `####`
- Numbered and bulleted lists
- Code, quotes and horizontal rules

> Raw HTML is ignored, so an article can't change the page's layout or run scripts.
