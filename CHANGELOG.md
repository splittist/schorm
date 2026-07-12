# Changelog

All notable changes to schorm are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/).

## [Unreleased]

### Added

- `schorm schema <quiz|course|lesson|config>` prints the JSON schemas, which
  are now accurate and complete for LLM-driven course generation (including
  `passing_score` and description-text documentation of every
  cross-reference rule); new schemas for `course.yml`, lesson frontmatter,
  and `schorm.config.yml`.
- Per-question results are reported to the LMS via `cmi.interactions.n.*`
  (id, SCORM-mapped type, learner/correct response patterns, result,
  weighting, timestamp).
- Suspend/resume: every SCO reports `cmi.exit` and terminates on page leave;
  quizzes persist answers to `cmi.suspend_data` and restore them (including
  submitted results) on re-entry. The preview server's mock API persists
  state per SCO so resume works locally.
- Partial-credit scoring for multiple-response and matching questions via
  `scoring: { mode: partial }` (perCorrect / penaltyPerIncorrect / minScore).
- Lessons report completion to the LMS (`markLessonViewed`), deferred until
  embedded audio/video finishes playing.
- `schorm package --source` selects the build directory; the ZIP now
  contains the whole build output.
- End-to-end example course (`examples/linear-course/`), documentation suite
  (CLI reference, configuration/authoring, theme guide, runtime behavior),
  manifest conformance tests, CI, Dependabot, and issue/PR templates.
- Scenario navigation loops surface as `W-SCENARIO-CYCLE` build warnings;
  scenario-mode config that will be ignored surfaces as structured warnings
  in `validate --json` and `build --json`.

### Fixed

- Quiz pages loaded theme assets from `../assets/`, escaping the package
  under an LMS subpath — packaged quizzes never scored or styled.
- The SCORM API is now found for popup-launched SCOs (opener-chain search).
- The quiz-gate sequencing threshold uses the quiz's own `passing_score`
  instead of a hardcoded 0.8.
- Media files are declared on the SCO resources that use them, with shared
  theme assets in one asset resource referenced via `<dependency>`.
- Media element IDs are deterministic (derived from content, not
  `Date.now()`), so identical input builds byte-identical output.
- Unsupported `scorm_version` values are rejected at `init` and `build`
  instead of silently producing a mislabeled package.
- The preview server rejects path traversal and serves URLs with query
  strings.
- `schorm new lesson`/`quiz` no longer leave orphan files when the target
  module doesn't exist.
- Scenario `mastery` values are validated as 0–1 numbers and scene ids
  format-checked before they reach SCORM objective ids and inline scripts.

## [0.3.0] - 2026-07

Baseline release line: CLI (`init`, `new`, `build`, `preview`, `package`,
`validate`), markdown lessons with YAML frontmatter, quiz YAML with five
question types and browser-side scoring, SCORM 2004 4th Edition manifest
generation with linear/free/scenario sequencing and quiz gating, media
shortcodes with completion tracking, default theme, and a mock-SCORM
preview server.
