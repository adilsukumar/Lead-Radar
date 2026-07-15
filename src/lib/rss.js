// Tiny dependency-free RSS/Atom parser. Not a full XML parser — it is a
// pragmatic regex-based extractor that handles the feeds we actually consume.
// Good enough for titles, links, descriptions, dates across RSS 2.0 + Atom.

function decodeEntities(str = '') {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function stripTags(html = '') {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}

// Atom <link href="..."/> or RSS <link>...</link>
function pickLink(block) {
  const rss = block.match(/<link>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim()) return decodeEntities(rss[1]);
  const atom =
    block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
    block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return atom ? decodeEntities(atom[1]) : '';
}

/**
 * Parse an RSS/Atom string into a normalized array of items.
 * @returns {{title,link,description,date,raw}[]}
 */
export function parseFeed(xml = '') {
  const items = [];
  const blocks =
    xml.match(/<item[\s\S]*?<\/item>/gi) ||
    xml.match(/<entry[\s\S]*?<\/entry>/gi) ||
    [];

  for (const block of blocks) {
    const title = stripTags(pick(block, 'title'));
    const link = pickLink(block);
    const description = stripTags(
      pick(block, 'description') || pick(block, 'summary') || pick(block, 'content')
    );
    const dateRaw =
      pick(block, 'pubDate') ||
      pick(block, 'published') ||
      pick(block, 'updated') ||
      pick(block, 'dc:date');
    const date = dateRaw ? new Date(dateRaw) : null;
    if (!title && !link) continue;
    items.push({
      title,
      link,
      description,
      date: date && !isNaN(date) ? date.toISOString() : null,
      raw: block,
    });
  }
  return items;
}
