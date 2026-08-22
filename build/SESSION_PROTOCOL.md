# Session Protocol — How Every Build Session Works

> **Multi-agent note.** This procedure is written so that *any* agent (Claude Code,
> Google Antigravity, Cursor, Codex, Gemini, or a human) can run a session with
> zero prior context. It is the answer to "how does each new chat know what to do,
> and how does context/logs/state pass between chats?" Answer: **through the
> committed files described here — never through chat memory.**

---

## 0. Mental model (read this once)

- A **session** = one unit of work small enough for a single fresh chat to finish.
- Every session runs in a **brand-new chat** with **no memory of any other chat.**
- The only things that survive between chats are **committed files**:
  - `build/STATE.md` — the ledger: what's done, what's next, what interfaces exist.
  - `build/logs/SNN-log.md` — the journal each session leaves for the next agent.
  - the **code and git history** themselves.
- So the protocol is simply: **read the durable files → do the work → write the
  durable files.** If you follow it, the next chat (possibly a different AI) can
  pick up perfectly even though it remembers nothing.

```
        ┌─────────────────────────────────────────────────────┐
        │  Durable, committed state (survives between chats)   │
        │  plan.md · STATE.md · logs/ · docs/ · the code       │
        └───────────────▲───────────────────────┬─────────────┘
              reads at start            writes at end
                        │                       │
                 ┌──────┴───────────────────────▼──────┐
                 │  A single session (one fresh chat)   │
                 │  Claude / Antigravity / Codex / …    │
                 └──────────────────────────────────────┘
```

---

## 1. The seven steps of a session

Every session — no exceptions — runs these seven steps in order.

### Step 1 — Load context (always the same four reads)
1. `plan.md` — the master plan (what & why).
2. this file (`build/SESSION_PROTOCOL.md`).
3. `build/STATE.md` — find your session's row; confirm its dependencies are `DONE`.
4. `build/sessions/SNN-*.md` — your session spec.

Then read only the docs your session names (e.g. `docs/API.md` for a backend
module). Do **not** read the whole repo — the session file tells you what matters.

### Step 2 — Verify preconditions
Every session file has a **Preconditions** list. Check each one (dependency sessions
`DONE` in `STATE.md`, required files exist, `npm install` works). If a precondition
fails, **stop** and report it in your final message — do not build on sand.

### Step 3 — Create the branch
```bash
git checkout main && git pull        # start from latest main
git checkout -b feat/sNN-<slug>      # e.g. feat/s04-auth
```
If working solo on one machine without PRs, you may branch off the previous
session's branch instead — the session file's Preconditions say which.

### Step 4 — Do the work
Build exactly the files listed in the session's **Deliverables**. Follow the coding
standards in `plan.md §6`. Stay in scope: if you find you must touch a file owned by
another session, make the minimal change, and record it in Step 6.

### Step 5 — Verify against acceptance criteria
Every session file has an **Acceptance criteria** checklist with the exact commands
to run (`npm run typecheck`, `npm run lint`, `npm test`, a `curl`, etc.). Run them.
Every box must pass. If one cannot pass yet (e.g. depends on an unbuilt session),
note it explicitly — do not silently skip it.

### Step 6 — Update the durable state  ← *this is how the next chat gets context*
Two writes, always:

**(a) `build/STATE.md`** — set your session's status to `DONE`, fill in the
"Interfaces produced" so the next agent knows what exists (new endpoints, exported
functions, shared types, env vars, migration names). Add anything that unblocks or
blocks other sessions.

**(b) `build/logs/SNN-log.md`** — copy `build/logs/_TEMPLATE.md` and fill it: what
you built, key decisions, any deviation from the session file, gotchas, and TODOs
you are handing off. Write it for a stranger — assume the next agent knows nothing.

### Step 7 — Commit & hand off
```bash
git add -A
git commit -m "feat(<scope>): <short summary>"   # Conventional Commits, no co-author
```
Open a PR into `main` (or merge locally if that's the agreed flow). In your final
chat message, post a **handoff summary**: what's done, what's now unblocked, and the
exact next session to run. Then the chat ends.

---

## 2. How context actually passes between chats (the FAQ)

**Q: Each session is a new chat with no memory. How does it know what happened
before?** It reads `build/STATE.md` (the ledger) and the relevant `build/logs/`
entries. Those files are updated at the end of every session (Step 6), so they are
always current. That is the entire mechanism.

**Q: What is the prompt for each session?** It is printed at the bottom of that
session's file (`build/sessions/SNN-*.md`) under **"▶ Copy-paste prompt."** Paste
it verbatim into the new chat. The prompt tells the agent to read the four context
files and then execute the session — so you never have to re-explain anything.

**Q: Where do logs live?** `build/logs/SNN-log.md`, one per session. They are the
narrative history; `STATE.md` is the current snapshot. Both are committed to git.

**Q: What if two sessions run in parallel?** Allowed when the roadmap
(`plan.md §5`) marks them parallelizable. They must touch disjoint files. Each uses
its own branch and its own log file; each updates only its own row in `STATE.md`.
Merge order doesn't matter because scopes don't overlap.

**Q: A different agent (Antigravity) ran the last session and left the branch
messy. What do I do?** Read its `build/logs/SNN-log.md` and the git diff. The log's
"Deviations" and "Handoff TODOs" sections tell you what's real. Trust committed
files over any assumption.

**Q: The session file conflicts with the code / another doc.** `docs/DECISIONS.md`
is the tie-breaker for product/contract questions. If it doesn't cover the case,
make the smallest reasonable decision, **record it in `docs/DECISIONS.md`**, and
note it in your log so it becomes durable.

---

## 3. Rules that keep the system consistent

- **One session, one branch, one log, one PR.** Don't bundle two sessions.
- **Never edit another session's `STATE.md` row.** Only your own (plus adding a note
  under "Blockers/notes" if you discovered something others need).
- **Never delete a log.** Logs are append-only history.
- **If you change a shared contract** (`docs/API.md`, `packages/shared`, the Prisma
  schema), announce it loudly in `STATE.md` "Blockers/notes" and in your log,
  because it may invalidate other agents' in-flight work.
- **Leave it green or say it's red.** Don't claim acceptance criteria pass if you
  didn't run them. Honesty in the log is worth more than a clean-looking status.
- **No AI co-author in commits.** (Repository-wide rule.)

---

## 4. Session lifecycle cheat-sheet

```
NEW CHAT ▶ paste the session's "Copy-paste prompt"
   │
   ├─ 1. read plan.md · SESSION_PROTOCOL.md · STATE.md · SNN-*.md
   ├─ 2. verify preconditions (deps DONE?)            ── fail ▶ STOP, report
   ├─ 3. git checkout -b feat/sNN-<slug>
   ├─ 4. build the Deliverables (in scope only)
   ├─ 5. run Acceptance criteria commands             ── fail ▶ fix or report
   ├─ 6. update STATE.md  +  write logs/SNN-log.md
   └─ 7. commit (conventional, no co-author) ▶ PR ▶ handoff message
CHAT ENDS ▶ next agent starts a fresh chat with the next session's prompt
```

That's the whole system. If you did Steps 1–7, the next agent — whoever, whatever
model, whenever — can continue with zero questions.
