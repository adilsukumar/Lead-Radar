// Industry / category classification from free text via keyword buckets.
// Returns an array of matched industry labels (may be empty).

const INDUSTRIES = {
  Fintech: ['fintech', 'payments', 'banking', 'lending', 'invoic', 'accounting',
    'crypto', 'wallet', 'neobank', 'billing', 'payroll', 'trading', 'insurance', 'insurtech'],
  Healthtech: ['health', 'medical', 'clinic', 'patient', 'telemedicine', 'therapy',
    'wellness', 'fitness', 'mental health', 'biotech', 'pharma', 'dental'],
  Ecommerce: ['ecommerce', 'e-commerce', 'shopify', 'marketplace', 'retail', 'store',
    'dropship', 'checkout', 'shopping', 'd2c', 'dtc'],
  SaaS: ['saas', 'b2b', 'dashboard', 'crm', 'workflow', 'automation', 'productivity',
    'collaboration', 'project management', 'no-code', 'nocode', 'low-code'],
  AI: ['ai', 'a.i.', 'artificial intelligence', 'machine learning', 'ml', 'llm',
    'gpt', 'chatbot', 'genai', 'generative', 'agent', 'computer vision', 'nlp'],
  Edtech: ['edtech', 'education', 'learning', 'course', 'student', 'school',
    'teaching', 'tutor', 'university', 'training'],
  Marketing: ['marketing', 'seo', 'ads', 'advertis', 'social media', 'influencer',
    'email campaign', 'growth', 'analytics', 'attribution'],
  Devtools: ['developer', 'devtool', 'api', 'sdk', 'infrastructure', 'database',
    'devops', 'ci/cd', 'observability', 'open source', 'framework', 'cli'],
  Logistics: ['logistics', 'delivery', 'shipping', 'supply chain', 'fleet',
    'warehouse', 'transport', 'freight'],
  'Real Estate': ['real estate', 'proptech', 'property', 'rental', 'housing', 'mortgage'],
  Food: ['food', 'restaurant', 'grocery', 'delivery', 'kitchen', 'recipe', 'dining'],
  Travel: ['travel', 'hotel', 'booking', 'tourism', 'flight', 'trip', 'hospitality'],
  HR: ['hr', 'recruit', 'hiring', 'talent', 'onboarding', 'employee', 'workforce'],
  Legal: ['legal', 'law', 'compliance', 'contract', 'legaltech', 'gdpr'],
  Media: ['media', 'content', 'video', 'streaming', 'podcast', 'creator', 'newsletter'],
  Gaming: ['game', 'gaming', 'esports', 'unity', 'unreal'],
  Sustainability: ['sustainab', 'climate', 'carbon', 'green', 'energy', 'cleantech', 'solar'],
};

// Match a keyword as a whole word/phrase, not a substring. This prevents
// short tokens like "ai", "hr", "ml" from matching inside "email", "chair",
// "html", etc. Word chars use \b-style boundaries; we build one regex per
// keyword and cache it.
const _kwCache = new Map();
function kwRegex(kw) {
  let re = _kwCache.get(kw);
  if (!re) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Boundaries that also treat punctuation like "a.i." sanely.
    re = new RegExp(`(?:^|[^a-z0-9])${esc}(?:$|[^a-z0-9])`, 'i');
    _kwCache.set(kw, re);
  }
  return re;
}

export function classifyIndustries(text = '') {
  const hay = ` ${text.toLowerCase()} `;
  const hits = [];
  for (const [label, kws] of Object.entries(INDUSTRIES)) {
    if (kws.some((k) => kwRegex(k).test(hay))) hits.push(label);
  }
  return hits;
}
