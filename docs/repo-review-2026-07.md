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
- ~~**`findAPI` never checks `window.opener`.**~~ **Done (July 2026):** after
  exhausting the parent chain the runtime now searches the opener's parent
  chain (cross-origin guarded), so popup-launched SCOs find the API.
- ~~**Client-side answer keys / score integrity.**~~ **Documented (July 2026):**
  the limitation is now stated explicitly in `docs/runtime-behavior.md`
  ("not suitable for high-stakes assessment"). Server-side scoring remains
  out of scope for a static-site generator.

### Manifest correctness

- ~~**Media files are not associated with the SCO resources that use them.**~~
  **Done (July 2026):** each lesson resource lists the media its content uses,
  shared theme assets moved to a `RES-common-assets` asset resource referenced
  from every SCO via `<dependency>`, and unreferenced media stays declared once
  on the index resource. The gate objective's `minNormalizedMeasure` now also
  uses the gate quiz's own `passing_score` instead of a hardcoded 0.8.
- ~~**`scorm_version` config is inert.**~~ **Done (July 2026):** `schorm build`
  and `schorm init` now reject values other than `2004-4th` with a clear
  message instead of silently producing a mislabeled package. SCORM 1.2 export
  remains a scope idea.
- **XSD validation of generated manifests** — partially done; see Testing below.

### Determinism

- ~~**Media IDs embed `Date.now()`.**~~ **Done (July 2026):** media IDs are now
  derived from the shortcode, source filename, and document-scoped occurrence
  index (`audio-intro-0`), so the same input produces identical build output.

### Security / content trust

- **XSS surface with untrusted content.** Templates use triple-stache
  (`{{{question.prompt}}}`, `{{{text}}}`, `{{{lesson.content}}}`) and markdown-it
  runs with `html: true`. **The trust model is now documented** in
  `docs/runtime-behavior.md` (content authors are trusted; sanitize LLM output
  before building). Actual sanitization (or opt-in `html: true`) remains open.
- **`scenario.html` interpolates unvalidated values into inline JS** —
  `masteryScore` comes from frontmatter and is never validated as a number, and
  scenario scene IDs are not run through `validateLessonId`. A hostile or
  malformed value yields broken or injectable script.
- **`init`/`new` do no path-component sanitization** before creating directories
  from the project name / module segment (IDs are validated later, after paths
  are resolved).

### Testing

- **XSD conformance testing of `imsmanifest.xml`** — partially done (July
  2026): `test/core/manifest-conformance.test.ts` checks well-formedness via
  xmllint plus reference integrity (identifierref resolution, file/dependency
  shape, single declaration per media file), and automatically upgrades to
  full `xmllint --schema` validation when the SCORM 2004 XSDs are placed in
  `test/fixtures/xsd/` (see its README — the schema hosts are unreachable from
  the sandboxed dev environment, so the XSDs still need to be vendored by a
  maintainer with network access).
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

**Done (July 2026)** — the documentation suite now covers the previously
undocumented surface, written after the behavior-settling fixes so it should
not need rewriting as remaining features land (each future feature maps to a
single small subsection):

- ~~Undocumented CLI flags~~ → `docs/cli-reference.md` (every command, flag,
  exit code, and `--json` output shape).
- ~~`schorm.config.yml` and course `version`/`metadata` undocumented~~ →
  `docs/configuration-and-authoring.md`, which links to the JSON schemas as
  the authoritative field spec instead of duplicating them.
- ~~No theme customization guide~~ → `docs/theme-guide.md` (anatomy, template
  contexts, and the template/runtime contracts a custom theme must keep).
- ~~`scoring: partial` advertised but inert~~ → marked "not yet implemented"
  in the quiz schema description, the authoring reference, and
  `docs/runtime-behavior.md`.
- ~~`docs/architecture.md` model drift~~ → corrected against the code
  (command registration, Course/Quiz/MediaItem shapes, theme tree, data-model
  element list).
- ~~Markdown-image media tracking undocumented~~ → covered in the authoring
  reference's media section.

### Scope ideas

- Implement the planned `schorm lint` and `schorm graph` commands
  (`schorm schema` shipped July 2026).
- SCORM 1.2 export (the config knob now rejects it explicitly until built).
- Partial-credit scoring for multiple-response and matching.
- ~~**A full end-to-end example course.**~~ **Done (July 2026):**
  `examples/linear-course/` — lessons with media, a mixed-type gating quiz,
  linear sequencing, and a walkthrough README; validated against the schemas
  and built end-to-end in the test suite.
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
- Hardcoded constants: the default passing score `0.8` is still duplicated
  between `manifest.ts` and `schorm-runtime.js` (though the manifest gate now
  honors a quiz's explicit `passing_score`); scenario pass threshold
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
