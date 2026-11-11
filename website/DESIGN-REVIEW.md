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
