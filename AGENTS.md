# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`; `main.ts` drives the GitHub Action and `index.ts` re-exports packaged entrypoints. Modules such as `chatbot/`, `commenter.ts`, and `reviewer.ts` define agents, while shared logic sits in `utils.ts` and `types.ts`. Tests mirror this layout under `__tests__`, with fixtures in `__fixtures__`. Built bundles land in `dist/` and must ship with `action.yml`. Use `assets/` for badges and prompt templates and `script/` for local tooling.

## Build, Test, and Development Commands
- `npm run test` — execute the Jest suite locally.
- `npm run ci-test` — same as `test`, pinned for CI parity.
- `npm run lint` — run ESLint across the workspace.
- `npm run format:check` / `npm run format:write` — verify or apply Prettier formatting.
- `npm run bundle` — format, then package the Action through Rollup; required before publishing.
- `npm run package:watch` — rebuild the bundle on file change during development.
- `npm run all` — chain format, lint, test, coverage, and packaging steps.

## Coding Style & Naming Conventions
The project targets Node.js ≥ 20 and TypeScript ES modules. Respect Prettier defaults (2-space indent, double quotes) and Biome rules configured in `biome.json`. Use camelCase for symbols, PascalCase for exported types/classes, and kebab-case filenames (`patchParser.ts`, `commenter.ts`). Avoid `any`; Biome warns on explicit usage. Leave console output purposeful even though `no-console` is relaxed.

## Testing Guidelines
Tests use Jest with `ts-jest` and belong in `__tests__` with the `*.test.ts` suffix. Cover new branches with focused unit tests and reuse data helpers from `__fixtures__`. Run `npm run test` before pushing and refresh coverage with `npm run coverage` to update `badges/coverage.svg`. For config or GitHub API changes, add integration-style tests that mock Action inputs to guard against regressions.

## Commit & Pull Request Guidelines
Follow the Conventional Commit style already in history (`feat:`, `fix:`, `chore(deps):`, `build:`) and tack on issue or PR numbers when available (e.g., `feat: add reviewer fallback (#123)`). Run `npm run bundle` and `npm run all` prior to opening a pull request and commit the refreshed `dist/`. Each PR should outline behavioural changes, note the verification commands, mention any follow-up or secrets impact, and request review from maintainers of the touched modules.
