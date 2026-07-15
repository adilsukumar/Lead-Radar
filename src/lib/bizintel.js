// Business intelligence derived from free data only. Produces a cleaned company
// name, a short "what they do" summary, a "what they might want" pitch angle,
// and free lookup links (Google Maps, LinkedIn, web search) so you can research
// and reach each lead without any paid API. Paid enrichers (see enrichers/)
// layer phone/address/verified-email on top when keys are present.

// Strip trailing marketing fluff / funding clauses from a headline to get a
// name-ish label. Best-effort — free titles are noisy.
function deriveBusinessName(item) {
  let t = (item.title || '').trim();

  // GitHub gives "owner/repo" — take the repo half as the product name.
  if (item.source === 'GitHub' && t.includes('/')) {
    t = t.split('/').pop();
  }
  // Strip HN/BetaList launch prefixes so "Show HN: Foo" -> "Foo" (before the
  // ":" separator rule below, which would otherwise keep "Show HN").
  t = t.replace(/^\s*(show hn|launch hn|ask hn|tell hn)\s*[:\-–—]\s*/i, '').trim();
  // Strip leading verbs like "Building X ..." / "Introducing X ...".
  t = t.replace(/^(building|introducing|meet|announcing)\s+/i, '').trim();
  // Strip a leading geographic prefix like "Paris-based" / "London based".
  t = t.replace(/^[A-Z][a-zA-Z.-]+[-\s]based\s+/i, '').trim();
  // Drop trailing hashtags (#buildinpublic etc.) and collapse whitespace.
  t = t.replace(/#\w+/g, ' ').replace(/\s+/g, ' ').trim();
  // Common pattern: "Name – tagline" / "Name: tagline" / "Name — tagline".
  const sep = t.match(/^(.{2,60}?)\s*[–—:|-]\s+/);
  if (sep) t = sep[1].trim();

  // "Name raises €X" / "Name secures" / "Name launches" -> take the prefix.
  const verb = t.match(/^(.{2,60}?)\s+(raises|secures|launches|closes|lands|nabs|bags|announces|unveils|emerges)\b/i);
  if (verb) t = verb[1].trim();

  // Drop parenthetical YC batch tags etc. "(YC S26)".
  t = t.replace(/\s*\((?:YC\s*[A-Z]?\d+|Series\s*[A-Z]|[^)]{0,20}funding[^)]*)\)\s*/gi, ' ').trim();

  // If the "name" is really a sentence (a description used as a title), keep
  // just the leading clause / first few words so cards stay readable.
  if (t.length > 45) {
    const clause = t.split(/[,.:;]|\s[–—-]\s/)[0].trim();
    t = clause.length >= 3 ? clause : t;
    if (t.length > 45) t = t.split(/\s+/).slice(0, 6).join(' ');
  }

  return t || item.title || 'Unknown';
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// A short summary: prefer the description's first sentence, fall back to title.
function deriveSummary(item) {
  const d = (item.description || '').replace(/\s+/g, ' ').trim();
  if (d) {
    const firstSentence = d.split(/(?<=[.!?])\s/)[0];
    return (firstSentence.length > 20 ? firstSentence : d).slice(0, 220);
  }
  return (item.title || '').slice(0, 220);
}

// Free research/outreach links. These never need an API key.
function buildLinks(name, website) {
  const q = encodeURIComponent(name);
  const links = {
    googleMaps: `https://www.google.com/maps/search/${q}`,
    googleSearch: `https://www.google.com/search?q=${q}`,
    linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${q}`,
    crunchbase: `https://www.crunchbase.com/textsearch?q=${q}`,
  };
  if (website) {
    const host = hostFromUrl(website);
    if (host) {
      // A domain-scoped search often surfaces the company's contact page.
      links.contactPage = `https://www.google.com/search?q=${encodeURIComponent(`${host} contact email`)}`;
    }
  }
  return links;
}

/**
 * Attach business-intel fields to an already-enriched lead in place.
 * `lead` must already have: title, url, description, industries, services.
 */
export function addBusinessIntel(lead, rawItem) {
  const name = deriveBusinessName(rawItem);
  const website = lead.contacts?.website || null;

  lead.businessName = name;
  lead.summary = deriveSummary(rawItem);
  lead.links = buildLinks(name, website);

  // "What they might want" — a human pitch angle built from services + industry.
  const svc = (lead.services || []).slice(0, 2);
  const ind = (lead.industries || [])[0];
  if (svc.length) {
    lead.pitchAngle = `${svc.join(' + ')}${ind ? ` for a ${ind} business` : ''}`;
  } else if (ind) {
    lead.pitchAngle = `Custom software for a ${ind} business`;
  } else {
    lead.pitchAngle = 'Custom software / MVP build';
  }

  return lead;
}
