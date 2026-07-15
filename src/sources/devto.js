// Dev.to public API (no key). We pull recent posts under tags where founders
// announce/launch products, then treat them as potential signals.
import { getJSON } from '../lib/http.js';

const TAGS = ['startup', 'saas', 'indiehackers', 'launch', 'buildinpublic'];

export async function fetchDevto() {
  const items = [];
  const errors = [];
  const seen = new Set();

  const batches = await Promise.allSettled(
    TAGS.map((tag) =>
      getJSON(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=30&top=1`)
    )
  );

  batches.forEach((r, i) => {
    if (r.status !== 'fulfilled') {
      errors.push({ tag: TAGS[i], error: String(r.reason?.message || r.reason) });
      return;
    }
    for (const a of r.value || []) {
      const id = `devto:${a.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        source: 'Dev.to',
        sourceId: id,
        title: a.title,
        rawTitle: a.title,
        url: a.url,
        description: a.description || '',
        date: a.published_at || null,
        author: a.user?.name,
        geoHint: '',
        tags: a.tag_list || [],
      });
    }
  });

  return { items, errors };
}
