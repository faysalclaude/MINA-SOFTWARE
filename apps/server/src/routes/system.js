import { Router } from 'express'
import os from 'node:os'
import {
  isOllamaRunning,
  listModels,
  getCurrentModel
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

  const currentModel = getCurrentModel()
  res.json({
    status: 'ok',
    ollama: {
      reachable: ollamaUp,
      currentModel,
      modelPulled: models.includes(currentModel),
      availableModels: models
    },
    hardware: {
      totalRamGB: Math.round(os.totalmem() / 1024 ** 3)
    },
    network: {
      lanAddresses: getLanAddresses()
    }
  })
})
