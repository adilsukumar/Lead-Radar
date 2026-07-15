// Country detection from free text. No external API — a keyword/gazetteer map
// covering countries, common demonyms, and major startup-hub cities.
// Returns { country, region, code } or null.

const REGIONS = {
  US: 'North America', CA: 'North America', MX: 'North America',
  GB: 'Europe', IE: 'Europe', FR: 'Europe', DE: 'Europe', ES: 'Europe',
  PT: 'Europe', IT: 'Europe', NL: 'Europe', BE: 'Europe', CH: 'Europe',
  AT: 'Europe', SE: 'Europe', NO: 'Europe', DK: 'Europe', FI: 'Europe',
  PL: 'Europe', CZ: 'Europe', RO: 'Europe', GR: 'Europe', UA: 'Europe',
  EE: 'Europe', LT: 'Europe', LV: 'Europe',
  IN: 'Asia', SG: 'Asia', JP: 'Asia', CN: 'Asia', KR: 'Asia', HK: 'Asia',
  ID: 'Asia', MY: 'Asia', TH: 'Asia', VN: 'Asia', PH: 'Asia', PK: 'Asia',
  AE: 'Middle East', IL: 'Middle East', SA: 'Middle East', TR: 'Middle East',
  AU: 'Oceania', NZ: 'Oceania',
  BR: 'South America', AR: 'South America', CL: 'South America', CO: 'South America',
  NG: 'Africa', ZA: 'Africa', KE: 'Africa', EG: 'Africa', GH: 'Africa',
};

const NAMES = {
  US: 'United States', CA: 'Canada', MX: 'Mexico', GB: 'United Kingdom',
  IE: 'Ireland', FR: 'France', DE: 'Germany', ES: 'Spain', PT: 'Portugal',
  IT: 'Italy', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland',
  AT: 'Austria', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
  PL: 'Poland', CZ: 'Czechia', RO: 'Romania', GR: 'Greece', UA: 'Ukraine',
  EE: 'Estonia', LT: 'Lithuania', LV: 'Latvia', IN: 'India', SG: 'Singapore',
  JP: 'Japan', CN: 'China', KR: 'South Korea', HK: 'Hong Kong',
  ID: 'Indonesia', MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam',
  PH: 'Philippines', PK: 'Pakistan', AE: 'United Arab Emirates',
  IL: 'Israel', SA: 'Saudi Arabia', TR: 'Turkey', AU: 'Australia',
  NZ: 'New Zealand', BR: 'Brazil', AR: 'Argentina', CL: 'Chile',
  CO: 'Colombia', NG: 'Nigeria', ZA: 'South Africa', KE: 'Kenya',
  EG: 'Egypt', GH: 'Ghana',
};

// Keyword -> ISO code. Lowercase. Includes demonyms + hub cities.
const KEYWORDS = {
  'united states': 'US', 'u.s.': 'US', usa: 'US', america: 'US',
  american: 'US', 'san francisco': 'US', 'silicon valley': 'US',
  'new york': 'US', 'los angeles': 'US', boston: 'US', austin: 'US',
  seattle: 'US', 'bay area': 'US',
  canada: 'CA', canadian: 'CA', toronto: 'CA', vancouver: 'CA', montreal: 'CA',
  mexico: 'MX', mexican: 'MX',
  'united kingdom': 'GB', 'u.k.': 'GB', uk: 'GB', britain: 'GB',
  british: 'GB', england: 'GB', london: 'GB', manchester: 'GB', scotland: 'GB',
  ireland: 'IE', irish: 'IE', dublin: 'IE',
  france: 'FR', french: 'FR', paris: 'FR',
  germany: 'DE', german: 'DE', berlin: 'DE', munich: 'DE',
  spain: 'ES', spanish: 'ES', madrid: 'ES', barcelona: 'ES',
  portugal: 'PT', lisbon: 'PT', porto: 'PT',
  italy: 'IT', italian: 'IT', milan: 'IT', rome: 'IT',
  netherlands: 'NL', dutch: 'NL', amsterdam: 'NL',
  belgium: 'BE', brussels: 'BE',
  switzerland: 'CH', swiss: 'CH', zurich: 'CH', geneva: 'CH',
  austria: 'AT', vienna: 'AT',
  sweden: 'SE', swedish: 'SE', stockholm: 'SE',
  norway: 'NO', oslo: 'NO', denmark: 'DK', danish: 'DK', copenhagen: 'DK',
  finland: 'FI', helsinki: 'FI',
  poland: 'PL', warsaw: 'PL', czechia: 'CZ', prague: 'CZ',
  romania: 'RO', bucharest: 'RO', greece: 'GR', athens: 'GR',
  ukraine: 'UA', kyiv: 'UA', kiev: 'UA',
  estonia: 'EE', tallinn: 'EE', lithuania: 'LT', vilnius: 'LT',
  latvia: 'LV', riga: 'LV',
  india: 'IN', indian: 'IN', bangalore: 'IN', bengaluru: 'IN', mumbai: 'IN',
  delhi: 'IN', 'new delhi': 'IN', hyderabad: 'IN', pune: 'IN',
  singapore: 'SG', japan: 'JP', japanese: 'JP', tokyo: 'JP',
  china: 'CN', chinese: 'CN', beijing: 'CN', shanghai: 'CN', shenzhen: 'CN',
  'south korea': 'KR', korea: 'KR', korean: 'KR', seoul: 'KR',
  'hong kong': 'HK', indonesia: 'ID', jakarta: 'ID',
  malaysia: 'MY', 'kuala lumpur': 'MY', thailand: 'TH', bangkok: 'TH',
  vietnam: 'VN', hanoi: 'VN', philippines: 'PH', manila: 'PH',
  pakistan: 'PK', karachi: 'PK', lahore: 'PK',
  'united arab emirates': 'AE', uae: 'AE', dubai: 'AE', 'abu dhabi': 'AE',
  israel: 'IL', israeli: 'IL', 'tel aviv': 'IL',
  'saudi arabia': 'SA', riyadh: 'SA', turkey: 'TR', istanbul: 'TR',
  australia: 'AU', australian: 'AU', sydney: 'AU', melbourne: 'AU',
  'new zealand': 'NZ', auckland: 'NZ',
  brazil: 'BR', brazilian: 'BR', 'sao paulo': 'BR', 'são paulo': 'BR',
  argentina: 'AR', 'buenos aires': 'AR', chile: 'CL', santiago: 'CL',
  colombia: 'CO', bogota: 'CO', nigeria: 'NG', nigerian: 'NG', lagos: 'NG',
  'south africa': 'ZA', johannesburg: 'ZA', 'cape town': 'ZA',
  kenya: 'KE', nairobi: 'KE', egypt: 'EG', cairo: 'EG', ghana: 'GH', accra: 'GH',
};

// TLD hints from a URL host, e.g. .de -> Germany.
const TLD = {
  '.uk': 'GB', '.de': 'DE', '.fr': 'FR', '.es': 'ES', '.it': 'IT',
  '.nl': 'NL', '.se': 'SE', '.no': 'NO', '.dk': 'DK', '.fi': 'FI',
  '.pl': 'PL', '.in': 'IN', '.sg': 'SG', '.jp': 'JP', '.cn': 'CN',
  '.kr': 'KR', '.au': 'AU', '.nz': 'NZ', '.br': 'BR', '.ca': 'CA',
  '.ie': 'IE', '.ch': 'CH', '.at': 'AT', '.pt': 'PT', '.ae': 'AE',
  '.il': 'IL', '.za': 'ZA', '.ng': 'NG', '.ke': 'KE',
};

export function detectCountry(text = '', url = '') {
  const hay = ` ${text.toLowerCase()} `;
  // Longest keyword first so "new york" wins over nothing, "united states" over "states".
  const keys = Object.keys(KEYWORDS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    // word-ish boundary match
    const re = new RegExp(`[^a-z]${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`, 'i');
    if (re.test(hay)) return build(KEYWORDS[k]);
  }
  if (url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      for (const [tld, code] of Object.entries(TLD)) {
        if (host.endsWith(tld)) return build(code);
      }
    } catch {
      /* ignore bad URL */
    }
  }
  return null;
}

function build(code) {
  return { code, country: NAMES[code] || code, region: REGIONS[code] || 'Other' };
}
