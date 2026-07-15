// Startup-focused RSS/Atom feeds. Zero-key. Each feed is tagged with a hint
// (region/topic) that later helps geo + industry classification.
// If a feed URL dies, the orchestrator just logs and skips it.

import { getText } from '../lib/http.js';
import { parseFeed } from '../lib/rss.js';

// Some publishers block non-browser user-agents (403). For those, we pass a
// browser-like UA. Marked per-feed via `browser: true`.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// A broad spread of launch / funding / regional-startup feeds.
// (BetaList dropped its public feed; removed. e27 + Arctic Startup sit behind
// Cloudflare and 403 even a browser UA without a headless browser, so they're
// dropped to keep this zero-dependency. Tech in Asia works with a browser UA.)
const FEEDS = [
  { name: 'EU-Startups', url: 'https://www.eu-startups.com/feed/', hint: 'Europe' },
  { name: 'Tech.eu', url: 'https://tech.eu/feed/', hint: 'Europe' },
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/', hint: '' },
  { name: 'Sifted', url: 'https://sifted.eu/feed', hint: 'Europe' },
  { name: 'Disrupt Africa', url: 'https://disrupt-africa.com/feed/', hint: 'Africa' },
  { name: 'LatamList', url: 'https://latamlist.com/feed/', hint: 'South America' },
  { name: 'Tech in Asia', url: 'https://www.techinasia.com/feed', hint: 'Asia', browser: true },
];

export async function fetchRssFeeds() {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const xml = await getText(feed.url, feed.browser ? { headers: { 'user-agent': BROWSER_UA } } : {});
      const parsed = parseFeed(xml);
      return parsed.map((it, i) => ({
        source: feed.name,
        sourceId: `rss:${feed.name}:${it.link || it.title || i}`,
        title: it.title,
        rawTitle: it.title,
        url: it.link,
        description: it.description || '',
        date: it.date,
        // Region hint gets folded into the text geo-detection scans.
        geoHint: feed.hint,
      }));
    })
  );

  const items = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else errors.push({ feed: FEEDS[i].name, error: String(r.reason?.message || r.reason) });
  });
  return { items, errors };
}
