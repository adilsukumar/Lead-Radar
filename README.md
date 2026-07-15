<h1 align="center">
  <br>
  <img src="https://img.icons8.com/fluency/256/radar.png" alt="Lead Radar" width="120">
  <br>
  Lead Radar
  <br>
</h1>

<h4 align="center">Finds newly launched startups & businesses worldwide that likely need custom SaaS/software work — and refreshes the list every day, for free.</h4>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#how-it-works">How To Use</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#license">License</a>
</p>

---

## 🎯 Key Features

- 🕵️ **Daily Scrapes Free Public Sources**: Gathers fresh leads from Hacker News (Show HN / Launch HN), Startup RSS feeds, Dev.to, GitHub, and SEC EDGAR.
- 🧠 **Smart Qualification**: Analyzes the data to evaluate contact info, geographical region, industry, and assigns a "Needs-SaaS" score (0–100) based on buying signals.
- 🧹 **Automatic Deduplication**: Avoids repeating the same startup across multiple sources and retains the most detailed record.
- 📊 **Filterable Dashboard**: Outputs `public/leads.json` straight into a beautiful and interactive filterable dashboard.
- ⚡ **Zero Dependencies**: Core scraper runs on Node 18+ built-in APIs (`fetch`). No `npm install` needed!
- 💸 **100% Free**: Operates using GitHub Actions and GitHub Pages on the free tier to automatically update every day.

---

## 🚀 How To Use (Local)

To run the lead generation script locally:

```bash
# 1. Fetch + qualify leads (writes public/leads.json)
npm run update

# 2. Preview the dashboard
npm run serve
# open http://localhost:8080
```

> **Note:** Requires **Node ≥ 18**. No `npm install` needed.

---

## ☁️ Free Daily Auto-Update

The repository includes a GitHub workflow (`.github/workflows/daily.yml`) which runs automatically:

1. Push this repo to GitHub.
2. Navigate to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. That's it! Every day at `06:12 UTC`, the GitHub Action will:
   - Run the web scraper.
   - Commit the refreshed `leads.json`.
   - Redeploy the dashboard to your Pages URL.

*You can also trigger it manually from the **Actions** tab by clicking **Run workflow**.*

---

## 🎛️ Using the Dashboard

- 🔍 **Search**: Look up leads by keyword (name or description).
- ⚙️ **Filter**: Narrow down by region, country, industry, minimum score, and available contact info.
- 📈 **Insights**: Each card details the Needs-SaaS score, buying signals, and links (website, social) to initiate outreach quickly.

*Pro Tip: Sort is by score first, then recency — so your best prospects are always at the top!*

---

## 🛠️ Tuning it for Your Niche

Want to change how Lead Radar finds prospects? Simply edit these small, readable files:

| Customization | File Path |
|---|---|
| **Data Sources** | `src/sources/*.js` + `src/index.js` |
| **Buying Signals / Weights** | `src/lib/score.js` |
| **Industry Buckets** | `src/lib/classify.js` |
| **Locations Detected** | `src/lib/geo.js` |
| **RSS Feeds List** | `src/sources/rssfeeds.js` |
| **Dashboard UI** | `public/index.html` |

### Optional Paid Upgrades
You can easily extend the platform behind API keys (all are **off by default**):
- **Product Hunt** (Launches)
- **UK Companies House** (Registry)
- **OpenCorporates** (Global Registry)
- **Crunchbase / Apollo** (Contacts & Funding)

---

## 📈 How Leads Are Scored

`score.js` assesses various buying signals and assigns weights to calculate a score from 0-100:
- **Positive Signals**: Just launched (`+22`), MVP (`+20`), Just funded (`+18`), Manual/spreadsheet process (`+20`), Hiring engineers (`+14`).
- **Negative Signals**: Large/established, Pure editorial/opinion, VC funds.

> *A low score isn't necessarily "bad"—it might just mean the public text was short. Use the **country/industry filters** alongside the score for the best results!*

---

## ⚠️ Limitations

- No single free source contains every business globally. Lead Radar maximizes **free** global coverage while keeping the tool easily extensible.
- Geographic and score data are naturally sparse on short-text announcements.
- Cloudflare-protected feeds (e.g. e27) block non-browser requests and are skipped.

---

## 📁 Project Layout

```text
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

---

## 📄 License

This project is licensed under the MIT License.
