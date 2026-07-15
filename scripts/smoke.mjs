// Live smoke test: run every source against the network and report
// counts + one sample item each. Throwaway diagnostic (task-time only).
import { fetchHackerNews } from '../src/sources/hackernews.js';
import { fetchRssFeeds } from '../src/sources/rssfeeds.js';
import { fetchDevto } from '../src/sources/devto.js';
import { fetchGithub } from '../src/sources/github.js';
import { fetchEdgar } from '../src/sources/edgar.js';

function report(name, items, errors) {
  const n = items.length;
  const flag = n === 0 ? '  <-- ZERO' : '';
  console.log(`\n=== ${name}: ${n} items${flag} ===`);
  if (errors && errors.length) {
    for (const e of errors.slice(0, 5)) console.log('   err:', JSON.stringify(e));
  }
  if (n) {
    const s = items[0];
    console.log('   sample.title:', s.title);
    console.log('   sample.url  :', s.url);
    console.log('   sample.date :', s.date);
  }
}

const runs = [
  ['Hacker News', async () => ({ items: await fetchHackerNews(), errors: [] })],
  ['RSS Feeds', fetchRssFeeds],
  ['Dev.to', fetchDevto],
  ['GitHub', fetchGithub],
  ['SEC EDGAR', fetchEdgar],
];

for (const [name, fn] of runs) {
  try {
    const out = await fn();
    const items = Array.isArray(out) ? out : out.items || [];
    const errors = Array.isArray(out) ? [] : out.errors || [];
    report(name, items, errors);
  } catch (err) {
    console.log(`\n=== ${name}: THREW ===`);
    console.log('   ', String(err?.message || err));
  }
}
