import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// General-news feeds first, transfer-specific feeds last — the Guardian's
// transfer stories also appear in its general football feed, and upserting
// on url means whichever feed runs last wins the category. Processing
// transfers last means a story that's both gets the more specific tag.
const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport', category: 'news' },
  { url: 'https://www.theguardian.com/football/rss', source: 'The Guardian', category: 'news' },
  { url: 'https://feeds.bbci.co.uk/sport/football/transfers/rss.xml', source: 'BBC Sport', category: 'transfers' },
  { url: 'https://www.theguardian.com/football/transfer-window/rss', source: 'The Guardian', category: 'transfers' },
]

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// BBC wraps title/description in CDATA; the Guardian doesn't — try CDATA
// first, fall back to a plain tag match.
function extractTagText(tag, block) {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(block)
  if (cdata) return cdata[1].trim()
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block)
  return plain ? plain[1].trim() : null
}

// The Guardian's description is HTML (entity-escaped) with a trailing
// "Continue reading..." link — strip tags down to plain text for a summary.
function cleanSummary(raw) {
  if (!raw) return null
  const decoded = decodeEntities(raw)
  const noReadMore = decoded.replace(/<a[^>]*>Continue reading\.\.\.<\/a>/gi, '')
  const stripped = noReadMore.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stripped) return null
  return stripped.length > 220 ? stripped.slice(0, 217) + '…' : stripped
}

// BBC uses a single self-closing <media:thumbnail>; the Guardian uses
// several <media:content> tags at different widths — pick the largest
// available image regardless of which shape or attribute order is used.
function extractBestImage(block) {
  const tags = block.match(/<media:(?:content|thumbnail)\b[^>]*>/g) || []
  let bestUrl = null
  let bestWidth = -1
  for (const tag of tags) {
    const urlMatch = /url="([^"]*)"/.exec(tag)
    if (!urlMatch) continue
    const widthMatch = /width="(\d+)"/.exec(tag)
    const width = widthMatch ? Number(widthMatch[1]) : 0
    if (width > bestWidth) {
      bestWidth = width
      bestUrl = urlMatch[1]
    }
  }
  return bestUrl ? decodeEntities(bestUrl) : null
}

function parseRssItems(xml) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  return items.map((block) => {
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
}

Deno.serve(async () => {
  let upserted = 0
  let failed = 0

  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url)
      if (!res.ok) {
        console.error(`sync-football-news: ${feed.source} (${feed.category}) fetch failed with status ${res.status}`)
        failed++
        continue
      }
      const xml = await res.text()
      const items = parseRssItems(xml)
      console.log(`sync-football-news: ${feed.source} (${feed.category}) — ${items.length} items parsed`)

      for (const item of items) {
        const { error } = await supabase
          .from('news')
          .upsert({ ...item, source: feed.source, category: feed.category }, { onConflict: 'url' })
        if (error) {
          console.error(`sync-football-news: upsert failed for "${item.title}"`, error.message)
          failed++
        } else {
          upserted++
        }
      }
    } catch (err) {
      console.error(`sync-football-news: ${feed.source} (${feed.category}) failed`, err)
      failed++
    }
  }

  const summary = { success: true, upserted, failed }
  console.log('sync-football-news: run complete', summary)
  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
})
