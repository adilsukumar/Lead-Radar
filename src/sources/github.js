// GitHub Search API (no key needed for low volume; token optional via env).
// We look for newly-created repos that look like a product/startup launch:
// repos created in the last few days with a homepage or product-y topics.
import { getJSON } from '../lib/http.js';

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

// Queries chosen to surface products/startups rather than random code.
const QUERIES = [
  'saas in:name,description,readme',
  'startup in:name,description',
  '"our product" in:readme',
  'topic:saas',
];

export async function fetchGithub() {
  const items = [];
  const errors = [];
  const seen = new Set();
  const since = isoDaysAgo(4);

  const token = process.env.GITHUB_TOKEN;
  const headers = token ? { authorization: `Bearer ${token}` } : {};

  for (const q of QUERIES) {
    const query = `${q} created:>=${since}`;
    const url =
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}` +
      `&sort=updated&order=desc&per_page=25`;
    try {
      const data = await getJSON(url, {
        headers: { ...headers, accept: 'application/vnd.github+json' },
      });
      for (const repo of data.items || []) {
        const id = `github:${repo.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`;
        items.push({
          source: 'GitHub',
          sourceId: id,
          title: repo.full_name,
          rawTitle: text,
          url: repo.homepage && /^https?:\/\//.test(repo.homepage) ? repo.homepage : repo.html_url,
          repoUrl: repo.html_url,
          description: repo.description || '',
          date: repo.created_at || null,
          author: repo.owner?.login,
          geoHint: '',
          tags: repo.topics || [],
        });
      }
    } catch (err) {
      errors.push({ query, error: String(err?.message || err) });
    }
  }

  return { items, errors };
}
