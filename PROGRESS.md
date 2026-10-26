# Progress tracker: vrishank site

Last updated: end of session 6 (feedback round on the redesign).
Keep this file current. It is the source of truth when a session runs out.

## Resume prompt (paste into a new chat with the zip or folder attached)

> I'm continuing my portfolio. Project: the attached `vrishank-site`. Read `PROGRESS.md` and `WRITING.md` first, then continue from "Next up". Stack: zero-framework Node static generator (`build.mjs`), content in `content/`, shared Markdown pipeline `src/assets/md.js` (KaTeX math, footnotes, directive components), studio at `/studio/` and `/studio/site/`. Design tokens are at the top of `src/assets/styles.css`.

## What exists now

**Design ("the page is a coordinate plane")**
- Light "drafting paper" and dark "night desk" themes (header toggle, follows the system). Tokens at the top of `styles.css`.
- Faint 48px graph grid + a flow-field background (`bg.js`): particles drift along a smooth vector field and bend around the pointer. Static streamlines on touch, reduced motion, low-power devices and article pages (so it never competes with reading).
- Cursor "probe": native cursor is never hidden; a small ring reads plane coordinates, grows over links with a label, goes quiet over prose/inputs/embeds/plots, is absent on touch.
- Hero figure: the four boards the owner actually programs (Raspberry Pi 5, ESP32-CAM, ESP32-WROOM, Jetson Nano), each with its own generated illustration, linking to its page. (The earlier two-link arm hero was removed: it had nothing to do with the owner's work.)
- Type: Fraunces (display), Newsreader (reading), Geist (UI), Geist Mono (labels). Loaded from Google Fonts.

**Pages**
- `/` home: hero + arm, Lately (writing), Things that move (projects, varied layouts), On the bench (electronics), About teaser, contact.
- `/writing/` archive: featured, topic and tag filters, search, two card types (cover / typographic). `/writing/<slug>/` articles: breakout grid (text / wide / full), sticky TOC (wide screens) or collapsible TOC, three openings (`layout:` default, photo, math), reading-progress bar, related posts, prev/next.
- `/projects/` index (grouped by domain) and `/projects/<slug>/` for every project (write-up from `content/projects/<slug>.md` when present, else summary + specs + "write-up coming" note; shows related parts and posts).
- `/electronics/` lab-notebook collection with type filter; `/electronics/<slug>/` datasheet-style pages. Parts without a photo get a generated circuit illustration.
- `/about/`, `/resume/` (print-ready), `/studio/` (posts), `/studio/site/` (site content form), RSS, sitemap, robots, 404.

**Writing system** (see `WRITING.md` for exact syntax)
- Plain Markdown plus: `$math$`, `$$display$$`, footnotes, code highlighting with copy button, captioned figures, lightbox.
- Components: `::desmos`, `::youtube` (click-to-play), `::vimeo`, `::observable`, `::embed`, `::figure`, `::video`, `::plot` (built-in function grapher with sliders, own expression parser, no eval), `:::gallery`, `:::callout`.
- iframes load near the viewport, sandboxed, with "taking a while" hint and an always-visible direct link; Save-Data users get click-to-load. Bad component usage shows a red error box naming the problem.
- The studio preview uses the same pipeline (math, components, footnotes all render live) and has fields for topic, layout, cover, equation, featured.

**Other**
- Studio can publish to GitHub (one commit, post + images) and pull posts; site editor edits `content/site.json` (profile, links, home wording, about, topics, work, projects incl. domain/tags, skills, education) with image/PDF upload that survives reloads.
- Notion importer: `node scripts/import-notion.mjs <unzipped-export> [--dry]` (tested on a synthetic export only).
- `npm run check`: links, anchors, alt text, h1, meta (ignores code samples). Passes with and without drafts.

## Session 6 feedback (from the owner) and what changed

- Removed the "two elbow" arm hero, its script and the IK sample article. Rule going forward: **no decorative demos; everything on the site must be about the owner's real work.**
- Electronics: the four boards the owner programs come first and are the only ones on the home page: Raspberry Pi 5, ESP32-CAM (new), ESP32-WROOM, Jetson Nano (`core: true` in front matter, tag "I program this"). OLED, PCA9685 and UBEC are demoted to an "Around the boards" section. Each board has a distinct illustration.
- Added the **SpiRobs** project (first featured, domain `robotics`): MuJoCo 3D simulation of a three-tendon, three-actuator arm with an RL environment in training. Only the owner's stated facts were used. **No photos, video or numbers yet: waiting for the owner to supply them.** New "Now" line in the hero (Hoogway + SpiRobs).
- Bio corrected to match the resume (the owner builds GPT-2/BPE/Word2Vec from scratch rather than "retraining" models). Email set from the resume PDF's mailto link: `vrishank_24iseu057@uvce.ac.in`. The resume has no GitHub or LinkedIn link, so those stay empty. Phone number is deliberately not on the site.
- Visitor-facing placeholder text no longer shows developer instructions (those are HTML comments now).
- Background kept as is (owner likes it, especially in light mode).
- **vrishank.super.site could not be read** (robots-blocked, not indexed). Articles still need importing: see `IMPORT_ARTICLES.md`. The owner also mentioned more projects on that site beyond the resume; not yet seen.

## Verified (sessions 5 and 6) (Chromium, desktop 1440, tablet 820, mobile 390)

Markdown pipeline (17 assertions: math incl. currency, footnotes, directives, errors, TOC, highlighting); studio preview + new front-matter fields; site editor (new sections, edits, download); 22 interaction checks (lazy embeds + sandbox, YouTube facade, lightbox keys, probe coordinates/link/quiet/touch-absent, bg present on touch+reduced-motion, no horizontal scroll on mobile, topic/search/kind filters, arm follows pointer); link checker.

## Known gaps and honest limits

- **References were not visually inspected.** Only abhigyagoel.com's text could be fetched; cardona.co, benjaminpiras.com and pudding.cool could not be retrieved, and no reference's background/cursor code was visible. The direction comes from the brief's descriptions. Expect to adjust taste (palette, density, how loud the background is) once you see it.
- Google Fonts do not load in the sandbox, so layout was verified with fallback fonts. Fraunces/Newsreader/Geist will look more refined, and line breaks may shift slightly.
- Not verified in real Safari/Firefox, on a physical phone, or with a real screen reader. Desmos, Observable and YouTube iframes were verified to mount correctly, but the third-party content itself could not load in the sandbox.
- Sample content is placeholder: one draft post (the writing cheat sheet) and the seven electronics entries (datasheet facts only; your own notes and photos are missing). Projects still have no photos or repo links. Contact links and `url` in `site.json` are empty.
- GitHub publishing is mock-tested only. Notion importer is untested on a real export.
- `led.js` and the LED hero, and later `arm.js` and the arm hero, were removed; `availability` in `site.json` is no longer shown on the home page.

## Next up (in order)

1. **Import the articles** from vrishank.super.site via a Notion export (`IMPORT_ARTICLES.md`); get the extra projects from that site.
2. **SpiRobs content:** screenshots/GIF/video of the MuJoCo sim, training curves, what the RL task is, repo link. Write `content/projects/spirobs.md` (an `::video` or `::figure` goes at the top).
3. **Real notes and photos** for the four boards (what was built on each, wiring, pitfalls). Delete or replace the sample cheat-sheet draft.
3. **Links and domain** in `/studio/site/` (email, GitHub, LinkedIn, resume PDF, site URL).
4. **Deploy** following `DEPLOY.md`; try Publish to GitHub on a throwaway branch first.
5. **Polish with real fonts and devices:** check on your phone, adjust font sizes, consider self-hosting fonts.

## Backlog

- Studio: edit electronics entries and project write-ups (currently posts + site.json only).
- Per-post share images; tag pages; live home preview in the site editor.
- Optional: a second background mode (e.g. contour lines), `::sim` component for your own canvas simulations, `::desmos` fallback screenshot support.

## File map

```
content/site.json          home, about, topics, projects, links
content/posts/*.md         articles (front matter documented in WRITING.md)
content/electronics/*.md   boards (core: true = the ones I program) and parts (_TEMPLATE.md)
content/projects/*.md      project write-ups (_TEMPLATE.md)
content/media/             images, video, sims (served at /media/)
src/assets/styles.css      tokens + all styles
src/assets/md.js           shared Markdown pipeline (build + studio)
src/assets/embeds.js       lazy embeds, YouTube facade, lightbox, plot
src/assets/bg.js           background + probe cursor
src/assets/highlight.js    code highlighter
src/assets/studio.*, site-editor.js, gh.js   studio pages and GitHub helper
build.mjs                  generator
scripts/                   dev server, checker, Notion importer
```

## Session log

- **Session 5:** Full redesign per the brief: new visual system, hero arm, flow-field background, probe cursor, new sections (projects index, electronics, about), article layouts, shared Markdown pipeline with math/footnotes/components, studio and site editor updated, docs (`WRITING.md`), regenerated share image.
- **Sessions 1 to 4:** single-file portfolio; Markdown static generator + studio; Notion importer, highlighting, project pages, GitHub publish, resume page, dark theme, site editor, checker.
