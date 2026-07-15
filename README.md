# Lead Radar

Finds **newly launched startups & businesses worldwide** that likely need custom SaaS/software work — and refreshes the list **every day, for free**.

Built for freelancers/agencies who sell SaaS builds and want a daily stream of fresh, qualified prospects across every region.

---

## What it does

Every day it:

1. **Scrapes free public sources** (no paid APIs, no keys required):
   - **Hacker News** — Show HN / Launch HN (founders announcing just-launched products)
   - **Startup RSS feeds** — EU-Startups, Tech.eu, TechCrunch, Sifted, Disrupt Africa, LatamList, Tech in Asia (global coverage)
   - **Dev.to** — `startup` / `saas` / `buildinpublic` / `launch` posts
   - **GitHub** — brand-new repos that look like products
   - **SEC EDGAR** — newly filing US companies (public registry)
2. **Qualifies each lead** on the four things that matter:
   - **Country / region** — keyword + gazetteer detection
   - **Industry / category** — 17 buckets (Fintech, Healthtech, AI, SaaS, …)
   - **Contact info / links** — extracts emails, company site, socials
   - **"Needs-SaaS" score (0–100)** — buying signals like *just launched, MVP, just funded, manual/spreadsheet process, hiring engineers, scaling pains*
3. **Dedupes** the same launch appearing on multiple sources, keeps the best record.
4. Writes `public/leads.json` and shows it in a **filterable dashboard**.

---

## Quick start (local)

```bash
# 1. Fetch + qualify leads (writes public/leads.json)
npm run update

# 2. Preview the dashboard
npm run serve
# open http://localhost:8080
```

No `npm install` needed — the scraper is **zero-dependency** (uses Node 18+ built-in `fetch`). Requires Node ≥ 18.

---

## Free daily auto-update (GitHub Actions + Pages)

The included workflow (`.github/workflows/daily.yml`) runs everything on GitHub's free tier:

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. That's it. Every day at 06:12 UTC the action:
   - runs the scraper,
   - commits the refreshed `public/leads.json`,
   - redeploys the dashboard to your Pages URL.

You can also trigger it manually from the **Actions** tab (**Run workflow**).

> No secrets required. If the repo's automatic `GITHUB_TOKEN` is present (it is, in Actions) the GitHub source gets higher rate limits automatically.

---

## Using the dashboard

- **Search** by keyword (name / description).
- **Filter** by region, country, industry, minimum needs-SaaS score, and "has contact info".
- Each card shows the score, the signals that earned it, detected country/industry, and links (website / discussion / socials) so you can reach out.

Sort is by score first, then recency — so your best prospects are always on top.

---

## Tuning it for your niche

Everything lives in small, readable files:

| Want to change… | Edit |
|---|---|
| Which sources run | `src/sources/*.js` + `src/index.js` |
| Buying signals / weights | `src/lib/score.js` |
| Industry buckets | `src/lib/classify.js` |
| Countries / cities detected | `src/lib/geo.js` |
| RSS feeds in the mix | `src/sources/rssfeeds.js` |
| Dashboard look/behavior | `public/index.html` |

### Optional paid upgrades (only if you later want more)
The architecture leaves room for these behind API keys — all **off by default**:
- Product Hunt (launches), UK Companies House (registry), OpenCorporates (global registry), Crunchbase/Apollo (contacts + funding).

---

## How leads are scored (transparency)

`score.js` adds weighted points for positive signals (just launched +22, MVP +20, just funded +18, manual/spreadsheet pain +20, needs a platform +18, hiring engineers +14, …) and subtracts for non-fits (large/established, pure editorial/opinion, VC funds). Final score is clamped to 0–100.

A low score isn't "bad" — it just means fewer explicit buying signals were in the text. Short titles (common on registries) naturally score lower even when the company is a great fit, so use the **country/industry filters** alongside score.

---

## Limitations (honest)

- **No single source has "every business in every country."** That data is fragmented across ~200 registries, mostly paid. This tool maximizes *free* global coverage and is easy to extend.
- **Geo/score are sparse on short text.** Many items are one-line titles with no location; those show `—`. Deeper enrichment (fetching each company page) is possible but slower and risks rate limits, so it's off by default.
- Cloudflare-protected feeds (e.g. e27) are skipped — they block non-browser requests.

---

## Project layout

```
lead-radar/
├─ src/
│  ├─ index.js          # orchestrator → writes public/leads.json
│  ├─ serve.js          # zero-dep local static server
│  ├─ sources/          # one file per data source
│  └─ lib/              # http, rss, geo, classify, score, extract, enrich
├─ public/
│  ├─ index.html        # dashboard (vanilla JS, no build step)
│  └─ leads.json        # generated data
└─ .github/workflows/daily.yml   # free daily cron + Pages deploy
```

## License
MIT
