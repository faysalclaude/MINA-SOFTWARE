#!/usr/bin/env bash
set -e

echo "========================================"
echo "  MINA TEACHER setup (Mac/Linux)"
echo "========================================"

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install it from https://nodejs.org (LTS version) and re-run this script."
  exit 1
fi
echo "[OK] Node.js found: $(node --version)"

# 2. Check / install Ollama
if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not found. Installing (official script, free/open-source)..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "[OK] Ollama already installed."
fi

# 3. Start Ollama in the background if not running
if ! curl -s http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama..."
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  sleep 3
fi

# 4. Pull the model (free, open-source, runs locally - no API key)
MODEL="qwen2.5:3b-instruct-q4_K_M"
echo "Pulling model $MODEL (this can take a few minutes the first time)..."
ollama pull "$MODEL"

# 5. Install dependencies
echo "Installing server dependencies..."
cd "$(dirname "$0")/../apps/server"
npm install

echo "Installing web client dependencies..."
cd "../web"
npm install

echo "Building web client..."
npm run build

# 6. Start the server
echo ""
echo "Setup complete. Starting MINA TEACHER server..."
cd "../server"
npm start