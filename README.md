# MINA TEACHER

An offline-capable, fully free AI teacher for Korean elementary students.
See `docs/ROADMAP.md` for the full architecture and phase plan.

## Phase 1 status: Foundation

- Backend server (Node.js/Express) with SQLite database
- AI engine wired to local Ollama (no paid API, ever)
- Teacher profile creation/login (PIN-based)
- Student roster (add/list/remove)
- Web client (React) that works from any browser on the same WiFi as the
  server PC

## Run it (on the PC that will act as the server)

**Mac/Linux:**

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows:**

This installs Ollama if missing, pulls the free local AI model, installs
all dependencies, builds the web app, and starts the server. When it's
ready, the terminal prints two addresses:
On this PC: http://localhost:4000
On the network: http://<your-pc-ip>:4000

Open the "On this PC" address in a browser on the same machine, or the
"On the network" address from any phone/laptop connected to the **same
WiFi**.

## Manual run (if you've already set up once)

```bash
cd apps/server
npm start
```

(Make sure Ollama is running separately: `ollama serve`)

## Moving to a different/dedicated PC later

Nothing is tied to this specific machine. To move the server:

1. Copy the whole `MINA-SOFTWARE` folder to the new PC (or `git clone` there).
2. Run the setup script on that PC.
3. Everyone just points their browser at the new PC's network address instead.

The `apps/server/data/mina_teacher.db` file is your entire school's data —
back it up before switching machines if you want to keep existing
teachers/students.
