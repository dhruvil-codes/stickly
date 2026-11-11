# Stickly search action plan

November 11, 2026 · See [audit evidence and limits](SEO-AUDIT.md).

## Completed in this audit

- Tightened two page titles and the app's schema category.
- Fixed the sample button's visible-label/accessibility-name mismatch.
- Documented the tested Windows version, archive recovery, permanent history
  clearing, optional checksum verification, and quit-first updates.
- Replaced the website launch poster with a smaller WebP.
- Rechecked all eight pages, responsive layouts, and the real peel sample.

## Next: establish what search engines actually see

1. Reconnect the owner's Google Search Console account. The detected local
   credential failed URL inspection with `invalid_grant`; no indexing result
   was returned. Verify the exact URL-prefix property
   `https://dhruvil-codes.github.io/stickly/`.
2. Submit `https://dhruvil-codes.github.io/stickly/sitemap.xml` in that property.
   Inspect the homepage, download page, and three guides. Check Google's chosen
   canonical and exclusion reason before changing pages in response to a report.
3. Verify the same site in Bing Webmaster Tools and submit the same sitemap.
   Do not use Google's restricted Indexing API for these ordinary product pages.
4. Once search data exists, use actual queries and impressions to choose the
   next guide. Review weekly rather than generating pages for every keyword
   spelling. Traffic and installation attribution need their own measurement
   design; the current website has no analytics script.

These account actions were not performed during the public-site audit. No
credentials, verification tags, or ownership assertions were invented.

## Next release: earn stronger evidence

- Test Windows 11 x64 explicitly before calling it a tested platform. Record
  Windows build, scaling, install/update, hotkey, pin, resize, and peel results.
- Finish reminders and a daily focus list before adding their feature claims
  or publishing a guide that promises them.
- Code signing and an updater would improve the installation experience. They
  are product work, not missing meta tags.
- Choose a project-wide source license before describing Stickly as open source.
- If genuine public reviews become available, evaluate visible review markup
  against Google's rules. Do not add placeholder ratings to unlock an enhancement.

## Ongoing

Keep screenshots and instructions matched to the downloadable version. Rerun
the static checks with website changes and responsive/interaction checks when
layout or demo code changes. Use lab Lighthouse as a diagnostic; inspect field
Core Web Vitals when sufficient data becomes available. Promote the real peel
demo and useful guides where desktop-note users already ask these questions.
