# Visual review

Direction: The page is the object, seed 1364177442. Brand paper colors and
Shantell Sans are retained. No stock or generated imagery; every image and clip
shows Stickly with synthetic example note contents. The only live product
fragment is the real browser renderer, rather than a redrawn peel.

## Round 1

Seen in one second: a large handwritten yellow note beside an actual Stickly note.

Idea: Stickly's paper colors and corner peel turn the page into a desk of notes.

Live thing: write in the actual frontend and peel a sample note inside its desk.

Layout by section: hero=two paper panels / peel=square demonstration / features=menu
and photo pile / demo=wide cinema / install=receipt / FAQ=filed answers / close=ink
poster / footer=large wordmark.

Scores: design 7.5 · usability 7 · creativity 7.5 · content 8 → overall 7.4.
Caps applied: mobile close wraps to three lines; overall capped at 6.5 until fixed.

Top problems seen in the rendered screenshots:

1. Mobile closing headline wraps to three lines (mobile-page-01). Shorten to
   “Let it stick.” while retaining the large scale.
2. The loaded browser sample fills its frame, clipping the peel grip
   (sample-half-peel.png). Its sizing lost to the later app stylesheet. Increase
   the specificity of the website-only sample rule, then retest the actual drag.
3. Small diagonal arrows render as blue emoji in the feature and installation
   links (all full-page sheets). Request text presentation for those arrows.

The motion meter missed completed Web Animations between its samples. Use CSS
entrance animations with animation-start events, preserving the same motion and
visible no-script fallback, then inspect the final page again.

## Round 2

Seen in one second: paper, handwriting, and an obvious Windows download.

Idea: the same paper desk carries the real product through the page.

Live thing: the sample now passes editing, palette dismissal, partial peel,
full lift, cursor carry, placement, and reset checks.

Layout by section: unchanged from round 1.

Scores: design 7.5 · usability 8 · creativity 7.5 · content 8 → overall 7.7.
Caps applied: none; inspector reports zero failures at all three widths.

Top remaining refinements:

1. The abbreviated closing headline leaves an empty middle (desktop-page-02).
   Put the supporting copy and download beside it in a second column.
2. Several small sizes do the same job. Consolidate body, lead, and caption sizes.
3. The platform still colors diagonal Unicode arrows (page sheets). Replace them
   with small current-color SVGs, then inspect the final build.

## Round 3 — final

Seen in one second: a handwritten yellow paper invitation and a real note to try.

Idea: the note is both the page's physical material and its working demonstration.

Live thing: the actual app renderer, including its fold geometry and click-to-place.

Layout by section: hero=paired paper / peel=square proof / features=menu and prints /
demo=wide film / install=receipt / FAQ=filed answers / close=two-column ink poster /
footer=wordmark. All final fold and page sheets were opened at desktop, tablet,
and phone widths. The three support pages were also reviewed on a phone.

Scores: design 7.8 · usability 8 · creativity 7.5 · content 8.5 → overall 7.9.
Caps applied: none. Final inspector: zero failures at 1440, 768, and 390 pixels.

Remaining meter warnings, retained deliberately:

- Warm neutral paper: this is the existing Stickly media palette, retained with
  the brand colors rather than introducing a different visual identity.
- Responsive size count: fluid headings and two wordmark scales create additional
  measured sizes; running text and captions now use consistent roles.

The signature motion is the actual user-controlled peel and its matching video,
replacing the dealt photo crossfade because the product's physical movement is
the specific thing this page needs to demonstrate. Section entrances use CSS
animations with visible fallbacks. Reduced motion disables automatic video and
travel. Controls retain explicit play/pause feedback.

Final checks: four static pages; 79 local link/asset checks; parsed application
and FAQ structured data; canonical URLs; sitemap; isolated noindex sample;
desktop/tablet/phone overflow checks; palette click-away, partial and full peel,
carry, placement, reset; video source switching; FAQ behavior; reduced motion.
The browser run reports no JavaScript or local HTTP errors. Screenshots and
recordings use synthetic note content. There are no invented product testimonials
or stock assets to replace. The browser sample's native-control limits remain
documented in Privacy & storage.

## Inter and spacing refinement — November 11

The user requested Inter supporting text, a cleaner hero, more whitespace, and
answers to researched sticky-note questions. The original paper-desk direction
is retained; the large colored hero text panel is removed at the user's request.

| Before | After | Why |
| --- | --- | --- |
| System-font copy with handwriting on captions and controls | Self-hosted Inter on copy, navigation, controls, captions, and guides | A consistent readable supporting voice |
| Two large colored hero panels, with repeated slogans | Neutral copy area, larger gutters, one message, download, and working note | Clearer hierarchy and breathing room |
| 650–850ms entrances with larger travel | 500–650ms entrances with 12–18px travel and short control feedback | Less visual delay while retaining the paper movement |
| Basic FAQ and feature reference | A linked guide hub, three practical guides, and researched answers | Help people complete actual tasks and understand limits |

### Refinement round 1

Seen in one second: handwriting, a Windows download, and one note to try.

Idea: the real note supplies the paper character while Inter carries the explanation.

Live thing: the actual app sample, with unchanged handwriting and peel geometry.

Layout by section: open split hero / square peel / menu and photos / wide film /
receipt / answer stack / ink close / wordmark. Guides use a readable article layout.

Scores: design 8 · usability 8 · creativity 7.5 · content 8.4 → overall 8.0.
Caps applied: tablet peel heading wraps to three lines, so capped at 6.5 until fixed.

Top three issues: shorten the peel heading at 768px; consolidate small text sizes;
retain actual Microsoft version distinctions in the guide rather than claiming
its newer OneNote notes have no pin.

### Refinement round 2 — final

Seen in one second: a note app with a clear download and a quiet readable explanation.

Idea: Shantell is the paper's handwriting; Inter is the site's supporting text.

Live thing: editing, palette dismissal, partial peel, full carry, placement, and reset.

Layout by section: same as refinement round 1. Every final inspector fold and page
sheet was opened; guide screenshots were reviewed on desktop and phone.

Scores: design 8 · usability 8.3 · creativity 7.5 · content 8.4 → overall 8.0.
Caps applied: none. Inspector reports zero failures and zero warnings at 1440,
768, and 390 pixels. Inter accounts for 95% of measured text; Shantell is retained
for brand and main headings, and in the real app. Inter is explicitly requested,
so the source linter's generic-font warning is intentionally accepted.

Checks: eight static pages, 175 local links/assets, valid application/article/FAQ
JSON-LD, canonical URLs, sitemap, font file and OFL license. All support and guide
pages pass overflow and two-line heading checks at desktop, tablet, and phone
widths. The real peel, video switching, FAQ, reset, and reduced-motion behavior
pass. No JavaScript or local HTTP errors were reported. CSS and script URLs now
include a content version to avoid stale styling after publication.

All product imagery remains owned Stickly footage/screenshots with synthetic
notes. There are no stock assets or invented testimonials. Search research is
qualitative; no search-volume figures or rankings are claimed. The actual
desktop application is not changed by this website refinement.
