// Orchestrator: run every source, enrich + dedupe, write public/leads.json.
// Designed to be run daily by GitHub Actions. Never throws on a single source
// failure — it logs, records the error in the output, and keeps going.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchHackerNews } from './sources/hackernews.js';
import { fetchRssFeeds } from './sources/rssfeeds.js';
import { fetchDevto } from './sources/devto.js';
import { fetchGithub } from './sources/github.js';
import { fetchEdgar } from './sources/edgar.js';
import { enrichAndDedupe } from './lib/enrich.js';
import { enrichLead, enrichersEnabled } from './lib/enrichers.js';

// How many top-scored leads to run through paid enrichers per run. Bounds API
// credit spend. Override with ENRICH_TOP_N.
const ENRICH_TOP_N = Number(process.env.ENRICH_TOP_N || 25);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'public', 'leads.json');

// Each entry: a label + a function returning either an array of raw items or
// a { items, errors } object. Normalized below.
const SOURCES = [
  { name: 'Hacker News', run: fetchHackerNews },
  { name: 'RSS Feeds', run: fetchRssFeeds },
  { name: 'Dev.to', run: fetchDevto },
  { name: 'GitHub', run: fetchGithub },
  { name: 'SEC EDGAR', run: fetchEdgar },
];

function normalizeResult(result) {
  if (Array.isArray(result)) return { items: result, errors: [] };
  if (result && Array.isArray(result.items)) {
    return { items: result.items, errors: result.errors || [] };
  }
  return { items: [], errors: [] };
}

async function main() {
  const startedAt = new Date();
  console.log(`[lead-radar] run started ${startedAt.toISOString()}`);

  const rawItems = [];
  const sourceStats = [];
  const allErrors = [];

  // Run sources in parallel; isolate failures per source.
  const settled = await Promise.allSettled(SOURCES.map((s) => s.run()));

  settled.forEach((res, i) => {
    const name = SOURCES[i].name;
    if (res.status === 'fulfilled') {
      const { items, errors } = normalizeResult(res.value);
      rawItems.push(...items);
      sourceStats.push({ source: name, count: items.length, ok: true });
      if (errors.length) allErrors.push(...errors.map((e) => ({ source: name, ...e })));
      console.log(`[lead-radar] ${name}: ${items.length} items` +
        (errors.length ? ` (${errors.length} sub-errors)` : ''));
    } else {
      sourceStats.push({ source: name, count: 0, ok: false, error: String(res.reason?.message || res.reason) });
      allErrors.push({ source: name, error: String(res.reason?.message || res.reason) });
      console.error(`[lead-radar] ${name} FAILED: ${res.reason}`);
    }
  });

  const leads = enrichAndDedupe(rawItems);

  // Optional paid enrichment: only the top-scored leads, only if keys are set.
  // Leads are already sorted by score (highest first) by enrichAndDedupe.
  if (enrichersEnabled()) {
    const targets = leads.slice(0, ENRICH_TOP_N);
    console.log(`[lead-radar] enriching top ${targets.length} leads via paid APIs...`);
    // Sequential to stay well under provider rate limits; the cap keeps it fast.
    let enrichedCount = 0;
    for (const lead of targets) {
      await enrichLead(lead);
      if (lead.enriched) enrichedCount++;
    }
    console.log(`[lead-radar] enriched ${enrichedCount}/${targets.length} leads`);
  } else {
    console.log('[lead-radar] no enricher keys set — skipping paid enrichment (free mode)');
  }

  // Build filter facets for the dashboard (sorted, deduped).
  const countries = [...new Set(leads.map((l) => l.country).filter(Boolean))].sort();
  const industries = [...new Set(leads.flatMap((l) => l.industries))].sort();
  const sources = [...new Set(leads.map((l) => l.source))].sort();

  const output = {
    generatedAt: startedAt.toISOString(),
    stats: {
      rawItems: rawItems.length,
      leads: leads.length,
      withCountry: leads.filter((l) => l.country).length,
      withContact: leads.filter((l) => l.contacts.website || l.contacts.emails.length).length,
      scored: leads.filter((l) => l.score > 0).length,
    },
    facets: { countries, industries, sources },
    sourceStats,
    errors: allErrors,
    leads,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(output, null, 2));

  const secs = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[lead-radar] wrote ${leads.length} leads to ${OUT_PATH} in ${secs}s`);
  console.log(`[lead-radar] countries=${countries.length} industries=${industries.length} errors=${allErrors.length}`);
}

main().catch((err) => {
  console.error('[lead-radar] fatal:', err);
  process.exit(1);
});
