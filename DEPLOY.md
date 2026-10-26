# Deploying the site

Total time: about 20 minutes. Cost: free, plus about ₹1,000 a year for a domain.

## 1. Put the project on GitHub

1. Create an empty repository on github.com (for example `vrishank-site`). Private is fine.
2. In the project folder:

   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<you>/vrishank-site.git
   git push -u origin main
   ```

## 2. Host it (pick one)

**Cloudflare Pages (recommended)**
1. Cloudflare dashboard, Workers & Pages, Create, Pages, Connect to Git, pick the repo.
2. Framework preset: None. Build command: `npm run build`. Build output directory: `dist`.
3. Deploy. You get a `*.pages.dev` address immediately.

**Vercel**
1. Import the repo. Framework preset: Other. Build command `npm run build`, output directory `dist`.

Every push to `main` rebuilds the site. That includes pushes made by the studio's "Commit" buttons.

## 3. Domain

1. Buy a domain (Cloudflare Registrar, Namecheap, Porkbun).
2. In your host's dashboard, add the custom domain and follow the DNS instructions it shows.
3. Open `/studio/site/` (or edit `content/site.json`) and set **Site URL** to `https://yourdomain`. This turns on the sitemap, canonical links and the share image.
4. Update the website URL on your resume and LinkedIn.

## 4. Use the studio from the live site

1. GitHub, Settings, Developer settings, Fine-grained tokens, Generate new token.
2. Repository access: only this repository. Permissions: Contents, Read and write.
3. Open `https://yourdomain/studio/` or `/studio/site/`, expand "Publish to GitHub", enter `you/vrishank-site`, branch `main`, paste the token. Tick "Remember" only on devices you trust.
4. Test once with a throwaway post marked as draft.

The studio pages are not linked prominently and are excluded from search engines (`noindex`, `robots.txt`), but they are public URLs. They hold no secrets: the token lives only in your browser.

## 5. Before you share the link

```bash
npm run check
```

Fix any ERROR lines. The warnings tell you what is still empty (email, GitHub, LinkedIn, site URL).

## Troubleshooting

- **Build fails on the host:** make sure `package.json` and `package-lock.json` (created by `npm install`) are committed, and the Node version is 20 or newer.
- **Styles missing:** the output directory must be `dist`, not the repo root.
- **Share image not showing on LinkedIn:** paste the URL into LinkedIn's Post Inspector to refresh its cache.
- **Studio says "GitHub said 403/404":** the token lacks access to this repository, or the repo name or branch is wrong.
