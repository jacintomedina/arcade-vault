# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online arcade platform where players compete for the highest score. Spanish-language UI; answer and write user-facing copy in Spanish.

Four playable games (`asteroides`, `tetris`, `arkanoid`, `snake`), a real leaderboard in Supabase, a landing page, a library, a hall of fame, a contact form via Resend, and a local guest session. Specs 01–09 in `specs/` are all `Implementado`.

Development is spec-driven: `/spec` writes the spec, `/spec-impl` implements it (user-level skills from `Klerith/fernando-skills`, `npx skills@latest add Klerith/fernando-skills`). No code without an approved spec.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint flat config (`eslint.config.mjs`)
- No test runner. Verification is `npm run lint`, `npm run build`, `npx tsc --noEmit`, and the browser.

## Next.js version warning

Next 16.4.2 + React 19.3. Breaking changes vs. training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next code. Heed deprecations. `next dev` re-adds the `AGENTS.md` block (rules + `agentFeedback` reporting pass); commit it, do not remove.

## Architecture

### Routes (App Router only)

- `/` landing, `/games` library (see `references/implemented-games.md` whenever you need to check which gamer are implemented and how to implement new ones), `/games/[id]` game detail, `/games/[id]/play` player, `/hall` hall of fame, `/about` about + contact, `/access` guest login.
- `generateStaticParams` + `generateMetadata` over `GAMES` in the `[id]` routes; unknown id → `notFound()`.
- Global type helpers `LayoutProps<"/">` and `PageProps<"/games/[id]">` (no import needed).
- Root layout loads `Press_Start_2P`, `JetBrains_Mono` and `Courier_Prime` from `next/font/google`, and wraps everything in `SessionProvider` + `Nav` / `Footer`.
- `GET /api/health/supabase` → `200 { ok: true }` or `503 { ok: false, error }`.
- `proxy.ts` (root) refreshes the Supabase session through `app/_lib/supabase/proxy.ts`; an invalid config must not break other routes.

### Directory layout

- `app/_components/` — UI. `games/` holds one client component per game plus the shared contract in `games/types.ts`.
- `app/_games/<id>/` — canvas engine in TypeScript: `engine.ts`, `entities.ts`, `input.ts`, `constants.ts` (plus `levels.ts` in arkanoid).
- `app/_lib/` — `leaderboard.ts` (cached reads) and `supabase/` (`client.ts` browser, `server.ts` server, `admin.ts` service role, `proxy.ts` session refresh, `database.types.ts` generated).
- `app/_actions/scores.ts` — Server Actions `startGameSession` / `submitScore`.
- `app/data/` — static catalog (`games.ts`: `GAMES`, `CATS`, `GameCategory`, `GameColor`) and landing copy (`home.ts`).
- `specs/` specs + `.spec-config.yml`; `supabase/migrations/` SQL; `references/` source templates and the original vanilla games; `public/games/<id>/` game assets.

### Config and styling

- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`, `experimental.agentUpgrade: "security"`. Cache Components changes data-fetching and caching semantics — check the docs before adding fetches or dynamic APIs.
- Tailwind v4 via the `@tailwindcss/turbopack` loader rule in `next.config.ts` (not PostCSS). Theme tokens in `app/globals.css` (`@theme inline` + `:root`): `--cyan`, `--magenta`, `--yellow`, `--green`, `--gold`/`--silver`/`--bronze`, `--font-pixel`, `--font-mono`. Dark CRT aesthetic only — no light theme.
- `app/globals.css` is one big hand-written stylesheet (~2000 lines): `.crt-screen` (4:3 frame), `.cover-<id>` covers drawn in pure CSS, `.av-bg` / `.av-noise`.

## Game pattern (fixed rules)

- The platform owns HUD, pause, FIN and the save modal — all in `game-player.tsx`. The engine draws neither HUD nor GAME OVER; it only emits `onStats` and `onGameOver(finalScore)`.
- `GameComponentProps` (`app/_components/games/types.ts`): `paused`, `runKey`, `inputRef`, `onStats`, `onGameOver`. Extend it, never break it.
- Registration is by map in `REAL_GAMES` in `game-player.tsx` (`Component`, `Controls`, `TouchControls`, optional `initialLives`). Never a loose `if (game.id === ...)`.
- No module touches `document` or `window` at top level. The engine is created inside `useEffect`; cleanup calls `stop()` (cancels `requestAnimationFrame`, removes listeners).
- `dt` in seconds, capped at 0.05 s; `lastTime` resets on resume. Pause really stops `update` and `draw`.
- `Math.random()` only inside the engine, after mount — never during render.
- Each game ships keyboard controls, a keys hint and touch controls (mobile layout).

## Leaderboard and anti-cheat

- Scores only enter through `startGameSession` and `submitScore` in `app/_actions/scores.ts`. Never from the client directly, never via `localStorage`.
- Flow: `startGameSession` inserts a row in `game_sessions`; `submitScore` validates the UUID, the name (`/^[\p{L}\p{N}_ ]{1,10}$/u`, uppercased), a positive safe integer score, a session TTL of 2 h, and the cap `score <= floor(elapsedSeconds * games.max_score_per_second)`. A conditional `UPDATE` on `consumed_at` makes the session single-use; a failed insert releases it again.
- Reads live in `app/_lib/leaderboard.ts` with `"use cache"` + `cacheTag("leaderboard")` + `cacheLife("hours")`, through a cookie-less client with the publishable key (RLS authorizes public reads; `cookies()` is unavailable inside `use cache`).
- After a save, `submitScore` calls `updateTag("leaderboard")` **and** `revalidatePath` on `/hall`, `/games`, `/games/<id>` — without the paths the client router cache keeps serving the old list.
- A new game needs a row in `games` with a justified `max_score_per_second`. It must never reject a legitimate run.

## Supabase

- Env vars in `.env.template` → copy to `.env.local` (not versioned): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, bypasses RLS — never log it or expose it to the client), `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`.
- Schema: `games`, `game_sessions`, `scores`, and the `leaderboard` view (`security_invoker = true`, top-10 rank per game).
- Migrations are SQL files in `supabase/migrations/` (`<timestamp>_<slug>.sql`), applied to the remote project with the Supabase MCP (`apply_migration`). Show the SQL and ask for confirmation first; afterwards verify with `list_tables`, `get_advisors`, `execute_sql`, and regenerate `app/_lib/supabase/database.types.ts` with `generate_typescript_types`.
- MCP config: `.mcp.json` (git-ignored, from `.mcp.json.example` with your `project_ref`). Playwright MCP is also used for browser checks.

## Session and contact

- `SessionProvider` is a guest-only session: a name in `localStorage` under `av_user`, read once after mount to avoid a hydration mismatch. No Supabase Auth yet.
- `/about` contact form posts to the `sendContactMessage` Server Action, which sends through Resend to `jmedinalba@gmail.com`, with a honeypot field and length/format validation.

# Skills

- `/add-game <carpeta de references/started-games | descripción>` — project skill (`.claude/skills/add-game/`) that turns a game into a real platform game: spec first, then engine, component, `REAL_GAMES` entry, Supabase migration and leaderboard. Support files: `integration-checklist.md`, `porting-guide.md`, `spec-template.md`, `migration-template.sql`.
- `/spec` and `/spec-impl` — the spec-driven workflow. `specs/.spec-config.yml` has `AutoCreateBranch: true`, so `/spec-impl` creates `spec-NN-slug` on its own.
- Always use `/frontend-design` to design the user interface.

# Agents

- `game-planner` — project subagent (`.claude/agents/game-planner.md`) that decides which game to add next and returns a brief for `/add-game`. Persistent memory (`memory: project`) in `.claude/agent-memory/game-planner/` (`MEMORY.md`, `decisions.md`, `criteria.md`), versioned; it logs every proposal, acceptance and rejection.
- `game-jam` — project subagent (`.claude/agents/game-jam.md`). Input: a game name or short description. Writes 3 alternative specs (A faithful, B twist, C intense) in `specs/game-jam.agent/<game-id>/` for user review, modeled on SPEC 07/08/09. Autonomous (no questions), writes only there, never implements. The chosen variant is renumbered to `specs/NN-juego-<id>.md` and goes to `/spec-impl` or `/add-game`.
