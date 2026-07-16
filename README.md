<h1 align="center">
  <br>
  <img src="https://img.icons8.com/fluency/256/radar.png" alt="Lead Radar" width="120">
  <br>
  Lead Radar
  <br>
</h1>

<h4 align="center">Finds newly launched startups & businesses worldwide that likely need custom SaaS/software work — and refreshes the list every day, for free.</h4>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-how-to-use-local">Use Locally</a> •
  <a href="#-free-daily-auto-update">Deploy</a> •
  <a href="#-the-dashboard">Dashboard</a> •
  <a href="#-project-layout">Layout</a> •
  <a href="#-license">License</a>
</p>

<p align="center"><a href="https://github.com/adilsukumar/Lead-Radar">github.com/adilsukumar/Lead-Radar</a></p>

---

Built for freelancers & agencies who sell SaaS builds and want a daily stream of fresh, qualified prospects across every region — with outreach templates ready to send.

## 🎯 Key Features

- 🕵️ **Daily scrape of 5 free sources** — Hacker News (Show HN / Launch HN), startup RSS feeds (EU-Startups, Tech.eu, TechCrunch, Sifted, Disrupt Africa, LatamList, Tech in Asia), Dev.to, GitHub new repos, and SEC EDGAR. No keys, no paid APIs.
- 🧠 **Smart qualification** — every lead gets a detected **country/region**, **industry** (17 buckets), extracted **contacts/links**, and a **Needs-SaaS score (0–100)** with a **hot / warm / cold** tier.
- 💡 **"What to sell them"** — infers suggested services and a pitch angle per lead from its buying signals.
- ✉️ **Ready-to-send outreach** — click any lead for a detail panel with 4 editable, auto-personalized templates: **Email, WhatsApp, Call script, LinkedIn DM** — plus copy & open-in-app.
- 🏆 **Leaderboards** — hottest leads, top countries, top industries, most common buying signals.
- 📋 **Outreach tracker** — mark leads New → Contacted → Replied → Accepted/Rejected; get an **acceptance-rate funnel** and a live pipeline (saved in your browser).
- 🔗 **Research links per lead** — one-click Google Maps, Google, LinkedIn, Crunchbase, and find-email lookups.
- 🧹 **Automatic deduplication** across sources, keeping the richest record.
- ⚡ **Zero dependencies** — the scraper runs on Node 18+ built-in `fetch`. No `npm install`.
- 💸 **100% free** — auto-updates daily via GitHub Actions + GitHub Pages.
- 🔌 **Optional paid enrichers** — drop in Hunter / Apollo / Crunchbase keys to add **phone, verified emails, and location**. Off by default; the free path always works.

---

## 🚀 How To Use (Local)

```bash
# 1. Fetch + qualify leads (writes public/leads.json)
npm run update

# 2. Preview the dashboard
npm run serve
# open http://localhost:8080
```

> Requires **Node ≥ 18**. No `npm install` needed — the scraper is zero-dependency.

---

## ☁️ Free Daily Auto-Update

The workflow at `.github/workflows/daily.yml` runs on GitHub's free tier. Every day at **06:12 UTC** it runs the scraper, commits the refreshed `public/leads.json`, and redeploys the dashboard.

**One-time setup (required — see the note below):**

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Trigger a run from the **Actions** tab → **Daily lead refresh** → **Run workflow** (or wait for the next daily run).

> ⚠️ **If the `deploy` job fails but `refresh` succeeds**, it's almost always because Pages source isn't set to **GitHub Actions** yet. Do step 2 above and re-run — the fetch worked, only the publish step needs Pages enabled. No secrets are required.

---

## 🎛️ The Dashboard

Two tabs: **Leads** and **Leaderboards**.

**Leads** — search by keyword; filter by region, country, industry, minimum Needs-SaaS score, and "has contact info". Sorted by score, then recency, so your best prospects sit on top. Any tracked lead shows a status tag on its card.

**Click a lead** to open its detail panel:
- What they do · what they might want · suggested services · score & tier · signals · website · phone · email · location
- Research links: Google Maps, Google, LinkedIn, Crunchbase, find-email
- Four outreach templates (Email / WhatsApp / Call / LinkedIn) — editable, personalized with your name/company/offer (saved in your browser), with **Copy** and **Open in app**
- Outreach status pills to move the lead through your pipeline

**Leaderboards** — hottest leads, top countries/industries/signals, plus your personal acceptance-rate funnel and pipeline.

---

## 🛠️ Tuning It for Your Niche

Everything lives in small, readable files:

| Customization | File |
|---|---|
| Which data sources run | `src/sources/*.js` + `src/index.js` |
| Buying signals / weights / tiers | `src/lib/score.js` |
| Suggested services & pitch angle | `src/lib/score.js` + `src/lib/bizintel.js` |
| Industry buckets | `src/lib/classify.js` |
| Countries / cities detected | `src/lib/geo.js` |
| RSS feeds in the mix | `src/sources/rssfeeds.js` |
| Paid enricher providers | `src/lib/enrichers.js` |
| Dashboard UI & templates | `public/index.html` |

### Optional Paid Enrichers

Set any of these env vars (see `.env.example`) to enrich the top-scored leads with phone, verified emails, and location — all **off by default**:

```bash
HUNTER_API_KEY=...       # emails for a company domain
APOLLO_API_KEY=...       # phone, company size, industry, location
CRUNCHBASE_API_KEY=...   # funding + firmographics
ENRICH_TOP_N=25          # how many top leads to enrich per run
```

Also optional: `GITHUB_TOKEN` raises the GitHub source's rate limit (auto-provided inside Actions).

---

## 📈 How Leads Are Scored

`score.js` adds weighted points for positive signals and subtracts for non-fits, clamped to 0–100, then maps to a tier:

- **Positive** — just launched, MVP/early stage, just funded, manual/spreadsheet pain, needs a platform, hiring engineers, scaling pains, beta/waitlist.
- **Negative** — large/established, editorial/opinion/podcast, VC funds, first-person narrative blog posts.
- **Tiers** — 🔥 hot, 🟡 warm, ⚪ cold.

> A low score isn't "bad" — short titles (common on registries) score lower even for great-fit companies. Use the **country/industry filters** alongside score.

---

## ⚠️ Limitations (Honest)

- **No single free source has "every business in every country"** — that data is fragmented across ~200 mostly-paid registries. This maximizes *free* global coverage and is easy to extend.
- **Coverage skews tech / English-speaking.**
- **Phone & address need a paid enricher key** — free sources don't carry them (Google Maps/LinkedIn lookup links are provided instead).
- **Geo/score are sparse on short text** — one-line titles often show `—`.
- **Cloudflare-protected feeds** (e.g. e27) block non-browser requests and are skipped.
- **The tracker & templates are browser-local** — a $0 static site has no shared backend, so outreach data lives in your browser.

---

## 📁 Project Layout

```text
Lead-Radar/
├─ src/
│  ├─ index.js          # orchestrator → writes public/leads.json
│  ├─ serve.js          # zero-dep local static server
│  ├─ sources/          # hackernews, rssfeeds, devto, github, edgar
│  └─ lib/              # http, rss, geo, classify, score, extract,
│                       #   enrich, bizintel, enrichers
├─ public/
│  ├─ index.html        # dashboard: leads, modal, templates, boards, tracker
│  └─ leads.json        # generated data
├─ .github/workflows/daily.yml   # free daily cron + Pages deploy
├─ vercel.json          # optional Vercel static deploy
└─ .env.example         # optional enricher keys
```

---

## 📄 License

MIT
