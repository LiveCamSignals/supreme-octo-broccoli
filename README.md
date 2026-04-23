# CamIndex

Static adult cam directory generated from the Chaturbate public affiliate API.

## Deploy to GitHub Pages

1. Create a new repository on GitHub.
2. Copy the contents of this `dist/` folder into the repo root (or push as-is and set Pages source to `/dist`).
3. In repo Settings → Pages, choose the branch and folder, then save.
4. Update `SITE_URL` in `generate.mjs` to your Pages URL and rebuild for correct sitemap/canonical URLs.

## Rebuild

```bash
node generate.mjs
```

Regenerates 100 pages from the live API. All outbound links use revshare campaign code `T2CSW`.
