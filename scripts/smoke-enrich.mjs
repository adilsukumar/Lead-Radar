// Pull real items from all sources, enrich + dedupe, and print stats so we can
// eyeball that scoring / geo / industry / dedupe actually work end to end.
import { fetchHackerNews } from '../src/sources/hackernews.js';
import { fetchRssFeeds } from '../src/sources/rssfeeds.js';
import { fetchDevto } from '../src/sources/devto.js';
import { fetchGithub } from '../src/sources/github.js';
import { fetchEdgar } from '../src/sources/edgar.js';
import { enrichAndDedupe } from '../src/lib/enrich.js';

const raw = [];
const settle = async (name, p, arr) => {
  try {
    const r = await p;
    const items = Array.isArray(r) ? r : r.items;
    arr.push(...items);
    console.log(`${name}: ${items.length}`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.message}`);
  }
};

await Promise.all([
  settle('HN', fetchHackerNews(), raw),
  settle('RSS', fetchRssFeeds(), raw),
  settle('Devto', fetchDevto(), raw),
  settle('GitHub', fetchGithub(), raw),
  settle('EDGAR', fetchEdgar(), raw),
]);

const leads = enrichAndDedupe(raw);
console.log(`\nRaw: ${raw.length}  ->  Deduped leads: ${leads.length}`);

const withCountry = leads.filter((l) => l.country).length;
const withScore = leads.filter((l) => l.score > 0).length;
const withIndustry = leads.filter((l) => l.industries.length).length;
const withContact = leads.filter((l) => l.contacts.website || l.contacts.emails.length).length;
console.log(`With country: ${withCountry}  | score>0: ${withScore}  | industry: ${withIndustry}  | contact: ${withContact}`);

console.log('\n--- Top 8 leads ---');
for (const l of leads.slice(0, 8)) {
  console.log(`[${l.score}] ${l.title?.slice(0, 60)}`);
  console.log(`     ${l.source} | ${l.country || '—'} | ${l.industries.join(', ') || '—'}`);
  console.log(`     signals: ${l.signals.join(', ') || '—'}`);
}

// Distinct countries + sources for a coverage sanity check.
const countries = new Set(leads.map((l) => l.country).filter(Boolean));
console.log(`\nDistinct countries: ${countries.size} -> ${[...countries].slice(0, 15).join(', ')}`);
