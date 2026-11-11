# Stickly website

Static marketing pages for [Stickly](https://dhruvil-codes.github.io/stickly/),
published on GitHub Pages. Product copy is present in the HTML before JavaScript
runs. There is no framework runtime on the marketing pages, third-party font
request, or analytics script.

From the repository root:

```sh
npm ci
npm run website:build
npm run website:check
```

The build writes **website/dist**, separately from the desktop app's **dist**.
Serve it with `/stickly/` mounted at that output directory when testing locally.
The Pages workflow builds and deploys changes on `main`.
Stylesheet and script URLs include a content-derived version so returning
visitors receive the current design after a deployment.

## Content and assets

- `pages/`: homepage, feature reference, installation help, privacy/storage, a
  guide index, and practical guides for pinning, offline notes, and checklists.
- `content.mjs`: shared page metadata and guide questions used by the build and
  artifact checks.
- `site.css` and `site.js`: responsive presentation and lightweight interactions.
- `build.mjs`: static HTML, metadata, JSON-LD, sitemap and optional `llms.txt`.
- The sample bundles the real React application, including its peel geometry.
  It seeds synthetic example notes only when no browser notes exist. Reset
  restores examples. It does not connect to desktop data or provide native window
  controls. The sample is marked `noindex`.
- Screenshots and recordings come from `docs/images` and `docs/media`; see
  [the media credits](../docs/media/README.md). The handwriting is the original
  bundled Shantell Sans Bold under its SIL Open Font License. No reference footage
  or personal-use Matcha Salt assets are published.

The website uses the original Inter variable WOFF2 for supporting text and
controls. Shantell remains on the brand and major headings, and inside the actual
app. Both fonts and their SIL Open Font Licenses are served locally.

[Search research](SEARCH-RESEARCH.md) records the observed question topics,
primary references, content map, and limits of the research. It contains no
invented keyword volumes or ranking forecasts. Each guide has a direct answer,
working instructions, relevant links, and visible app/version context.

## Search maintenance

Keep feature claims synchronized with released app behavior. Visible FAQs and
their JSON-LD are generated from the same answers. There are no fabricated
reviews, ratings, or usage statistics. Every public page has its own title,
description, canonical, and social metadata.

Sitemap: https://dhruvil-codes.github.io/stickly/sitemap.xml

GitHub project sites cannot manage `https://dhruvil-codes.github.io/robots.txt`.
The project-local robots file is informational; it is not a host-root crawler
policy. Public pages have index/follow metadata. The browser sample is excluded
with its own noindex metadata and is absent from the sitemap.

The optional `llms.txt` is a concise product reference, not a search ranking
technique. Google says its AI search features use the same foundational SEO
practices and do not require special AI markup or text files:
[AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).

After publication, the owner can verify the Pages URL-prefix property in Google
Search Console and Bing Webmaster Tools, then submit the sitemap. Verification
requires the owner's search account. Indexing, rankings and AI citations are
not guaranteed. A custom domain can be introduced later; update the build's
`origin` and `base`, internal links, workflow, and canonical URLs together.
