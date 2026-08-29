/**
 * ai/ollamaClient.js
 *
 * The ONLY place in this codebase that talks to an AI model.
 * Every feature (curriculum generation, teaching, exams, writing feedback,
 * parent reports) must call `complete()` or `completeJson()` from here —
 * never call Ollama's HTTP API directly from a route file.
 *
 * Deliberately has no paid-API code path. If Ollama is unreachable, this
 * throws a clear error instead of silently falling back to any external
 * service.
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b-instruct-q4_K_M'

/** True if the local Ollama server is reachable right now. */
export async function isOllamaRunning () {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(3000)
    })
    return res.ok
  } catch {
    return false
  }
}

/** Lists models currently pulled into this Ollama install. */
export async function listModels () {
  const res = await fetch(`${OLLAMA_HOST}/api/tags`)
  if (!res.ok) throw new Error(`Ollama /api/tags returned HTTP ${res.status}`)
  const body = await res.json()
  return (body.models || []).map(m => m.name)
}

/**
 * Runs a single-turn chat completion against the local model.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{temperature?: number}} [options]
 * @returns {Promise<string>} the model's raw text reply
 */
export async function complete (systemPrompt, userPrompt, options = {}) {
  const running = await isOllamaRunning()
  if (!running) {
    throw new Error(
      'Ollama is not reachable at ' +
        OLLAMA_HOST +
        '. MINA needs the local AI model running on the server machine — start Ollama and try again.'
    )
  }

  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      temperature: options.temperature ?? 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ollama chat request failed: HTTP ${res.status} ${text}`)
  }

  const body = await res.json()
  return body?.message?.content ?? ''
}

/**
 * Same as `complete`, but parses the reply as JSON, tolerating markdown
 * code fences the model sometimes adds despite instructions not to.
 */
export async function completeJson (systemPrompt, userPrompt, options = {}) {
  const raw = await complete(systemPrompt, userPrompt, options)
  const cleaned = raw
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    throw new Error(
      `Model did not return valid JSON: ${e.message} | raw: ${cleaned.slice(
        0,
        500
      )}`
    )
  }
}

export const CURRENT_MODEL = MODEL
