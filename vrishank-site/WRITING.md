# Writing guide

Everything is ordinary Markdown. Add a few one-line components when a post needs them.
The sample post `content/posts/2026-10-14-writing-cheatsheet.md` shows every feature working. Delete or edit the sample drafts (`draft: true`) when you have real posts.

## 1. Create a post

**In the browser:** open `/studio/`, write, then Download .md (or Publish to GitHub; see DEPLOY.md).
**By hand:** add `content/posts/YYYY-MM-DD-my-slug.md`.

```yaml
---
title: "Servo jitter on the PCA9685"
date: 2026-10-20
summary: "One sentence shown on cards and in link previews."
category: robotics        # robotics | math | ai | electronics | notes (edit the list in content/site.json, "topics")
tags: [esp32, firmware]
cover: /media/jitter/cover.jpg      # optional: card image and opening photo
coverAlt: "A servo on the bench"    # alt text for the cover
layout: photo             # default (text first) | photo (full-bleed photo opening) | math (equation opening)
equation: "e^{i\\pi}+1=0" # optional: shown on cards, and opens a math layout post. Double the backslashes inside quotes.
featured: true            # shown big on the archive and home page
project: sesame           # optional: links the post to a project page
updated: 2026-11-02       # optional
draft: true               # hidden on the live site until you remove this line
---
```

Images and video go in `content/media/` and are referenced as `/media/...`.
Posts over about three headings get a table of contents automatically.

## 2. Math (KaTeX)

```markdown
Inline math like $a^2 + b^2 = c^2$ sits in a sentence.

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
```

Dollar amounts such as `$5 and $10` are left alone. Equations are rendered at build time, so readers download no math JavaScript.

## 3. Footnotes

```markdown
A claim.[^1]

[^1]: The footnote text. It can contain *Markdown* and [links](https://example.com).
```

## 4. Code

Fenced blocks get highlighting and a copy button. Languages: `cpp` (also `c`, `ino`, `arduino`), `python`, `js`/`ts`, `rust`, `java`, `json`, `yaml`, `bash`. Others are shown as plain text.

## 5. Components

One line: `::name{key="value" flag}`. Wrap blocks: `:::name{...}` ... `:::`.
All iframes load only when scrolled near, are sandboxed, show a link if they are slow, and always have an "open directly" link underneath. Visitors with Save-Data on get a click-to-load button.

| Component | Syntax |
| --- | --- |
| Desmos graph | `::desmos{id="abc123" caption="Optional" height="480"}` (id = last part of the calculator URL) |
| YouTube | `::youtube{id="VIDEO_ID" start=30 caption="Optional"}` (click-to-play; no requests to YouTube until clicked) |
| Vimeo | `::vimeo{id="123456789"}` |
| Observable | `::observable{notebook="@user/notebook-name" cells="chart,viz"}` (`cells` is optional) |
| Any iframe or your own simulation | `::embed{src="/media/sims/pendulum.html" ratio="4/3" caption="..."}` (https URL or a `/media/` path) |
| Figure | `::figure{src="/media/a.jpg" alt="Describe it" caption="Optional" wide}` |
| Local video | `::video{src="/media/clip.mp4" poster="/media/clip.jpg" caption="..." loop muted}` |
| Plot (built in) | `::plot{expr="sin(a*x)" a="0..6" xmin=-10 xmax=10 caption="..."}` |
| Gallery | `:::gallery{cols=3}` then `![alt](/media/a.jpg "caption")` lines, then `:::` |
| Callout | `:::callout{type="note" title="Optional"}` text `:::` (types: `note`, `idea`, `warn`) |

Add `wide` or `full` to a figure, video, embed, plot or gallery to let it break out of the text column. Plain Markdown images with a title (`![alt](/media/a.jpg "caption")`) become captioned figures. Clicking any figure or gallery image opens a lightbox (arrow keys work).

### The built-in plot

A real function grapher, no external service.

- `expr` is the formula in `x`. Separate several curves with `;` (`expr="sin(x); cos(x)"`).
- A slider appears for any of `a b c d k m n t` written as a range: `a="0..5"` or `a="0..5..2"` (the third number is the starting value).
- Optional: `xmin xmax ymin ymax height`. The y range is chosen automatically if omitted.
- Operators `+ - * / ^`; functions `sin cos tan asin acos atan sinh cosh tanh exp ln log sqrt abs floor ceil round sign min max pow`; constants `pi e tau`. Writing `2x` or `3(x+1)` works.
- Readers can hover or drag across the plot to read values.

A malformed component shows a red "Component error" box naming what is missing, instead of silently breaking the page.

## 6. Electronics entries

`content/electronics/my-part.md`, start from `content/electronics/_TEMPLATE.md`. They appear on `/electronics/`, on the home page "On the bench", and on the page of the project named in `project:`. Without a `image:` a small circuit-style illustration is generated for the part.

## 7. Projects

Projects live in `content/site.json` (or `/studio/site/`). For a long write-up copy `content/projects/_TEMPLATE.md` to `content/projects/<slug>.md`. The `domain` field (`hardware`, `software`, `ai`, `math`) sets the colour and grouping.

## 8. Checking your work

`npm run dev` shows drafts and rebuilds on save. `npm run check` verifies links, images, headings and metadata.
