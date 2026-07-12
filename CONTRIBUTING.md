# Contributing to schorm

Thanks for helping! This page covers the workflow; the architecture is
described in [docs/architecture.md](docs/architecture.md) and the open
backlog in [docs/repo-review-2026-07.md](docs/repo-review-2026-07.md).

## Setup

```bash
git clone https://github.com/splittist/schorm.git
cd schorm
npm install
npm run build     # compile TypeScript (the CLI and tests run dist/)
```

`npm run dev` runs the CLI from source via tsx.

## The gates

CI runs all of these; run them before pushing:

```bash
npm run lint          # eslint over src/
npm run format:check  # prettier over src/ (npm run format to fix)
npm run typecheck     # tsc over src/ AND test/ (tests are typechecked!)
npm run build         # tsc -> dist/ (required before npm test)
npm test              # vitest, files run in parallel
```

`npm run test:coverage` produces a V8 coverage report (command modules show
0% because the E2E tests exercise them in subprocesses).

## Test conventions

- **Each test file that touches the filesystem owns a unique directory**
  (`test-output/<slug>` or an `os.tmpdir()` mkdtemp) and only ever deletes
  its own directory. Never write to or remove the shared `test-output` root —
  test files run in parallel.
- Command behavior is tested end-to-end by exec-ing `bin/schorm` (see
  test/commands/); core logic is tested in-process (test/core/).
- The SCORM runtime (`theme-default/assets/schorm-runtime.js`) is covered
  two ways: string-pattern tests (`test/core/quiz-scoring.test.ts`) and an
  executable harness that runs it against jsdom + a recording API stub
  (`test/core/quiz-runtime-exec.test.ts`). Behavior changes need both.

## Keeping things in sync

Some artifacts must move together — drift tests enforce most of these:

- **Change `src/core/quiz-model.ts`, `quiz-validator.ts`, `course-model.ts`,
  or `config.ts` → update the matching schema in `schemas/`** in the same
  PR. The schemas are handed to LLMs to generate content and must stay
  accurate (`test/core/schemas.test.ts` validates the repo's examples
  against them).
- The default passing score lives in `src/core/quiz-model.ts`
  (`DEFAULT_PASSING_SCORE`) and, necessarily duplicated, in the runtime JS —
  a drift test pins them together.
- **Change user-facing behavior → update the reserved doc subsection**
  (docs/cli-reference.md, configuration-and-authoring.md, theme-guide.md,
  runtime-behavior.md) and add a CHANGELOG entry.

## Commits and PRs

- Conventional-commit style subjects (`feat:`, `fix:`, `refactor:`,
  `test:`, `docs:`, `chore:`), imperative mood, body explaining why.
- Start a discussion issue before large features so the design can be
  aligned with the architecture.
