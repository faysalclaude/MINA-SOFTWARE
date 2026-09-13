/**
 * ai/webLookup.js
 *
 * Gives MINA a limited, free way to "look something up online" when a
 * student asks about a topic. This is NOT a general web search engine -
 * building that requires a paid search API (Google/Bing/etc), which
 * conflicts with the "completely free, no paid API" requirement for this
 * project. Wikipedia's REST API is free, requires no API key, and covers
 * an enormous range of general-knowledge topics reliably - a solid,
 * honest middle ground for "MINA can learn about things it doesn't
 * already know" without any ongoing cost.
 *
 * Tries Korean Wikipedia first (since students may ask in Korean), then
 * falls back to English. Returns null if nothing is found - callers must
 * handle that gracefully and answer from the model's own knowledge instead.
 */

export async function lookupTopic (query) {
  const cleaned = query.trim().slice(0, 200)
  if (!cleaned) return null

  for (const lang of ['ko', 'en']) {
    try {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        cleaned
      )}`
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue

      const data = await res.json()
      if (data.type === 'disambiguation' || !data.extract) continue

      return {
        lang,
        title: data.title,
        extract: data.extract.slice(0, 1200),
        url: data.content_urls?.desktop?.page || null
      }
    } catch {
      // Network issue, no article by that exact title, or timeout - try
      // the next language, or give up after both fail.
    }
  }
  return null
}
