# MINA TEACHER — Architecture & Phase Roadmap (v2)

**What it is:** For each student, MINA acts as their personal AI teacher —
builds a full multi-subject curriculum from their age/grade, teaches through
it, tests them, and adjusts difficulty and content automatically based on
performance. Teachers get a class-wide view and manual override. Parents get
Korean-language progress updates. Everything runs on free, self-hosted
infrastructure — no paid AI API, ever.

---

## Phase 0 — Platform & Infra (locked in)

### Architecture: one self-hosted server, browser-based clients

- **Server** (your own always-on PC, or a free-tier machine you control):
  runs **Ollama** (free, open-source, local LLM — no API key, no bill, no
  usage limit imposed by a third party) + a backend API + the database.
  This is the only place "thinking" happens.
- **Clients** (teacher laptop, student device, parent phone): just a web
  browser pointed at the server's address. No installation, no app store,
  works on anything with a browser. This is a normal client-server web app,
  not a native desktop app — that's the right shape once "many devices need
  to reach one brain over WiFi" is the requirement.

### Network access — two tiers, both free

1. **Same WiFi (default, zero setup):** any device on the school's WiFi
   opens `http://<server-local-ip>:PORT` in a browser. This alone covers
   "teacher, student, and parents-picking-up-their-kid-at-school" access.
2. **Outside the WiFi (optional, still free):** to let a parent check
   progress from home, use a free tunnel — **Tailscale** (free for personal
   use, creates a private network between the server and any device you
   approve) or **Cloudflare Tunnel** (free tier, gives a public HTTPS URL).
   Both are free forever at this scale, no credit card, no API purchase —
   this is networking, not an AI API, so it doesn't conflict with your "no
   paid AI" rule.

### AI engine — Ollama only, nothing paid, no limited free tier

- Every AI feature (curriculum generation, teaching, exam questions,
  writing feedback, parent reports) goes through **one Ollama model**
  running on your server.
- Model choice is a hardware trade-off you control: a smaller model
  (`qwen2.5:3b`) runs fast on modest hardware; a larger one
  (`qwen2.5:14b` or similar) gives noticeably better teaching/evaluation
  quality if your server has the RAM/GPU for it. We pick this together once
  we know your server's specs.
- No fallback to any paid API. If Ollama is down, the app clearly says so
  instead of silently degrading — it never reaches for a paid service
  behind your back.

### What server should you actually use?

Tell me which of these is closest to what you have, and I'll write the exact
setup script for it:

- Your own desktop/laptop, left on, acting as the server.
- A separate old PC repurposed as a dedicated always-on server.
- A free-tier cloud VM (some providers offer small free-forever tiers —
  these have very limited RAM, so only realistic with the smallest Ollama
  model).

_(Default assumption for Phase 1, unless you tell me otherwise: your own
PC/laptop, same-WiFi access first, Tailscale added later for remote
parent access.)_

---

## Phase 1 — Foundation

- Backend API + database schema built around **one student = one full
  multi-subject curriculum owned by MINA**, not a shared class curriculum.
  Subjects: Korean language, Math, Science, Social Studies, English (Korean
  elementary standard set) — extensible.
- `ai_engine.rs` (or equivalent): the single module every feature calls
  into Ollama through. One place to change models, one place to handle
  Ollama being offline.
- Setup script for your server: installs Ollama, pulls the chosen model,
  starts the backend, prints the local network address to open in a
  browser.
- Minimal web shell: teacher login, add-student form, student picker,
  parent view stub.

**You'll be able to check:** server boots on your machine, you open the
printed address from a phone on the same WiFi, and see the app.

---

## Phase 2 — Curriculum Engine (per-student, all subjects)

- On adding a new student (name, age, grade), MINA generates a full
  grade-appropriate curriculum **across all subjects** on its own, using
  Ollama + its knowledge of the Korean elementary standard.
- Curriculum stored as ordered topics per subject per student, each tagged
  with a competency code (used later for mastery tracking).
- Teacher can view/edit any student's curriculum, but doesn't have to —
  MINA works fully autonomously if left alone.

**You'll be able to check:** add a student, watch MINA produce a full
subject-by-subject curriculum without any manual input.

---

## Phase 3 — Teaching, Testing & Adaptive Difficulty

- MINA delivers each curriculum topic as a lesson, then quizzes/exams the
  student on it.
- Performance updates a per-student, per-competency mastery score.
- **Adaptive loop:** weak performance → MINA re-teaches with simpler
  framing/more practice before moving on; strong performance → MINA raises
  difficulty and moves faster, eventually feeding harder material earlier.
  This is the "teacher who knows this exact kid" behavior — driven purely
  by that student's own history, not a fixed sequence.

**You'll be able to check:** two students with different quiz performance
visibly diverge — one gets easier re-teaching, the other gets harder
follow-up content.

---

## Phase 4 — Speaking & Writing Evaluation

- Speaking: browser-based speech-to-text capture, MINA scores pronunciation
  and gives corrective feedback.
- Writing: student submits Korean text, MINA scores it against a rubric
  (grammar, vocabulary, structure) with specific feedback, feeding back
  into the same mastery scores from Phase 3.

**You'll be able to check:** a student's spoken or written attempt gets
real, specific scored feedback, not a generic response.

---

## Phase 5 — Parent Reporting & Teacher Dashboard

- Korean-language progress report per student, generated from real
  mastery/attempt history (which subjects are strong, which need attention,
  concrete recent examples).
- Teacher class-wide dashboard: every student's status at a glance.

**You'll be able to check:** generate a report for one student and read it
as a parent would; see the whole class's progress on one screen as the
teacher.

---

## Phase 6 — Hardening & Remote Access

- Tailscale/Cloudflare Tunnel setup guide for remote parent access (free).
- Backup/restore for the database (so one server disk failure doesn't lose
  the whole school's data).
- Basic load handling if many students use the server at once.

---

## Git Workflow (every phase, every push)

```bash
git checkout -b phase-N-<short-name>
# implement
git add .
git commit -m "[Phase N] <summary>"
git push origin phase-N-<short-name>
```

After every push, tell me — I'll pull, review, and check for anything
missed before the next phase starts.
