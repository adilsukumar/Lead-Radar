// SEC EDGAR latest filings (US registry, no key required).
// Uses the real, cross-company "getcurrent" endpoint, which returns an Atom feed
// of the most recent filings for a given form type. We target signal-heavy forms:
//   Form D = exempt securities offering (often a young company that just raised)
//   S-1    = IPO registration statement
// EDGAR requires a descriptive User-Agent that includes a contact address.
import { getText } from '../lib/http.js';
import { parseFeed } from '../lib/rss.js';

const EDGAR_UA =
  process.env.EDGAR_UA || 'lead-radar research (contact: set-EDGAR_UA-env@example.com)';

const FORMS = ['D', 'S-1'];

// Atom entry titles look like: "D - ACME ROBOTICS INC (0001234567) (Filer)".
// Pull out the clean company name.
function companyFromTitle(title = '') {
  const m = title.match(/^[A-Z0-9/-]+\s+-\s+(.+?)\s+\(\d+\)/i);
  return m ? m[1].trim() : title.replace(/\s*\(\d+\).*/, '').trim();
}

export async function fetchEdgar() {
  const items = [];
  const errors = [];
  const seen = new Set();

  for (const form of FORMS) {
    const url =
      `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent` +
      `&type=${encodeURIComponent(form)}&company=&dateb=&owner=include&count=40&output=atom`;
    try {
      const xml = await getText(url, { headers: { 'user-agent': EDGAR_UA } });
      const entries = parseFeed(xml);
      for (const e of entries) {
        if (!e.link) continue;
        const id = `edgar:${e.link}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const company = companyFromTitle(e.title);
        items.push({
          source: 'SEC EDGAR',
          sourceId: id,
          title: company,
          rawTitle: `${company} ${form === 'D' ? 'new securities offering' : 'IPO registration'}`,
          url: e.link,
          description:
            form === 'D'
              ? 'Filed Form D (exempt offering) — often a recently funded US company.'
              : 'Filed S-1 (IPO registration).',
          date: e.date,
          author: null,
          geoHint: 'United States',
          tags: [`form-${form}`],
        });
      }
    } catch (err) {
      errors.push({ form, error: String(err?.message || err) });
    }
  }

  return { items, errors };
}
