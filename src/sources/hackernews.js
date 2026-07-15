// Hacker News — Show HN + Launch HN posts via the free Algolia API (no key).
// These are founders literally announcing a just-launched product: prime leads.

import { getJSON } from '../lib/http.js';

const ENDPOINT = 'https://hn.algolia.com/api/v1/search_by_date';

// Posts from the last N hours so the daily run only pulls fresh launches.
const WINDOW_HOURS = 30;

async function query(tag, extraQuery = '') {
  const since = Math.floor(Date.now() / 1000) - WINDOW_HOURS * 3600;
  const url =
    `${ENDPOINT}?tags=${encodeURIComponent(tag)}` +
    (extraQuery ? `&query=${encodeURIComponent(extraQuery)}` : '') +
    `&numericFilters=created_at_i>${since}&hitsPerPage=100`;
  const data = await getJSON(url);
  return Array.isArray(data?.hits) ? data.hits : [];
}

export async function fetchHackerNews() {
  // "show_hn" tag captures Show HN. Launch HN posts are stories with
  // "Launch HN" in the title, so we also do a title query.
  const [showHn, launchHn] = await Promise.all([
    query('show_hn'),
    query('story', 'Launch HN'),
  ]);

  const seen = new Set();
  const items = [];
  for (const h of [...showHn, ...launchHn]) {
    const id = String(h.objectID);
    if (seen.has(id)) continue;
    seen.add(id);
    const title = h.title || h.story_title || '';
    if (!title) continue;
    const hnUrl = `https://news.ycombinator.com/item?id=${id}`;
    items.push({
      source: 'Hacker News',
      sourceId: `hn:${id}`,
      title: title.replace(/^\s*(Show HN|Launch HN):\s*/i, '').trim(),
      rawTitle: title,
      url: h.url || hnUrl,
      discussionUrl: hnUrl,
      description: (h.story_text || h.comment_text || '').slice(0, 2000),
      date: h.created_at || null,
      author: h.author || null,
      points: h.points ?? null,
    });
  }
  return items;
}
