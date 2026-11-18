# Blog design specification

A single reference for every post on the site. The goal is that a reader moving
from one post to another sees the same rhythm, hierarchy, and visual language,
even when the content is wildly different.

Reference implementations:

- **Section headings, prose, figures, tables, cards, widgets:** `content/posts/number-geom-1.html`
- **Part dividers and numbered experiment headings:** `content/posts/number-comp.html`
- **Site tokens and page chrome:** `assets/css/style.css`, `blog/post.html`

When in doubt, copy the structure from those files rather than inventing new
markup.

---

## 1. Page anatomy

Every post is rendered in this exact order. Title, date, read time, and header
image come from the manifest and `blog/post.html`; do not duplicate them inside
the post body.

| # | Element | Source | Notes |
|---|---------|--------|-------|
| 1 | Post title (`<h1>`) | manifest `title` | Never add an `<h1>` inside the post fragment. |
| 2 | Meta line | `post.html` | Automatically renders `date · N min read · tag · tag`. Do not repeat the date in the body. |
| 3 | Header image | manifest `headerImage` / `headerCaption` | Full-width image with caption underneath. Use the manifest, not an inline `<img>`. |
| 4 | Lede / short description | post body, `.lede` | **Maximum 4–5 lines.** One paragraph. No kicker, no badge, no meta pills. |
| 5 | TL;DR (optional) | post body, `.card.verdict` | One card, 2–5 short paragraphs. Used for long research posts only. |
| 6 | Intro paragraph | post body, first `.drop` paragraph | Starts the prose proper. Drop cap on the first letter. |
| 7 | Body | post body | Parts, numbered sections, prose, figures, tables, widgets. |
| 8 | Footer | post body, `.footer` | One short mono paragraph. Optional. |

### Visual order the reader should perceive

```
TITLE
date · reading time · tags

[ HEADER IMAGE ]
caption

Short description (max 4–5 lines)

[ TL;DR card, only if the post needs it ]

First paragraph with a large drop-cap initial …
```

Do not put the description below a badge row, a stats strip, or a table of
contents. Do not put a manual table of contents in the post: `blog/post.html`
builds the section rail automatically from `h2`/`h3`/`h4`.

---

## 2. Manifest metadata

Every post needs one entry in `content/posts/manifest.json`.

```json
{
  "slug": "your-slug",
  "title": "The title shown as the page heading",
  "date": "2026-11-17",
  "excerpt": "One or two sentences for the blog list.",
  "tags": ["interpretability"],
  "published": true,
  "format": "html",
  "headerImage": "/portfolio/content/posts/your-slug/cover.jpg",
  "headerCaption": "Artwork title, artist (year)"
}
```

Rules:

- `slug` matches the filename exactly (`<slug>.html` or `<slug>.md`).
- `title` is sentence case, no trailing period. It is the only `h1`.
- `date` is `YYYY-MM-DD`.
- `excerpt` is for the index page only. One or two sentences.
- `format` is `"html"` for interactive/fragment posts. Omit it for markdown.
- `headerImage` uses the site-absolute path
  `/portfolio/content/posts/<slug>/...`, never a relative path.
- `headerCaption` names the artwork and author. If there is no image, set both
  fields to `null`.
- Set `published: false` for drafts.

---

## 3. File format for HTML posts

An HTML post is a **fragment**, not a document.

- No `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<title>`, or site navigation.
- The file starts with one `<style>` block, then one wrapper `<div>`.
- All custom selectors are scoped under a unique wrapper class, e.g.
  `.numgeo`, `.numcomp`, `.depth`.
- Use site CSS custom properties. Never hardcode palette colors, fonts, or
  backgrounds.
- No CSS that targets bare `body`, `html`, or global `h2` outside the wrapper.

```html
<style>
.mypost{
  --radius:6px;
  color:var(--text-col-1);
  font-family:var(--body-serif, "Charter", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif);
  font-size:18px;
  line-height:1.72;
}
.mypost *{box-sizing:border-box}
.mypost a{color:var(--text-col-2);text-decoration:none}
.mypost a:hover{text-decoration:underline}
/* …scoped styles only… */
</style>

<div class="mypost">
  …
</div>
```

Use these tokens:

| Purpose | Token |
|---|---|
| Main text | `--text-col-1` |
| Secondary text | `--text-col-1-dim` |
| Faint text | `--text-col-1-faint` |
| Accent / links | `--text-col-2` (+ `--text-col-2-dim`) |
| Alternate accent | `--text-col-3` |
| Success / positive | `--text-col-4` (+ `--text-col-4-dim`) |
| Warning / negative | `--text-col-5`, `--text-col-6` (+ `-dim`) |
| Cards | `--bg-elevated` |
| Inline code / table headers | `--bg-card` |
| Borders | `--border`, `--border-strong` |
| Type | `--serif`, `--body-serif`, `--mono` |

---

## 4. Headings and sections

### 4.1 Section heading pattern

Every main section uses the same three-part header as `number-geom-1.html`:

```html
<section id="exp1">
  <div class="wrap">
    <div class="sec-head">
      <div class="sec-num">1</div>
      <h2>What can we decode, and from which layer?</h2>
    </div>
    <div class="narrow prose">
      …
    </div>
  </div>
</section>
```

Spec:

- `h2` is the section title. Sentence case. Usually a question.
  Examples: “What can we decode, and from which layer?”, “The geometry of the
  number code”.
- The number chip (`.sec-num`) is a short mono pill, always to the left of the
  `h2`. Use the section number: `1`, `2`, `3`, or `01`, `02`, `03` for longer
  papers. Be consistent within a post.
- Methods / preamble sections may use `<div class="sec-num alt">§</div>`
  instead of a number.
- Do **not** put the number inside the `h2` text. The TOC skips `.sec-num`.
- `h2` styling comes from the wrapper CSS:
  `var(--serif)`, weight 900, `1.8rem`, line-height 1.3, no margin.
- Sections are separated by `margin-top: 52px` (`42px` on small screens).

### 4.2 Part dividers

Long posts group sections into parts. Keep the part label as a standalone
divider immediately before the first section of that part:

```html
<div class="part-label">Part I — Arithmetic</div>
```

```css
.mypost .part-label{
  font-family:var(--mono);
  font-size:.72rem;
  font-weight:700;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--text-col-2);
  margin:56px 0 0;
  display:flex;
  align-items:center;
  gap:12px;
}
.mypost .part-label::after{
  content:"";
  flex:1;
  height:1px;
  background:var(--border);
}
```

Rules:

- Part labels are uppercase mono, with the trailing hairline rule.
- They are not `h2`/`h3` and do not appear in the TOC rail.
- Use Roman numerals in order: `Part I — Arithmetic`, `Part II — Algebra`,
  `Part III — Synthesis`. The em dash and single spaces are intentional.
- A part divider is followed by its first numbered section, never by prose.

### 4.3 Subheadings

Use `h3` for sub-sections inside a numbered section:

```html
<h3>2.1 &nbsp;Is magnitude logarithmic?</h3>
```

- Number them `2.1`, `2.2`, `2.3` matching the parent section.
- `h3` is serif, weight 900, `1.3rem`, margin `1.4rem 0 .4rem`.
- Use `h4` only for small mono labels inside cards or widgets. Do not use `h4`
  as a page-level heading.

### 4.4 Prose inside sections

Wrap paragraph content in `.narrow.prose` when the section sits inside `.wrap`:

```html
<div class="wrap">
  <div class="sec-head">…</div>
  <div class="narrow prose">
    <p>…</p>
  </div>
  <!-- figures/tables can sit directly under .wrap -->
</div>
```

- Paragraph margin: `.8rem 0`.
- Body copy: `18px / 1.72` serif.
- The first paragraph of the opening prose section gets `class="drop"`:

```css
.mypost .drop::first-letter{
  font-size:3.1em;
  line-height:.8;
  float:left;
  font-weight:700;
  color:var(--text-col-2);
  margin:8px 10px 0 0;
  font-family:var(--serif);
}
```

Use the drop cap exactly once per post, on the first real paragraph after the
lede/TL;DR. Never on the lede itself.

---

## 5. Badge policy

Badges are the easiest way to make a page look cluttered. Default to **no
badges**.

- Do **not** add a “Badges: …” line under a section heading.
- Do **not** decorate ordinary prose with pills, tags, or status chips.
- Do **not** use emoji as status markers.
- A badge is allowed only when it communicates something the prose would
  otherwise have to repeat, for example a causal-effect strength or a verdict
  inside a comparison table.
- If badges are genuinely needed, use at most one short row per section, and
  reuse the same four semantic styles:

```css
.mypost .badge{ /* inline mono pill */ }
.mypost .b-strong{ /* positive: var(--text-col-4) */ }
.mypost .b-partial{ /* caution: var(--text-col-6) */ }
.mypost .b-null{ /* negative: var(--text-col-5) */ }
.mypost .b-mixed{ /* neutral: var(--text-col-2) */ }
```

Write the status in plain words. Prefer “causal effect at L24” as prose over a
pill that says the same thing.

---

## 6. Figures

Every figure uses one consistent card:

```html
<div class="figure">
  <img src="/portfolio/content/posts/<slug>/figure-name.png" alt="Descriptive alt text">
  <p class="cap">
    <span class="figno">Fig 1</span>
    <b>Short bold title.</b>
    One or two sentences explaining what the axes show and what the reader
    should take away.
  </p>
</div>
```

Spec:

- One image per `.figure` card. No side-by-side images inside one card.
- Caption uses `.cap`; the number uses `.figno` (`Fig 1`, `Fig 2`, …).
- The bold lead is a short human title, not a filename and not `E1-A` alone.
- Caption should say what to look at and why it matters.
- `alt` text is required and descriptive.
- Image paths are site-absolute:
  `/portfolio/content/posts/<slug>/<file>.png`.
- Images live in `content/posts/<slug>/`, not in a shared `figures/` folder.
- The image is full width inside the card, `border-radius:4px`, no extra border.
- For two related small figures, use `.two` (grid) containing two `.figure`
  cards with `style="margin:0"`; collapse to one column under 720px.
- For a vertical stack of full-width figures, use `.figstack`.

Figure CSS reference:

```css
.mypost .figure{
  margin:18px 0;
  background:var(--bg-elevated);
  border:1px solid var(--border);
  border-radius:var(--radius);
  padding:16px;
}
.mypost .figure img{width:100%;height:auto;display:block;border-radius:4px}
.mypost .cap{
  font-family:var(--mono);
  font-size:.82rem;
  color:var(--text-col-1-dim);
  margin:10px 2px 0;
  line-height:1.5;
}
.mypost .cap b{color:var(--text-col-1)}
.mypost .cap .figno{font-weight:700;color:var(--text-col-2);margin-right:6px}
```

No manual `width`/`height` attributes, no inline styling unless it is a layout
exception such as `.figure` inside `.two`.

---

## 7. Tables

Wrap every table so wide tables scroll instead of breaking the layout:

```html
<div class="tablewrap">
  <table class="tbl">
    <thead>
      <tr><th>Condition</th><th class="num">Accuracy</th><th>Reading</th></tr>
    </thead>
    <tbody>
      <tr><td>Baseline</td><td class="num">0.99</td><td>Strong.</td></tr>
    </tbody>
  </table>
</div>
```

Spec:

- Use `<thead>` and `<tbody>`.
- Header row uses `<th>`, body uses `<td>`.
- Numeric columns use `class="num"` for right alignment and tabular numerals.
- Table text is mono, `0.8rem`, with top borders between rows.
- Use `class="strong"` / `class="weak"` only to color a whole cell when the
  number itself is the point. Do not color every row.
- Never invent a second table style; reuse `.tbl`.

---

## 8. Cards, callouts, and verdicts

Use one card primitive for TL;DRs, bug notes, verdicts, and conclusions:

```html
<div class="card verdict">
  <span class="tag green">TL;DR</span>
  <p>…</p>
</div>
```

Variants are expressed with the left border and tag color:

- `.card.verdict` — green left border, used for TL;DR and final synthesis.
- `.card.good` — green.
- `.card.warn` — amber; used for caveats and bugs that change results.
- `.card.bad` — red/rose.
- `.card.accent` — blue; used for per-section verdicts.

Rules:

- One idea per card.
- A card starts with either a short `h4` or a `.tag`, never both competing for
  first position.
- Keep card prose shorter than body prose.
- Cards are `--bg-elevated`, 1px `--border`, `6px` radius, `16–18px` padding.
- Do not nest cards inside cards.

---

## 9. Interactive widgets

Only for HTML posts that truly need interaction. Use the same shell as
`number-geom-1.html`:

```html
<div class="widget">
  <div class="whead">
    <span class="wic">try it</span>
    <span class="wt">Tokenization explorer</span>
  </div>
  <div class="wbody">
    …controls…
    <div class="takeaway"><b>Why it matters:</b> …</div>
  </div>
</div>
```

Spec:

- `.wic` is a short mono action label (`try it`, `interactive`).
- `.wt` is the widget title.
- Controls use `.wctrl`, `.btn`, `.sliderrow`, `.legend`.
- Every interactive widget ends with a `.takeaway` sentence, so the section
  still reads if the widget is not used.
- Charts use the site tokens for axes, grid lines, tooltips, and series colors.
- Scripts are inline at the end of the fragment and must not rely on globals
  from earlier posts.
- Interactive figures are not numbered `Fig N`; number static figures only.
- Respect `prefers-reduced-motion` for any animation.

---

## 10. Typography and emphasis

| Role | Style |
|---|---|
| Body | `--body-serif`, 18px, line-height 1.72 |
| Section title `h2` | `--serif`, 900, 1.8rem, line-height 1.3 |
| Subsection `h3` | `--serif`, 900, 1.3rem |
| Label `h4` | `--mono`, .82rem, uppercase, letter-spacing .08em, accent |
| Inline code / terms | `--mono`, .86em, `--bg-card`, 1px `--border`, 4px radius |
| Captions and notes | `--mono`, .82rem, `--text-col-1-dim` |
| Small metadata | `--mono`, .78–.85rem, `--text-col-1-faint` or `-dim` |

Emphasis helpers:

- `strong` — weight 600, no color change by default.
- `.hl` — accent underline highlight, used sparingly on the one sentence that
  matters in a paragraph.
- `.term` — inline mono chip for a literal token or value (e.g. `54`, `x = 5`).
- `.math` — italic serif, non-wrapping, for inline mathematical expressions.
- `.finding` — a short standalone takeaway paragraph; its leading `strong` is
  accent-colored.
- `.pull` — one large italic serif pull quote with a 2px accent left border.
  At most one or two per post.

Do not mix custom font sizes into prose. If a size is needed, add a class.

---

## 11. Spacing and layout

- Content width is controlled by the site (`.wrap`, `--max-w`). The post
  wrapper must not set a competing max-width.
- Section spacing: 52px desktop, 42px mobile.
- Hero: no top padding; rule above the first section via `.rule`.
- Cards: 16–18px padding, 18–26px vertical margins.
- Figures: 16px padding, 18px vertical margins.
- Two-column grids: 16px gap; collapse to one column at 720px.
- Media query at 640px reduces body text to 17px and section spacing to 42px.
- Never use negative margins to force alignment.
- Never center body copy; the site reads left-aligned.

---

## 12. Accessibility and correctness

- Every image has meaningful `alt` text.
- Heading order is `h2` → `h3`; do not skip levels for styling.
- Do not use color alone to convey a result; pair `.strong`/`.weak` with text.
- Color must come from tokens so light and dark themes both work.
- Interactive controls need labels and keyboard support.
- Tables need a header row.
- Keep the DOM valid: no block elements inside `<p>`, no unclosed tags.
- The post must not include `<script>` that depends on page-load order.

---

## 13. Do and do not

**Do**

- Copy the section, figure, table, and card markup from `number-geom-1.html`.
- Keep part dividers in the style of `number-comp.html`.
- Use sentence-case, question-led `h2` titles.
- Number sections consistently (`1`, `2`, … or `01`, `02`, …).
- Let the site render the title, meta line, header image, and TOC rail.
- Scope every style under one wrapper class.
- Use site tokens for all colors and fonts.

**Do not**

- Add `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, or a second `<h1>`.
- Add a manual table of contents.
- Add a “Badges: …” line or decorate prose with pills.
- Use emoji, gradients, drop shadows, or custom scrollbars.
- Hardcode hex colors, font families, or pixel breakpoints.
- Put two images in one figure card.
- Use `figures/…` relative paths; use `/portfolio/content/posts/<slug>/…`.
- Mix multiple card or table styles in one post.

---

## 14. Definition of done

Before publishing, confirm:

- [ ] `title` is the only `h1`; it is rendered by the site.
- [ ] Header image and caption are set in the manifest.
- [ ] Description (`.lede`) is one paragraph, 4–5 lines maximum.
- [ ] No badge rows or decorative pills in prose.
- [ ] First prose paragraph has the drop cap, exactly once.
- [ ] Every section uses `.sec-head` with `.sec-num` + `h2`.
- [ ] Part dividers use `.part-label` and the same pattern everywhere.
- [ ] Figures use `.figure` + `.cap` + `.figno`; all images have alt text.
- [ ] Tables use `.tablewrap` + `.tbl` with a header row.
- [ ] All custom CSS is scoped and uses site tokens.
- [ ] The page works in both light and dark themes.
- [ ] The post renders at 760px and at 375px without horizontal overflow.
- [ ] HTML validates: balanced tags, no block elements inside `<p>`.
