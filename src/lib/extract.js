// Contact / link extraction from free text or HTML fragments.
// Pulls emails, external URLs, and social handles so you can reach the lead.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g;

// Hosts we don't consider a "company site" (the source platforms themselves).
const SKIP_HOSTS = [
  'news.ycombinator.com', 'ycombinator.com', 'dev.to', 'producthunt.com',
  'betalist.com', 'github.com', 'githubusercontent.com', 'twitter.com',
  'x.com', 'linkedin.com', 'facebook.com', 'reddit.com', 'medium.com',
  'youtube.com', 'youtu.be', 'sec.gov', 'archive.org', 'gravatar.com',
];

function cleanUrl(u) {
  return u.replace(/[.,);]+$/, '');
}

export function extractContacts(text = '') {
  const emails = [...new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))]
    .filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg'));

  const rawUrls = [...new Set((text.match(URL_RE) || []).map(cleanUrl))];
  const socials = [];
  const websites = [];

  for (const u of rawUrls) {
    let host = '';
    try {
      host = new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      continue;
    }
    if (/twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com/.test(host)) {
      socials.push(u);
    } else if (!SKIP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      websites.push(u);
    }
  }

  return {
    emails,
    website: websites[0] || null,
    otherWebsites: websites.slice(1, 4),
    socials: [...new Set(socials)].slice(0, 4),
  };
}
