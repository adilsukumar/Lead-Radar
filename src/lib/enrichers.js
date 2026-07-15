// Optional paid enrichers. Each provider is gated behind its own env var and
// is a NO-OP when the key is absent — so the $0 default path keeps working with
// zero config. Enrichment runs only on the top-scored leads (see index.js) so
// paid API credits are spent on the leads most worth reaching.
//
// Providers:
//   HUNTER_API_KEY      -> Hunter.io domain-search (finds emails for a website)
//   APOLLO_API_KEY      -> Apollo.io org enrichment (company size, phone, industry)
//   CRUNCHBASE_API_KEY  -> Crunchbase org lookup (funding, founded, location)
//
// Each provider function takes a lead and returns a PARTIAL patch object (or
// null). Patches are shallow-merged onto lead.enriched so the source of each
// field is traceable and nothing silently overwrites the free-tier data.

import { getJSON, fetchWithRetry } from './http.js';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// --- Hunter.io: find contact emails for a company domain -------------------
async function hunter(lead) {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return null;
  const domain = hostOf(lead.contacts?.website);
  if (!domain) return null;

  const url =
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}` +
    `&limit=5&api_key=${encodeURIComponent(key)}`;
  const data = await getJSON(url);
  const emails = (data?.data?.emails || [])
    .map((e) => ({
      email: e.value,
      type: e.type,
      confidence: e.confidence,
      name: [e.first_name, e.last_name].filter(Boolean).join(' ') || null,
      position: e.position || null,
    }))
    .filter((e) => e.email);
  if (!emails.length && !data?.data?.organization) return null;

  return {
    provider: 'hunter',
    organization: data?.data?.organization || null,
    emails,
  };
}

// --- Apollo.io: organization enrichment (phone, size, industry) ------------
async function apollo(lead) {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return null;
  const domain = hostOf(lead.contacts?.website);
  if (!domain) return null;

  const res = await fetchWithRetry(
    `https://api.apollo.io/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
    { headers: { 'x-api-key': key, accept: 'application/json' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const org = data?.organization;
  if (!org) return null;

  return {
    provider: 'apollo',
    phone: org.phone || org.sanitized_phone || null,
    employees: org.estimated_num_employees || null,
    industry: org.industry || null,
    foundedYear: org.founded_year || null,
    city: org.city || null,
    country: org.country || null,
    linkedin: org.linkedin_url || null,
  };
}

// --- Crunchbase: funding + firmographics -----------------------------------
async function crunchbase(lead) {
  const key = process.env.CRUNCHBASE_API_KEY;
  if (!key) return null;
  const name = lead.businessName || lead.title;
  if (!name) return null;

  // Crunchbase v4 autocomplete -> entity lookup. Keep to one call (autocomplete)
  // which already returns the identifier + short description.
  const url =
    `https://api.crunchbase.com/api/v4/autocompletes?query=${encodeURIComponent(name)}` +
    `&collection_ids=organizations&limit=1&user_key=${encodeURIComponent(key)}`;
  const data = await getJSON(url);
  const entity = data?.entities?.[0];
  if (!entity) return null;

  return {
    provider: 'crunchbase',
    cbPermalink: entity.identifier?.permalink
      ? `https://www.crunchbase.com/organization/${entity.identifier.permalink}`
      : null,
    shortDescription: entity.short_description || null,
  };
}

const PROVIDERS = [hunter, apollo, crunchbase];

/** True if any paid enricher key is configured. */
export function enrichersEnabled() {
  return Boolean(
    process.env.HUNTER_API_KEY ||
      process.env.APOLLO_API_KEY ||
      process.env.CRUNCHBASE_API_KEY
  );
}

/**
 * Run all configured enrichers for one lead, merging their patches onto
 * lead.enriched. Never throws — a provider failure is recorded and skipped so
 * one bad API response can't sink the run.
 */
export async function enrichLead(lead) {
  if (!enrichersEnabled()) return lead;

  const patches = {};
  for (const provider of PROVIDERS) {
    try {
      const patch = await provider(lead);
      if (patch) patches[patch.provider] = patch;
    } catch (err) {
      patches[provider.name] = { error: String(err?.message || err) };
    }
  }

  if (Object.keys(patches).length) {
    lead.enriched = patches;
    // Promote the most useful fields to the top level so the dashboard and
    // templates can use them without knowing which provider supplied them.
    const phone = patches.apollo?.phone || null;
    const bestEmail =
      patches.hunter?.emails?.find((e) => e.type === 'personal')?.email ||
      patches.hunter?.emails?.[0]?.email ||
      null;
    if (phone) lead.contacts.phone = phone;
    if (bestEmail && !lead.contacts.emails.includes(bestEmail)) {
      lead.contacts.emails.unshift(bestEmail);
    }
    if (patches.apollo?.city || patches.apollo?.country) {
      lead.enrichedLocation = [patches.apollo.city, patches.apollo.country]
        .filter(Boolean)
        .join(', ');
    }
  }
  return lead;
}
