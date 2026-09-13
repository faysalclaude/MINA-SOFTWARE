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

import os from 'node:os'

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'

/**
 * Picks a model tier based on the server machine's total RAM, so a school
 * with a stronger PC automatically gets noticeably better answers without
 * anyone having to know what "qwen2.5:7b" even means. A manual
 * OLLAMA_MODEL environment variable always overrides this.
 *
 * accepts an optional byte count so this is unit-testable without needing
 * to fake the OS.
 */
export function pickModelForHardware (totalBytes = os.totalmem()) {
  const totalGB = totalBytes / 1024 ** 3
  if (totalGB > 18) return 'qwen2.5:14b-instruct-q4_K_M'
  if (totalGB > 10) return 'qwen2.5:7b-instruct-q4_K_M'
  return 'qwen2.5:3b-instruct-q4_K_M'
}

let MODEL = process.env.OLLAMA_MODEL || pickModelForHardware()

/** The model currently in use (may change once at startup after auto-detection). */
export function getCurrentModel () {
  return MODEL
}

/**
 * Called once at server startup. If the teacher hasn't manually pinned a
 * model via OLLAMA_MODEL, this detects RAM, picks the right tier, and
 * pulls it automatically if it isn't already on the machine - so upgrading
 * to a better PC later just means a bigger download on first boot, not any
 * manual config.
 */
export async function ensureModelForHardware () {
  const totalGB = Math.round(os.totalmem() / 1024 ** 3)

  if (process.env.OLLAMA_MODEL) {
    console.log(
      `[OLLAMA] Detected ~${totalGB}GB RAM. Using manually configured model: ${MODEL}`
    )
    return
  }
  console.log(
    `[OLLAMA] Detected ~${totalGB}GB RAM. Selected model tier: ${MODEL}`
  )

  const running = await isOllamaRunning()
  if (!running) return // the existing startup banner already reports this clearly

  try {
    const models = await listModels()
    if (models.some(m => m === MODEL)) return

    console.log(
      `[OLLAMA] ${MODEL} isn't pulled yet - downloading now (this can take several minutes on first run, larger models take longer)...`
    )
    const res = await fetch(`${OLLAMA_HOST}/api/pull`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: MODEL, stream: false })
    })
    if (res.ok) {
      console.log(`[OLLAMA] ${MODEL} pulled successfully`)
    } else {
      console.error(
        `[OLLAMA] Failed to pull ${MODEL}: HTTP ${res.status}. Falling back to whatever model is already installed, if any.`
      )
    }
  } catch (e) {
    console.error('[OLLAMA] Auto-pull check failed:', e.message)
  }
}

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
