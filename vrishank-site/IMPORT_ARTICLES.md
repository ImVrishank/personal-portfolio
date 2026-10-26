# Moving your articles from vrishank.super.site into this site

**Why this is manual:** super.site blocks automated access (robots), so I can't read it from here. A Super site is a Notion workspace published through Super, so the clean way out is Notion's own export, which keeps your text, headings, code blocks, tables and images.

## Option A (best): Notion export, then the importer

1. In Notion, open the page that powers vrishank.super.site (the home page of the site, or the page/database that holds your articles).
2. Click the `...` menu (top right), then **Export**.
3. Format: **Markdown & CSV**. Turn on **Include subpages**. Turn on **Create folders for subpages** if offered. Export.
4. Unzip the download. (Notion sometimes puts a second zip inside; unzip that too.)
5. Either:
   - **Send me the zip** in chat and I'll run the importer, fix what needs fixing, and add the posts. Or
   - Run it yourself from the project folder:

   ```bash
   node scripts/import-notion.mjs path/to/unzipped-export --dry   # preview, writes nothing
   node scripts/import-notion.mjs path/to/unzipped-export         # writes posts and images
   ```

What the importer does: turns each page into `content/posts/<date>-<slug>.md`, reads Notion properties (Created, Tags, Status, Summary, Slug) into front matter, copies images into `content/media/<slug>/` and rewrites their paths, links imported pages to each other, converts callouts to blockquotes, normalizes code-fence languages (`C++` to `cpp`), and prints warnings for anything it could not resolve.

After importing, open the posts in `/studio/` to add a topic (`robotics`, `math`, `ai`, `electronics`, `notes`), a cover image and a summary.

**Pages that are not articles** (home, about, resume pages inside your Notion) will also come in as posts. Skip them with `--skip "home|about|resume"` or delete the files afterwards.

## Option B: paste articles one by one

Open `/studio/`, make a new post, paste the article text. Markdown from Notion ("Copy as Markdown" or `Ctrl+Shift+C` in some Notion versions) pastes cleanly; images can be pasted or dropped into the editor.

## Option C: if the super.site pages are public and you just need the text

Send me the article text (or the list of titles with the text) and I'll format them as posts.

## Also tell me

- Any **projects** on the old site that are not on your resume (you mentioned adding more). Names plus one or two lines each is enough, or they will come with the export.
- Which articles are **drafts** and should stay hidden.
- Anything on the old site you want kept as its own page.
