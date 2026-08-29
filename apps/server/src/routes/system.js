import { Router } from 'express'
import os from 'node:os'
import {
  isOllamaRunning,
  listModels,
  CURRENT_MODEL
} from '../ai/ollamaClient.js'

export const systemRouter = Router()

function getLanAddresses () {
  const nets = os.networkInterfaces()
  const addresses = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address)
      }
    }
  }
  return addresses
}

systemRouter.get('/health', async (req, res) => {
  const ollamaUp = await isOllamaRunning()
  let models = []
  if (ollamaUp) {
    try {
      models = await listModels()
    } catch {
      models = []
    }
  }

  res.json({
    status: 'ok',
    ollama: {
      reachable: ollamaUp,
      currentModel: CURRENT_MODEL,
      modelPulled: models.includes(CURRENT_MODEL),
      availableModels: models
    },
    network: {
      lanAddresses: getLanAddresses()
    }
  })
})
