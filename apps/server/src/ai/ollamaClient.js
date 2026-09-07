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
 * @param {{temperature?: number, numPredict?: number, numCtx?: number}} [options]
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
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      options: {
        temperature: options.temperature ?? 0.7,
        // Small local models default to a short context/generation length
        // that's fine for a quiz question but cuts off a real explanation
        // partway through. Give lesson-style calls more room. Korean text
        // also costs noticeably more tokens per word than English, so
        // these need to be generous.
        num_predict: options.numPredict ?? 800,
        num_ctx: options.numCtx ?? 4096
      }
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
    // The model's response was cut off before finishing (hit numPredict,
    // or just rambled too long). Try to salvage it by closing whatever
    // string/object/array was left open, rather than failing the whole
    // request - a partial-but-valid lesson beats none.
    const repaired = repairTruncatedJson(cleaned)
    if (repaired !== null) {
      try {
        return JSON.parse(repaired)
      } catch {
        // fall through to the original error below
      }
    }
    throw new Error(
      `Model did not return valid JSON: ${e.message} | raw: ${cleaned.slice(
        0,
        500
      )}`
    )
  }
}

/**
 * Best-effort repair for JSON truncated mid-generation: closes an
 * unterminated string, then closes any objects/arrays that were left
 * open, in the correct order. Returns null if the input doesn't look
 * salvageable at all (e.g. empty, or broken before any structure formed).
 */
function repairTruncatedJson (text) {
  if (!text || (text[0] !== '{' && text[0] !== '[')) return null

  let inString = false
  let escapeNext = false
  const stack = []

  for (const ch of text) {
    if (escapeNext) {
      escapeNext = false
      continue
    }
    if (ch === '\\' && inString) {
      escapeNext = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') stack.pop()
  }

  let repaired = text
  if (inString) repaired += '"'
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']'
  }
  return repaired
}

export const CURRENT_MODEL = MODEL
