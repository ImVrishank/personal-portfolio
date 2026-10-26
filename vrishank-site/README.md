# vrishank-site

Markdown in, fast static HTML out. One dependency (`marked`).

```bash
npm install
npm run dev     # http://localhost:3000 (drafts included, rebuilds on save)
npm run build   # outputs ./dist
npm run check   # build + verify links, images, headings, meta
```

## Where things live

- Home page content, about text, topics, projects, links: `content/site.json`
- Blog posts: `content/posts/*.md` (or write them in `/studio/`). **How to write posts and use math, Desmos, YouTube, Observable, plots and galleries: `WRITING.md`**
- Electronics entries: `content/electronics/*.md` (start from `_TEMPLATE.md`)
- Project write-ups (optional, one page each): `content/projects/<slug>.md`, start from `_TEMPLATE.md`
- Images and video: `content/media/` (served at `/media/`)
- Look and feel: the token block at the top of `src/assets/styles.css`

## Importing from Notion

Export from Notion as Markdown & CSV, unzip (twice if there is a zip inside), then:

```bash
node scripts/import-notion.mjs path/to/export --dry   # preview
node scripts/import-notion.mjs path/to/export         # write posts and images
```

## Writing

`/studio/site/` edits the home page content (bio, links, projects, skills) as a form and can upload images and your resume PDF.

`/studio/` is an in-browser editor with live preview. It can import `.md` files, export them,
or publish straight to your GitHub repo (single commit with the post and its images).

## Deploy

Cloudflare Pages or Vercel: build command `npm run build`, output directory `dist`.

Step-by-step hosting instructions: `DEPLOY.md`.

See `PROGRESS.md` for status and next steps.
