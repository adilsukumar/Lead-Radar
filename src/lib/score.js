// "Needs-SaaS" scoring. Scans lead text for buying signals and returns
// { score (0-100), signals, tier, services }. Higher score = more likely to
// need custom software and more likely to be an early, reachable team.

// Matching: multi-word phrases match as substrings; single short tokens match
// on word boundaries so "cto" doesn't fire inside "director" and "ai" doesn't
// fire inside "email". A keyword is treated as a "token" when it is a single
// word of <= 4 chars (the ambiguous ones); everything else is a phrase.
function makeMatcher(kws) {
  const tokens = [];
  const phrases = [];
  for (const k of kws) {
    if (!k.includes(' ') && k.length <= 4) tokens.push(k);
    else phrases.push(k);
  }
  const tokenRe =
    tokens.length > 0
      ? new RegExp(`\\b(${tokens.map(escapeRe).join('|')})\\b`, 'i')
      : null;
  return (hay) => {
    if (tokenRe && tokenRe.test(hay)) return true;
    return phrases.some((p) => hay.includes(p));
  };
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Each signal: keywords + weight + human label + optional service hints.
// `services` = what you could pitch when this signal fires.
const SIGNALS = [
  { w: 24, label: 'Just launched', services: ['Landing page', 'Analytics setup', 'Onboarding flow'],
    kws: ['just launched', 'we launched', 'launching', 'show hn', 'launch hn', 'introducing', 'went live', 'now live', 'just shipped', 'just released', 'today we', 'excited to launch'] },
  { w: 22, label: 'MVP / early stage', services: ['MVP build', 'Full product build', 'Technical co-founder'],
    kws: ['mvp', 'prototype', 'early stage', 'early-stage', 'pre-seed', 'preseed', 'building in public', 'buildinpublic', 'v0', 'alpha', 'private beta', 'closed beta', 'from scratch', 'idea stage'] },
  { w: 20, label: 'Just funded', services: ['Scale infrastructure', 'Hire-augmentation', 'Full product build'],
    kws: ['raised', 'seed round', 'series a', 'just funded', 'backed by', 'closes round', 'secures funding', 'secures investment', 'grant', '$', '€', '£'] },
  { w: 16, label: 'Beta / waitlist', services: ['Waitlist app', 'Beta onboarding', 'Feedback tooling'],
    kws: ['waitlist', 'early access', 'sign up for access', 'request access', 'join the beta', 'private beta'] },
  { w: 22, label: 'Manual / spreadsheet pain', services: ['Internal tool', 'Workflow automation', 'Custom dashboard'],
    kws: ['spreadsheet', 'excel', 'manual process', 'by hand', 'google sheets', 'manually', 'no system', 'paperwork', 'copy paste', 'copy-paste', 'data entry'] },
  { w: 20, label: 'Needs a platform/app', services: ['Full product build', 'Web app', 'Mobile app'],
    kws: ['looking for a developer', 'need a developer', 'building an app', 'need an app', 'need a website', 'need a platform', 'no app yet', 'no website yet', 'looking to build', 'want to build', 'seeking technical', 'seeking a cto', 'help me build'] },
  { w: 14, label: 'Hiring engineers', services: ['Fractional dev team', 'Staff augmentation', 'MVP build'],
    kws: ['hiring', 'join our team', 'looking for engineers', 'first engineer', 'founding engineer', 'cto', 'technical co-founder', 'technical cofounder', 'looking for developers'] },
  { w: 14, label: 'Scaling / growth pains', services: ['Performance / infra', 'Automation', 'Refactor'],
    kws: ['scaling', 'growing fast', 'outgrown', 'bottleneck', 'automate', 'streamline', 'efficiency', 'overwhelmed', 'high demand'] },
  { w: 10, label: 'Small / solo team', services: ['MVP build', 'Fractional dev team'],
    kws: ['solo founder', 'indie', 'bootstrapp', 'one-person', 'small team', 'side project', 'first customer', 'first users', 'two founders'] },
  { w: 8, label: 'Actively iterating', services: ['Feature build', 'Product retainer'],
    kws: ['feedback', 'roadmap', 'next feature', 'what should we build', 'looking for feedback', 'would love your thoughts', 'iterating'] },
  { w: 8, label: 'No-code / hitting limits', services: ['Migrate off no-code', 'Custom build'],
    kws: ['no-code', 'nocode', 'bubble.io', 'airtable', 'zapier', 'outgrowing', 'hitting limits'] },
];

// Negative signals: big / established / not a fit.
const NEGATIVE = [
  { w: -22, label: 'Likely large/established', kws: ['fortune 500', 'enterprise leader', 'publicly traded', 'nasdaq', 'nyse', 'ipo', 'acquired by', 'acquisition of', 'billion', 'market leader', 'thousands of employees', 'multinational'] },
  { w: -12, label: 'Not a company', kws: ['tutorial', 'how to', 'guide to', 'opinion', 'ask hn', 'thoughts on', 'lessons learned', 'my journey', 'a beginner'] },
  // Aggregator / listing / meta posts (e.g. "Top Show HN Launches by Upvotes").
  { w: -20, label: 'Listing / meta post', kws: ['top show hn', 'show hn launches', 'by upvotes', 'most upvoted', 'this week in', 'this month in', 'launches of', 'roundup of', 'list of', 'ranked by', 'leaderboard'] },
  { w: -22, label: 'Investor / fund (not a client)', kws: ['launches fund', 'launch fund', 'fund i', 'fund ii', 'fund iii', 'new fund', 'venture partners', 'capital partners', 'vc firm', 'to back', 'to invest in', 'invests in', 'portfolio company', 'general partner', 'limited partner', 'raises fund', 'closes fund', 'accelerator', 'incubator'] },
  { w: -14, label: 'Podcast / editorial', kws: ['podcast', 'episode', 'interview with', 'shares the', 'shares his', 'shares her', 'op-ed', 'analysis:', 'explained', 'roundup', 'weekly digest', 'newsletter', 'top 10', 'best of'] },
  // First-person narrative blog posts (esp. Dev.to) masquerade as launches.
  // "i woke up and shipped" is a story, not a company you can sell to.
  { w: -16, label: 'Personal narrative post', kws: ['i woke up', 'i built', 'i made', 'i shipped', 'i spent', 'i learned', 'i tried', 'my experience', 'here is how i', "here's how i", 'why i built', 'how i built', 'day in the life', 'what i learned'] },
];

export function scoreLead({ title = '', description = '', extraText = '' } = {}) {
  // Title signals count double — the headline is the strongest intent signal.
  const titleHay = ` ${title.toLowerCase()} `;
  const fullHay = ` ${[title, description, extraText].join(' ').toLowerCase()} `;

  let score = 0;
  const signals = [];
  const services = new Set();

  for (const s of SIGNALS) {
    const match = makeMatcher(s.kws);
    const inTitle = match(titleHay);
    const inBody = match(fullHay);
    if (inTitle || inBody) {
      // Title hit gets a 1.5x bump.
      score += Math.round(s.w * (inTitle ? 1.5 : 1));
      signals.push(s.label);
      (s.services || []).forEach((svc) => services.add(svc));
    }
  }
  for (const n of NEGATIVE) {
    const match = makeMatcher(n.kws);
    if (match(fullHay)) {
      score += n.w;
      signals.push(n.label);
    }
  }

  score = Math.max(0, Math.min(100, score));

  // Fit tier for quick triage / leaderboards.
  let tier = 'cold';
  if (score >= 50) tier = 'hot';
  else if (score >= 25) tier = 'warm';

  return { score, signals, tier, services: [...services].slice(0, 4) };
}
