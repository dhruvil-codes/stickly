# Stickly search audit

November 11, 2026 · [Live website](https://dhruvil-codes.github.io/stickly/)

Audited the eight public marketing and guide pages using
[Claude SEO 2.6.0](https://github.com/AgriciDaniel/claude-seo), pinned to
`734998e5fdbb16cd96dbaafe2da24eee6fb0d291`. The toolkit's portable skills and
isolated Python/Chromium runtime were installed for Codex. Technical/schema and
content reviews were checked against the generated HTML, application source,
live responses, Lighthouse, and responsive browser tests.

## What the checks established

All eight canonical pages returned HTTP 200. They have unique titles and
descriptions, one main heading, self-referencing canonicals, crawlable internal
links, social metadata, and parseable JSON-LD. The sitemap contains those same
eight pages. Content is present before JavaScript runs. The interactive app
sample is deliberately marked `noindex` and is absent from the sitemap.

The original live homepage scored **96 Performance, 100 Accessibility,
100 Best Practices, and 100 SEO** in Lighthouse 13.6.0. This was a mobile-emulated,
simulated-throttling lab run on Edge 157, not a field Core Web Vitals result.
Lab LCP was 2.6 seconds, CLS was 0, and total blocking time was 20 ms. The
experimental Agentic Browsing category passed **2 of 2 counted checks**;
WebMCP, a resource catalog, and host-root `llms.txt` were not applicable. That
fraction does not measure citations or visibility in AI answers.

Lighthouse also reported an unscored visible-label/accessibility-name mismatch
on the sample button. A perfect category score does not mean every check or
every accessibility need has been satisfied.

## Changes made

| Finding | Change | Reason |
| --- | --- | --- |
| The sample's accessible name omitted its visible “Try a note” label | Included that exact text in its accessible name | Makes voice and assistive navigation more predictable |
| Two titles were longer than necessary | Shortened the guide index and offline guide titles | Keeps their subject and brand easy to scan; character counts are a display heuristic |
| The app category was outside Google's documented category list | Used `UtilitiesApplication`, with a descriptive subcategory | Describes the desktop utility using a supported category |
| Compatibility did not identify the tested Windows version | Added Windows 10 Pro 22H2 x64, and distinguished other unvalidated targets | Gives downloaders concrete first-hand evidence |
| Archive recovery instructions lacked the actual controls | Added the toolbar, History, Archive, and Restore steps | Helps a reader complete the task |
| Clearing history was not explained | Stated that completed tasks and archived notes are permanently removed after confirmation | Avoids promising recovery that the app cannot provide |
| Download verification and updates lacked a few steps | Added optional `Get-FileHash` instructions and tray-menu Quit before updating | Aligns the website with the existing installation documentation |
| The launch poster was unnecessarily large | Served a quality-85 WebP, 42,274 bytes instead of a 375,698-byte PNG | Saves 333,424 bytes for that asset; retains the original PNG in the media kit |

The hero layout, Inter supporting text, Shantell handwriting, real screenshots,
and actual peel demo remain the basis of the site. No new keyword-variation
pages or word-count padding were needed.

## Technical and schema details

The effective robots location is
`https://dhruvil-codes.github.io/robots.txt`, which returned **404**. That is not
a crawl block. `/stickly/robots.txt` is informational: a GitHub project site
cannot set its host's root policy. The toolkit's automatic sitemap discovery
probes host-root paths and therefore missed this project site's working
`/stickly/sitemap.xml`; its “no sitemap found” result is not a site defect.
Google documents both [robots scope and HTTP handling](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt).

WebSite, WebPage, SoftwareApplication, BreadcrumbList, and guide Article markup
describe visible content. FAQ answers and their markup share one data source.
Google [retired FAQ rich results on May 7, 2026](https://developers.google.com/search/updates).
FAQ markup remains descriptive; it is not a promised search enhancement.

Google's [software-app rich-result requirements](https://developers.google.com/search/docs/appearance/structured-data/software-app)
include a genuine review or aggregate rating. Stickly has neither on the site.
Changing the category does not make it eligible by itself, and no ratings were
invented. JSON parsing and source review are not a hosted Rich Results Test.

## Content, search intent, and AI answers

The existing [research](SEARCH-RESEARCH.md) maps practical questions to the
download, pinning, offline storage, checklist, and recovery pages. It is
qualitative research, not verified search-volume or difficulty data. Product
claims distinguish Stickly from Microsoft Sticky Notes, and distinguish the
classic Microsoft app from the newer OneNote experience.

The guides have a named author, dated version context, actual UI screenshots,
direct answers, instructions, related links, and explicit current limitations.
The optional project-local `llms.txt` is a convenient index, not a ranking
mechanism. Google's [AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
does not require a special AI text file or schema to appear in its AI features.

## Verification and remaining unknowns

The static artifact checks passed for eight pages and 175 local links/assets.
Browser checks at 1440, 768, and 390 pixels verified font loading, layout, all
seven supporting pages, reduced motion, video switching, FAQ behavior, and the
real sample's editing, palette dismissal, partial peel, full carry, click
placement, and reset. There were no JavaScript or local HTTP errors.

Search Console credentials were detected locally, but the read-only URL
inspection request failed with `invalid_grant`. Indexation, Google-selected
canonicals, queries, impressions, clicks, and ranking are therefore **unknown**.
No working PageSpeed/CrUX API key or GA4 property was configured. Field LCP, INP,
and CLS are not established by the lab test. External citations, backlink
authority, and AI-answer mentions were not measured. No combined “SEO health”
number is assigned to these unavailable signals.

The next steps are in [the action plan](ACTION-PLAN.md). Publishing and passing
checks make the site accessible and understandable; they do not guarantee
indexing, rankings, downloads, or AI citations.
