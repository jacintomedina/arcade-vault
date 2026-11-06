# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online arcade platform where players compete for the highest score. Spanish-language UI; answer and write user-facing copy in Spanish.

Five playable games (`asteroides`, `tetris`, `arkanoid`, `snake`, `invasores`), each with 3 skins and a shared Game Boy touch pad, a real leaderboard in Supabase, a landing page, a library, a hall of fame, a contact form via Resend, and a local guest session. Specs 01–11 in `specs/` are all `Implementado`. `invasores` comes from the game-jam spec `specs/game-jam.agent/invasores/01-invasores-core.md` (not renumbered).

Development is spec-driven: `/spec` writes the spec, `/spec-impl` implements it (user-level skills from `Klerith/fernando-skills`, `npx skills@latest add Klerith/fernando-skills`). No code without an approved spec.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint flat config (`eslint.config.mjs`)
- No test runner. Verification is `npm run lint`, `npm run build`, `npx tsc --noEmit`, and the browser.

## Next.js version warning

Next 16.4.2 + React 19.3. Breaking changes vs. training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next code. Heed deprecations. `next dev` re-adds the `AGENTS.md` block (rules + `agentFeedback` reporting pass); commit it, do not remove.

## Architecture

### Specs

`specs/` holds the spec-driven design history, plus `specs/game-jam/` for thematic jams.

### Routes (App Router only)

- `/` landing, `/games` library (see `references/implemented-games.md` whenever you need to check which games are implemented and how to implement new ones), `/games/[id]` game detail, `/games/[id]/play` player, `/hall` hall of fame, `/about` about + contact, `/access` sign in / sign up / guest, `/access/forgot`, `/access/reset`, `/access/username`, `/profile`, and the `/auth/callback` Route Handler (no UI).
- `generateStaticParams` + `generateMetadata` over `GAMES` in the `[id]` routes; unknown id → `notFound()`.
- Global type helpers `LayoutProps<"/">` and `PageProps<"/games/[id]">` (no import needed).
- Root layout loads `Press_Start_2P`, `JetBrains_Mono` and `Courier_Prime` from `next/font/google`, and wraps everything in `SessionProvider` + `Nav` / `Footer`.
- `GET /api/health/supabase` → `200 { ok: true }` or `503 { ok: false, error }`.
- `proxy.ts` (root) refreshes the Supabase session through `app/_lib/supabase/proxy.ts`; an invalid config must not break other routes.

### Directory layout

- `app/_components/` — UI. `game-player.tsx` (player, `REAL_GAMES`), `gameboy-pad.tsx` (`GameBoyPad`, `PadMapping`). `games/` holds one client component per game plus the shared contract in `games/types.ts`.
- `app/_games/<id>/` — canvas engine in TypeScript: `engine.ts`, `entities.ts`, `input.ts`, `constants.ts`, `skins.ts` (plus `levels.ts` in arkanoid).
- `app/_lib/` — `leaderboard.ts` (cached reads) and `supabase/` (`client.ts` browser, `server.ts` server, `admin.ts` service role, `proxy.ts` session refresh, `database.types.ts` generated).
- `app/_actions/scores.ts` — Server Actions `startGameSession` / `submitScore`.
- `app/access/actions.ts` — auth Server Actions (`signUp`, `signIn`, `signInWithProvider`, `signOutAction`, `requestPasswordReset`, `updatePassword`, `setUsername`, `checkUsernameAvailable`). `app/auth/callback/route.ts` exchanges the PKCE `code` for a session.
- `app/about/actions.ts` — `sendContactMessage` Server Action.
- `app/data/` — static catalog (`games.ts`: `GAMES`, `CATS`, `GameCategory`, `GameColor`) and landing copy (`home.ts`).
- `specs/` specs + `.spec-config.yml` (+ `game-jam.agent/` variants); `supabase/migrations/` SQL; `public/games/<id>/` game assets.
- `references/` — `started-games/` (original vanilla games), `templates/` (visual templates), `source-assets/`, `implemented-games.md`, `game-suggestions-todo.md`.

### Color por categoría (regla fija)

El `color` de cada juego en `GAMES` sale de su `cat`, no se elige libre:

| `cat`                        | `color`   |
| ---------------------------- | --------- |
| `SHOOTER`                    | `cyan`    |
| `PUZZLE`                     | `magenta` |
| `ARCADE`                     | `yellow`  |
| categoría nueva (no listada) | `green`   |

Una categoría nueva obtiene `green`. Una segunda categoría nueva requiere decidir un color con el usuario y ampliar esta tabla.

### Config and styling

- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`, `experimental.agentUpgrade: "security"`, plus `allowedDevOrigins` (LAN IPs for testing on a phone). Cache Components changes data-fetching and caching semantics — check the docs before adding fetches or dynamic APIs.
- `next.config.ts` also sets security headers on every route via `headers()` (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS without `preload`, `Permissions-Policy` for camera/microphone/geolocation). No CSP. Do not add iframes or camera/mic/geolocation features without revisiting them.
- Tailwind v4 via the `@tailwindcss/turbopack` loader rule in `next.config.ts` (not PostCSS). Theme tokens in `app/globals.css` (`@theme inline` + `:root`): `--cyan`, `--magenta`, `--yellow`, `--green`, `--gold`/`--silver`/`--bronze`, `--font-pixel`, `--font-mono`. Dark CRT aesthetic only — no light theme.
- `app/globals.css` is one big hand-written stylesheet (~2000 lines): `.crt-screen` (4:3 frame), `.cover-<id>` covers drawn in pure CSS, `.av-bg` / `.av-noise`.

## Game pattern (fixed rules)

- The platform owns HUD, pause, FIN and the save modal — all in `game-player.tsx`. The engine draws neither HUD nor GAME OVER; it only emits `onStats` and `onGameOver(finalScore)`.
- `GameComponentProps` (`app/_components/games/types.ts`): `paused`, `runKey`, `inputRef`, `onStats`, `onGameOver`, optional `skin`. Extend it, never break it.
- Registration is by map in `REAL_GAMES` in `app/_components/game-player.tsx` (`Component`, `Controls`, `pad`, optional `initialLives`, optional `skins`). Never a loose `if (game.id === ...)`.
- No module touches `document` or `window` at top level. The engine is created inside `useEffect`; cleanup calls `stop()` (cancels `requestAnimationFrame`, removes listeners).
- `dt` in seconds, capped at 0.05 s; `lastTime` resets on resume. Pause really stops `update` and `draw`.
- `Math.random()` only inside the engine, after mount — never during render.
- Each game ships keyboard controls, a keys hint and touch input through the shared Game Boy pad (`pad: PadMapping`, SPEC 10) with the split mobile HUD (SPEC 11).
- Skins: each game has `app/_games/<id>/skins.ts` (`clasico` default, `neon`, `retro`); the engine exposes `setSkin(skin)` with no restart. `game-player.tsx` shows the selector only if `skins` is declared. Choice stored in `localStorage` under `av_skin_<id>`, read once after mount. Skin CSS uses the `.skin-` prefix.

## Leaderboard and anti-cheat

- Scores only enter through `startGameSession` and `submitScore` in `app/_actions/scores.ts`. Never from the client directly, never via `localStorage`.
- Flow: `startGameSession` inserts a row in `game_sessions`; `submitScore(sessionId, score)` first requires a signed-in user (`auth.getUser()`, not `getSession()`) with a `profiles.username`, **before** consuming the game session, and saves with that username uppercased (the client never sends a name). It then validates the UUID, a positive safe integer score, a session TTL of 2 h, and the cap `score <= floor(elapsedSeconds * games.max_score_per_second)`. A conditional `UPDATE` on `consumed_at` makes the session single-use; a failed insert releases it again.
- Reads live in `app/_lib/leaderboard.ts` with `"use cache"` + `cacheTag("leaderboard")` + `cacheLife("hours")`, through a cookie-less client with the publishable key (RLS authorizes public reads; `cookies()` is unavailable inside `use cache`).
- After a save, `submitScore` calls `updateTag("leaderboard")` **and** `revalidatePath` on `/hall`, `/games`, `/games/<id>` — without the paths the client router cache keeps serving the old list.
- A new game needs a row in `games` with a justified `max_score_per_second`. It must never reject a legitimate run.

## Supabase

- Env vars in `.env.template` → copy to `.env.local` (not versioned): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, bypasses RLS — never log it or expose it to the client), `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`.
- Schema: `games`, `game_sessions`, `scores`, and the `leaderboard` view (`security_invoker = true`, top-10 rank per game).
- Migrations are SQL files in `supabase/migrations/` (`<timestamp>_<slug>.sql`), applied to the remote project with the Supabase MCP (`apply_migration`). Show the SQL and ask for confirmation first; afterwards verify with `list_tables`, `get_advisors`, `execute_sql`, and regenerate `app/_lib/supabase/database.types.ts` with `generate_typescript_types`.
- RLS is on in every table. `game_sessions` has **no policies on purpose** (service role only), so the `rls_enabled_no_policy` INFO advisor is accepted; do not add policies to silence it. The `auth_leaked_password_protection` WARN is accepted too (needs the Pro plan). Auth settings (min password length, password requirements, sign-up rate limit) are dashboard-only; see `README.md` → Seguridad.
- MCP config: `.mcp.json` (git-ignored, from `.mcp.json.example` with your `project_ref`). Playwright MCP is also used for browser checks.

## Session and contact

- Auth is Supabase Auth (email + password with email confirmation, Google, GitHub). Table `profiles` (`id` → `auth.users`, unique `lower(username)`, ASCII `[A-Za-z0-9_ ]{1,10}`) is created by the `handle_new_user` trigger; the username is public. Only accounts with a username can save scores; guests can still play.
- Password policy lives only in `app/_lib/password.ts` (8–72 chars with lowercase, uppercase, digit and symbol; ASCII symbol set identical to Supabase's). `signUp` and `updatePassword` enforce it and `PasswordChecklist` shows it live in `auth-form.tsx` and `password-form.tsx`. `signIn` must not validate composition. Never duplicate the regex.
- `SessionProvider` (Client Component) exposes `user: { name } | null`, `account`, `status: "loading" | "ready"`, `login` (guest only), async `logout` and `refresh`. First render has no user; after mount it reads the guest from `localStorage` (`av_user`) and the account with `getUser()` + `profiles`, and subscribes to `onAuthStateChange`. With an account the guest is ignored (not deleted). Reading cookies in pages (`/access`, `/access/reset`, `/access/username`, `/profile`) happens inside `Suspense`.
- Dashboard setup (Site URL, Redirect URLs, Confirm email, Google/GitHub) is documented in `README.md`.
- `/about` contact form posts to the `sendContactMessage` Server Action, which sends through Resend to `jmedinalba@gmail.com`, with a honeypot field and length/format validation.

# Skills

Project (`.claude/skills/<name>/SKILL.md`):

- `/add-game <carpeta de references/started-games | descripción>` — turns a game into a real platform game: spec, engine, component, `REAL_GAMES` entry, migration, leaderboard. Support files in the same folder.
- `/spec-impl-game <NN-juego-id>` — runs `/spec-impl` on a game spec, then `skin-designer` and `mobile-porter` in series.

User (`~/.claude/skills/<name>/SKILL.md`):

- `/spec` — writes a spec section by section.
- `/spec-impl` — implements an approved spec on branch `spec-NN-slug` (`AutoCreateBranch: true` in `specs/.spec-config.yml`).
- `/frontend-design` — mandatory for any UI design.
- `/find-skills` — finds and installs skills.
- `/caveman` — terse reply mode.

# Agents

Project (`.claude/agents/<name>.md`):

- `game-planner` — picks the next game and returns the brief for `/add-game`. Versioned memory in `.claude/agent-memory/game-planner/`.
- `game-jam` — writes 3 spec variants (A faithful, B twist, C intense) in `specs/game-jam.agent/<game-id>/`; never implements.
- `skin-designer` — adds the `clasico`/`neon`/`retro` skins to an implemented game; checks with `tsc` + `lint`.
- `mobile-porter` — read-only mobile audit of a game against SPEC 10/11; reports a verdict and checklist in chat.
