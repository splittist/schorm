# Repository Review — July 2026

A full review of schorm covering functionality, testing, documentation, and scope.
Findings are prioritized: **P0** (bugs that break the product's core promise), **P1**
(correctness/consistency issues, cheap to fix), and **P2** (recommendations and backlog).

P0 and P1 items were fixed in the same change set that introduced this document.
P2 items remain open and are written up here so they survive as an actionable backlog.

---

## P0 — Bugs that break the core promise (fixed)

### 1. Quiz pages referenced assets one directory too high

`theme-default/layouts/quiz.html` loaded `../assets/styles.css` and
`../assets/schorm-runtime.js`, but quizzes are written flat into the build root
(`src/commands/build.ts`) alongside lessons, which correctly use `assets/`.

`schorm preview` masked the bug: served from the server root, the browser clamps
`../` at `/`, so the paths accidentally resolved. In an LMS the package is always
served under a subpath, so the scoring runtime and stylesheet 404 — **packaged
quizzes rendered unstyled and never scored**.

**Fix:** both references changed to `assets/`.

### 2. Plain lessons never reported completion

`lesson.html` only loaded the runtime; `cmi.completion_status` was set exclusively
in `SchormRuntime.markScoComplete`, which is called only on quiz submission. A
course consisting only of lessons could never be completed in an LMS.

**Fix:** added `SchormRuntime.markLessonViewed()` (sets `cmi.completion_status =
'completed'` and commits, without touching score/success fields) and call it from
`lesson.html` on load.

### 3. Preview-server path traversal

`src/server/preview-server.ts` computed `path.join(directory, req.url)` with no
URL decoding, no query stripping, and no containment check, so
`GET /../../etc/passwd` escaped the served directory. A dev-only server, but it
would serve any file the process could read to anything that could reach the port.

**Fix:** the request path is now decoded, stripped of the query string, resolved,
and verified to stay within the served directory (403 otherwise).

---

## P1 — Correctness and consistency (fixed)

4. **Version drift.** `package.json` said `0.1.0`, `src/cli.ts` hardcoded
   `.version('0.1.0')`, the runtime JS header said `0.3.0`, and the README said
   v0.3. Now: `package.json` is `0.3.0` and `src/cli.ts` reads the version from
   `package.json` so it cannot drift again.
5. **No CI.** `.github/` had no workflows despite full `lint`, `format:check`,
   `test`, and `build` scripts and active PR-based development — nothing enforced
   any quality gate on PRs. Added `.github/workflows/ci.yml` running lint,
   format check, typecheck, and the test suite on Node 20 and 22.
6. **`schorm package` ignored `build --output` and dropped files.** The source
   directory was hardcoded to `build/`, and the zip included only a fixed
   allowlist (root `*.html`, `imsmanifest.xml`, `assets/`, `media/`) — any other
   build artifact was silently omitted from the SCORM package. Now: `package
   --source <dir>` selects the build directory and the zip includes the whole
   directory.
7. **Broken documentation links.** The README referenced a non-existent
   `examples/sequencing-dsl` directory, titled the Quick Start "(once
   implemented)" although all six commands are implemented, and used a
   placeholder clone URL; `docs/errors.md` linked three docs that don't exist.
   All fixed in place.
8. **`schorm new lesson`/`new quiz` left orphan files on failure.** The content
   file was written before `course.yml` was checked for the target module, so a
   failed run left a stray `.md`/`.yml` behind. Module existence is now
   validated before any file is written.
9. **The test suite was flaky in parallel and had 8 permanently failing tests.**
   Test files share `test-output/` and delete each other's working directories
   mid-run under Vitest's default file parallelism (93 spurious failures on a
   multi-core machine); a `vitest.config.ts` now serializes file execution.
   Separately, 8 tests had rotted against the current implementation: quiz
   fixtures with one option (the validator requires two), assertions expecting
   `data-correct` attributes on inputs (answers moved to the embedded quiz
   JSON), runtime function names that never existed (`gradeFillBlankQuestion`,
   `initQuizForm`), a `[[blank]]`-replacement check that broke when the raw
   text became legitimately present in the embedded JSON, and an undefined
   `courseConfig` reference. All repaired.
10. **The lesson render context omitted `lesson.id`** (`src/commands/build.ts`),
    so themes could not reference the lesson's ID — discovered while wiring up
    completion reporting, fixed by passing `id` through.

---

## P2 — Backlog: recommendations not implemented in this pass

### SCORM runtime and data model

- ~~**No `cmi.interactions.*` reporting.**~~ **Done (July 2026):** quiz
  submission now writes one `cmi.interactions.n.*` record per question (id,
  SCORM-mapped type, learner_response and correct_responses patterns, result,
  weighting, timestamp), appended after any existing interactions via
  `cmi.interactions._count`.
- **No suspend/resume or bookmarking outside scenario mode.** Only
  `scenario.html` sets `cmi.location`/`cmi.suspend_data`. Lessons and quizzes
  have no re-entry handling (`cmi.entry`/`cmi.exit`), and quizzes don't restore
  prior answers.
- **`findAPI` never checks `window.opener`** (`theme-default/assets/schorm-runtime.js`).
  LMSs that launch SCOs in a popup window won't be found; the SCO silently falls
  into preview mode and reports nothing. Walk the opener chain as well as parents.
- **Client-side answer keys / score integrity.** The full quiz object — including
  `correct`, `correct_answers`, and `correct_pairs` — is embedded in the page
  (`quiz.html` `jsonStringify`, plus `data-correct-*` attributes in partials), and
  the client writes `cmi.score.*` directly. This is a common SCORM shortcut, but
  it should be documented as an explicit integrity limitation: any learner can
  read the answers from source or set an arbitrary score.

### Manifest correctness

- **Media files are not associated with the SCO resources that use them.**
  `src/core/manifest.ts` dumps every media file into the first (index) resource;
  each lesson/quiz `<resource>` lists only its own HTML plus the two common asset
  files. IMS content packaging expects a resource to enumerate its dependent
  files (or reference a shared asset resource via `<dependency>`).
- **`scorm_version` config is inert.** It is read, defaulted, and logged, but the
  manifest hardcodes `schemaversion` "2004 4th Edition". Either implement the
  other editions (and eventually SCORM 1.2 export) or reject unsupported values.
- **No XSD validation of generated manifests** — see Testing below.

### Determinism

- ~~**Media IDs embed `Date.now()`.**~~ **Done (July 2026):** media IDs are now
  derived from the shortcode, source filename, and document-scoped occurrence
  index (`audio-intro-0`), so the same input produces identical build output.

### Security / content trust

- **XSS surface with untrusted content.** Templates use triple-stache
  (`{{{question.prompt}}}`, `{{{text}}}`, `{{{lesson.content}}}`) and markdown-it
  runs with `html: true`. Fine for trusted authors, but the README explicitly
  targets LLM-generated content, which makes this a stored-XSS vector inside the
  LMS. Recommend sanitizing rendered HTML (or making `html: true` opt-in) and
  documenting the trust model.
- **`scenario.html` interpolates unvalidated values into inline JS** —
  `masteryScore` comes from frontmatter and is never validated as a number, and
  scenario scene IDs are not run through `validateLessonId`. A hostile or
  malformed value yields broken or injectable script.
- **`init`/`new` do no path-component sanitization** before creating directories
  from the project name / module segment (IDs are validated later, after paths
  are resolved).

### Testing

- **No XSD conformance testing of `imsmanifest.xml`.** Manifest assertions are
  substring checks only; a manifest violating the IMS content-packaging or
  sequencing schemas would pass. For a SCORM generator this is the single biggest
  test gap — vendor the ADL/IMS XSDs and validate generated manifests in the
  packaging tests.
- **No coverage measurement** (`@vitest/coverage-v8` not configured), so
  untested modules are invisible. `src/core/config.ts` has zero direct coverage
  and `src/cli.ts` routing has no dedicated test.
- The E2E suite is strong (real CLI invocations, real HTTP preview requests, full
  build→package zips) but slow: each `it` shells out to `init`/`new`/`build` in
  fresh processes, and file execution is now serialized (see P1.9) to avoid the
  shared `test-output/` collisions. Moving to per-file temp directories would
  allow re-enabling parallelism and cut runtime substantially.

### Schemas

- ~~**`schemas/quiz-schema.json` is an orphan.**~~ **Done (July 2026):** the quiz
  schema now carries `passing_score`, an `$id`, defaults, and description-text
  documentation of every cross-reference rule the validators enforce; the
  `schorm schema` command prints any schema for LLM handoff; example quizzes
  carry yaml-language-server modelines; and `test/core/schemas.test.ts` (ajv,
  dev-only dependency) validates the examples and cross-checks the schema
  against the hand-written validator so it cannot silently drift again.
- ~~**No schema for `course.yml` or lesson frontmatter.**~~ **Done (July 2026):**
  `schemas/course-schema.json` (including the full sequencing/branching DSL),
  `schemas/lesson-frontmatter-schema.json`, and `schemas/config-schema.json`
  now exist, documented in `schemas/README.md`. The hand-written validators
  remain authoritative at build time; the schemas are the accurate,
  LLM-consumable specification of the file formats.

### Documentation

- **Undocumented CLI flags**: `init --title/--scorm-version/--force`,
  `build -o/--config/--json`, `package --out/--name/--no-validate`,
  `validate --json/--debug-validation`. Only `preview --open` is documented.
- **`schorm.config.yml` fields are never listed anywhere** (only `scorm_version`
  and `theme` are consumed), and course `version`/`metadata.*` support is
  undocumented.
- **No theme customization guide** — `docs/architecture.md` describes theme
  structure but nothing explains creating a theme or overriding partials/runtime.
- **`scoring: partial` is advertised but inert.** Examples and the JSON schema
  show `scoring: mode: partial` for multiple-response/matching, but the runtime
  is exact-match / all-or-nothing ("no partial credit in v0.3"). Mark it clearly
  in the examples and schema until implemented.
- **`docs/architecture.md` has model drift** — it describes `registerInitCommand()`
  functions, `Course.scormVersion`, `Quiz.type`, and `MediaItem.alt`, none of
  which match the code.
- **Markdown-image media tracking is undocumented** — `![](…)` images are
  auto-tracked as media items, and there is no `{{image}}` shortcode even though
  the media attribute type includes `'image'`.

### Scope ideas

- Implement the planned `schorm lint`, `schorm schema`, and `schorm graph`
  commands (the README already advertises them as planned).
- SCORM 1.2 export — the config knob already exists.
- Partial-credit scoring for multiple-response and matching.
- **A full end-to-end example course** (module + lesson + quiz + media). Today
  `examples/` has only standalone quiz files and a scenario-only course; a new
  user has no runnable "linear module" reference.
- Repo hygiene: CHANGELOG, CONTRIBUTING, issue/PR templates, Dependabot config,
  and release automation (`prepublishOnly` runs only `build` — a broken test
  suite can publish).

### Code quality

- `src/commands/build.ts` is a ~580-line monolith mixing orchestration, logging,
  rendering, and error mapping; the media-placeholder replacement rebuilds a
  `RegExp` per media item per lesson.
- Untyped side channels: `(module as any)._generatedSequencing`,
  `(lesson as any).isScenario/isEnding/masteryScore/sceneChoices`. These deserve
  real types (extend the models or use a dedicated scenario type).
- Duplicated logic: DFS cycle detection exists in both `course-model.ts` and
  `scenario-builder.ts` (the latter — `detectCycles` — is exported but never
  called, so scenario navigation cycles are never actually reported);
  `escapeHtml`/`escapeRegex` are re-implemented locally in `scenario-builder.ts`.
- Hardcoded constants: passing score `0.8` duplicated between `manifest.ts` and
  `schorm-runtime.js` (with a keep-in-sync comment); scenario pass threshold
  `0.6` inline in `scenario.html`.
- `validateModuleSequencing` reports author-facing warnings via `console.warn`
  instead of the structured `ValidationResult.warnings` channel, so they never
  appear in `--json` output.
- `media.ts` `mimeType` is a stubbed `''` with a TODO; `validateConfig` in
  `config.ts` is never called.
- Tooling: ESLint is on the legacy `.eslintrc.cjs` format with ESLint 8;
  `parserOptions.project` is set but the type-checked rulesets aren't enabled
  (paying the cost of type info without the stronger rules). `tsconfig.json`
  excludes test files from `tsc`, so tests are only type-checked when Vitest
  runs them — a `typecheck` script covering tests would close that.
