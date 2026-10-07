# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online game platform where players compete for highest score. Early stage — only create-next-app scaffold exists (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`). README says project follows spec-driven development (`/spec` and `/spec-impl` workflow) with skills from `Klerith/fernando-skills` (`npx skills@latest add Klerith/fernando-skills`).

## Next.js version warning

Next 16.4 + React 19.3. Breaking changes vs. training data. Per `AGENTS.md`, read relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) before writing Next code. Heed deprecations. `next dev` re-adds the `AGENTS.md` block; commit it, do not remove.

## Architecture notes

- App Router only (`app/`). Root layout uses global `LayoutProps<"/">` type helper (no import needed) and `next/font/google` Geist fonts.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, `experimental.agentFeedback`. Cache Components changes data-fetching and caching semantics — check docs before adding fetches or dynamic APIs.
- Tailwind v4 via `@tailwindcss/turbopack` loader rule in `next.config.ts` (not PostCSS). Theme tokens in `app/globals.css` (`@theme inline`), light/dark via `prefers-color-scheme`.

# Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.