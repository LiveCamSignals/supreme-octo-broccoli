# CamIndex

A 100-page static adult cam directory generated from the Chaturbate public affiliate API. All outbound links use revshare campaign code `T2CSW`.

---

## Two ways to deploy on GitHub Pages

### Option A — Simple (manual rebuild)

Use this if you just want the site live and don't care about auto-refresh.

1. Create a new public repo on GitHub.
2. Upload **everything in this folder EXCEPT** `generate.mjs` and the `.github/` folder.
3. Settings → Pages → Source: **Deploy from a branch** → Branch: **main / root** → Save.
4. Wait ~1 minute, your site is live.

To refresh later, run `node generate.mjs` on your computer and re-upload the new files.

### Option B — Recommended (auto-rebuild every 6 hours)

Use this if you want the site to stay fresh forever without touching it again.

1. Create a new public repo on GitHub.
2. Upload **only** these two items:
   - `generate.mjs`
   - the `.github/` folder (contains `.github/workflows/build.yml`)
3. Settings → Pages → Source: **GitHub Actions** (NOT "Deploy from a branch").
4. Click the **Actions** tab → click the **Build and Deploy** workflow → click **Run workflow** to trigger the first build immediately. After that it runs automatically every 6 hours.

The workflow re-fetches the live API, rebuilds all 100 pages, and deploys. Free GitHub accounts get 2,000 Action minutes/month — each build takes ~30 seconds, so you'll use less than 4 minutes/month.

---

## Updating SEO URLs

For correct sitemap.xml and canonical tags, open `generate.mjs` and set:

```js
const SITE_URL = 'https://yourusername.github.io/your-repo-name';
```

Then commit. The auto-rebuild will pick it up next run.

---

## Affiliate code

All outbound links use `campaign=T2CSW` (revshare). To change it, edit the `WM` constant at the top of `generate.mjs`.
