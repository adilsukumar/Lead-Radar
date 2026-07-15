// Enrichment pipeline: takes raw items from any source and produces fully
// qualified lead records. Handles geo, industry, needs-SaaS scoring, contact
// extraction, and cross-source dedupe.

import { detectCountry } from './geo.js';
import { classifyIndustries } from './classify.js';
import { scoreLead } from './score.js';
import { extractContacts } from './extract.js';
import { addBusinessIntel } from './bizintel.js';

// Build a stable dedupe key. Prefer the destination URL's host+path; fall back
// to a normalized title. This collapses the same launch appearing on multiple
// sources (e.g. a Show HN that's also on Dev.to).
function dedupeKey(item) {
  if (item.url) {
    try {
      const u = new URL(item.url);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      const path = u.pathname.replace(/\/+$/, '').toLowerCase();
      // For platform hosts the path is the identity; for company sites the
      // host alone identifies the company.
      const platformHosts = ['github.com', 'dev.to', 'news.ycombinator.com', 'sec.gov'];
      if (platformHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
        return `${host}${path}`;
      }
      return host;
    } catch {
      /* fall through to title */
    }
  }
  return `t:${(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
}

// Turn one raw source item into an enriched lead.
export function enrichItem(item) {
  const text = [item.rawTitle || item.title, item.description, (item.tags || []).join(' '), item.geoHint]
    .filter(Boolean)
    .join(' . ');

  const geo = detectCountry(text, item.url) || { country: null, region: null, code: null };
  const industries = classifyIndustries(text);
  const { score, signals, tier, services } = scoreLead({
    title: item.title || '',
    description: item.description || '',
    extraText: (item.tags || []).join(' '),
  });
  // Extract contacts from description/raw HTML if present.
  const contacts = extractContacts(
    [item.description, item.raw, item.url].filter(Boolean).join(' ')
  );
  // If the source gave us an explicit company URL, prefer it as the website.
  if (!contacts.website && item.url) {
    try {
      const host = new URL(item.url).hostname.replace(/^www\./, '');
      const platform = ['github.com', 'dev.to', 'news.ycombinator.com', 'sec.gov'].some(
        (h) => host === h || host.endsWith(`.${h}`)
      );
      if (!platform) contacts.website = item.url;
    } catch { /* ignore */ }
  }

  const lead = {
    id: item.sourceId,
    source: item.source,
    title: item.title,
    url: item.url,
    discussionUrl: item.discussionUrl || item.repoUrl || null,
    description: (item.description || '').slice(0, 400),
    date: item.date,
    author: item.author || null,
    country: geo.country,
    countryCode: geo.code,
    region: geo.region,
    industries,
    score,
    signals,
    tier,
    services,
    contacts,
  };

  // Attach businessName, summary, pitchAngle, and free lookup links.
  addBusinessIntel(lead, item);
  return lead;
}

/**
 * Enrich + dedupe a flat array of raw items. When duplicates collide, keep the
 * highest-scoring record and remember the extra sources it appeared on.
 */
export function enrichAndDedupe(rawItems) {
  const byKey = new Map();

  for (const raw of rawItems) {
    let lead;
    try {
      lead = enrichItem(raw);
    } catch {
      continue; // never let one bad item kill the run
    }
    const key = dedupeKey(raw);
    const existing = byKey.get(key);
    if (!existing) {
      lead.alsoSeenOn = [];
      byKey.set(key, lead);
    } else {
      // Merge: keep higher score, record the other source.
      if (!existing.alsoSeenOn.includes(lead.source) && lead.source !== existing.source) {
        existing.alsoSeenOn.push(lead.source);
      }
      if (lead.score > existing.score) {
        lead.alsoSeenOn = existing.alsoSeenOn;
        if (!lead.alsoSeenOn.includes(existing.source)) lead.alsoSeenOn.push(existing.source);
        byKey.set(key, lead);
      }
    }
  }

  const leads = [...byKey.values()];
  // Sort by score desc, then most recent.
  leads.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });
  return leads;
}
