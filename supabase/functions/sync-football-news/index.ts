import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// General-news feeds first, transfer-specific feeds last — some outlets'
// transfer stories also appear in their general football feed, and
// upserting on url means whichever feed runs last wins the category.
// Processing transfers last means a story that's in both gets the more
// specific tag rather than being swallowed into general news.
const FEEDS = [
  // General news — six outlets for real breadth, not just one voice.
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport', category: 'news' },
  { url: 'https://www.theguardian.com/football/rss', source: 'The Guardian', category: 'news' },
  { url: 'https://www.mirror.co.uk/sport/football/?service=rss', source: 'Mirror Football', category: 'news' },
  { url: 'https://www.dailymail.co.uk/sport/football/index.rss', source: 'Daily Mail', category: 'news' },
  { url: 'https://www.independent.co.uk/sport/football/rss', source: 'The Independent', category: 'news' },
  { url: 'https://metro.co.uk/sport/football/feed/', source: 'Metro', category: 'news' },
  // Transfers — dedicated transfer feeds where the outlet has one.
  // (Not every outlet above has one — a bare keyword filter on the
  // general feed would be too unreliable to trust for a whole section.)
  { url: 'https://feeds.bbci.co.uk/sport/football/transfers/rss.xml', source: 'BBC Sport', category: 'transfers' },
  { url: 'https://www.theguardian.com/football/transfer-window/rss', source: 'The Guardian', category: 'transfers' },
  { url: 'https://www.mirror.co.uk/sport/football/transfer-news/?service=rss', source: 'Mirror Football', category: 'transfers' },
]

// Handles named entities (including the apostrophe variants different
// outlets use inconsistently) and numeric character references (e.g.
// Metro's &#8216; curly quotes) — &amp; is decoded last so nothing it
// produces gets reinterpreted by an earlier rule.
function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&')
}

// Some outlets wrap title/description in CDATA, some don't — try CDATA
// first, fall back to a plain tag match.
function extractTagText(tag, block) {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(block)
  if (cdata) return cdata[1].trim()
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block)
  return plain ? plain[1].trim() : null
}

// Some descriptions are plain text, some are HTML (entity-escaped) with a
// trailing "Continue reading..." link (The Guardian) — strip down to
// plain text either way. Empty/missing descriptions (e.g. Metro puts its
// content elsewhere) just come back null, which the UI already handles.
function cleanSummary(raw) {
  if (!raw) return null
  const decoded = decodeEntities(raw)
  const noReadMore = decoded.replace(/<a[^>]*>Continue reading\.\.\.<\/a>/gi, '')
  const stripped = noReadMore.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stripped) return null
  return stripped.length > 220 ? stripped.slice(0, 217) + '…' : stripped
}

// Metro's feed has no <media:*> or <enclosure> at item level at all — its
// only image is the first <img> inside <content:encoded>'s embedded HTML.
// Only used as a last resort below, since a real <enclosure>/<media:*> is
// always a more deliberate "this is the article image" signal than
// grabbing whatever <img> happens to appear first in the body.
function extractContentEncodedImage(block) {
  const contentMatch = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/.exec(block)
  if (!contentMatch) return null
  const imgTag = /<img\b[^>]*>/.exec(contentMatch[1])
  if (!imgTag) return null
  const urlMatch = /src="([^"]*)"/.exec(imgTag[0])
  return urlMatch ? urlMatch[1] : null
}

// Feeds carry images three different ways: a single <media:thumbnail>
// (BBC), several <media:content> at different widths (The Guardian), or a
// WordPress <enclosure type="image/..."> with no size info at all
// (Mirror). None of these give a reliable width for the enclosure case,
// so it's treated as a reasonable mid-size guess — enough to beat a small
// explicit thumbnail but not a genuinely large media:content image.
function extractBestImage(block) {
  let bestUrl = null
  let bestWidth = -1

  const mediaTags = block.match(/<media:(?:content|thumbnail)\b[^>]*>/g) || []
  for (const tag of mediaTags) {
    const urlMatch = /url="([^"]*)"/.exec(tag)
    if (!urlMatch) continue
    const widthMatch = /width="(\d+)"/.exec(tag)
    const width = widthMatch ? Number(widthMatch[1]) : 0
    if (width > bestWidth) {
      bestWidth = width
      bestUrl = urlMatch[1]
    }
  }

  const enclosureTags = block.match(/<enclosure\b[^>]*>/g) || []
  for (const tag of enclosureTags) {
    if (!/type="image\//.test(tag)) continue
    const urlMatch = /url="([^"]*)"/.exec(tag)
    if (!urlMatch) continue
    const assumedWidth = 500
    if (assumedWidth > bestWidth) {
      bestWidth = assumedWidth
      bestUrl = urlMatch[1]
    }
  }

  if (bestUrl === null) {
    bestUrl = extractContentEncodedImage(block)
  }

  return bestUrl ? decodeEntities(bestUrl) : null
}

function parseRssItems(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  const parsed = items.map((block) => {
    const title = extractTagText('title', block)
    const description = extractTagText('description', block)
    const link = extractTagText('link', block)
    const pubDate = extractTagText('pubDate', block)
    return {
      title: title ? decodeEntities(title) : null,
      summary: cleanSummary(description),
      url: link ? decodeEntities(link) : null,
      image_url: extractBestImage(block),
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
    }
  }).filter((item) => item.title && item.url)

  // A single feed response can list the same story twice (e.g. cross-
  // posted under two tags) — Postgres' ON CONFLICT DO UPDATE can't touch
  // the same row twice in one statement, so dedupe by url before the
  // bulk upsert rather than relying on the slower per-row fallback.
  const seen = new Set()
  return parsed.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

Deno.serve(async () => {
  let upserted = 0
  let failed = 0
  const feedReports = []

  for (const feed of FEEDS) {
    const report = { source: feed.source, category: feed.category }
    try {
      const res = await fetch(feed.url)
      if (!res.ok) {
        console.error(`sync-football-news: ${feed.source} (${feed.category}) fetch failed with status ${res.status}`)
        failed++
        report.error = `fetch status ${res.status}`
        feedReports.push(report)
        continue
      }
      const xml = await res.text()
      const items = parseRssItems(xml)
      report.parsed = items.length
      console.log(`sync-football-news: ${feed.source} (${feed.category}) — ${items.length} items parsed`)
      if (!items.length) { feedReports.push(report); continue }

      const rows = items.map((item) => ({ ...item, source: feed.source, category: feed.category }))
      const { error } = await supabase.from('news').upsert(rows, { onConflict: 'url' })

      if (!error) {
        upserted += rows.length
        report.upserted = rows.length
      } else {
        // The bulk upsert failed as one batch — fall back to per-row
        // upserts so one bad item does not sink the whole feed, and so
        // we can see exactly which row and error caused it.
        console.error(`sync-football-news: ${feed.source} (${feed.category}) bulk upsert failed, retrying per-row`, error.message)
        let rowUpserted = 0
        let firstRowError = null
        for (const row of rows) {
          const { error: rowErr } = await supabase.from('news').upsert(row, { onConflict: 'url' })
          if (rowErr) {
            failed++
            if (!firstRowError) firstRowError = { title: row.title, message: rowErr.message }
          } else {
            rowUpserted++
          }
        }
        upserted += rowUpserted
        report.upserted = rowUpserted
        report.bulkError = error.message
        report.firstRowError = firstRowError
      }
      feedReports.push(report)
    } catch (err) {
      console.error(`sync-football-news: ${feed.source} (${feed.category}) failed`, err)
      failed++
      report.error = String(err)
      feedReports.push(report)
    }
  }

  const summary = { success: true, upserted, failed, feeds: feedReports }
  console.log('sync-football-news: run complete', summary)
  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
})
