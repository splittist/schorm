# Configuration & Authoring Reference

What goes in each file of a schorm project. **The JSON schemas are the
authoritative field-level specification** — print them with
`schorm schema <quiz|course|lesson|config>` or read them in
[`schemas/`](../schemas/README.md). This page covers the semantics the
schemas can't show and points you at the right schema, rather than
duplicating field lists.

## Project layout

```txt
course.yml             # course structure & metadata
schorm.config.yml      # global build configuration
content/<module-id>/   # lesson markdown files
quizzes/<module-id>/   # quiz YAML files (quizzes/ root also scanned)
media/<module-id>/     # audio, video, images
theme/                 # Handlebars templates + runtime assets
build/                 # generated output (not committed)
```

## `schorm.config.yml`

Schema: `schorm schema config`. Two fields:

- `scorm_version` (default `2004-4th`) — the target SCORM version.
  **`2004-4th` is currently the only supported value**; `schorm build` and
  `schorm init` reject anything else rather than producing a mislabeled
  package. (SCORM 1.2 export is a possible future addition.)
- `theme` (default `theme`) — path to the theme directory, relative to the
  project root. `schorm init` copies the built-in default theme to `./theme`;
  see the [theme guide](./theme-guide.md) for customizing it.

Extra keys are permitted and ignored.

## `course.yml`

Schema: `schorm schema course`. Key semantics:

- `id` and `title` are required; `id` allows letters, digits, hyphens,
  underscores.
- `description` belongs under `metadata:` (`metadata.description` is shown on
  the generated index page). A top-level `description:` key is ignored.
- `version` and `metadata.author`/`metadata.duration` are informational.
- Each module's `items` lists lesson and quiz ids **in display order**. Every
  id must match a lesson's frontmatter `id` or a quiz file's `id`; `schorm
  validate` and `schorm build` enforce this.
- `sequencing` per module supports `mode: linear | free | scenario`,
  quiz gating (`gate.quiz`), and a branching DSL (`branches`/`choices`) —
  see [sequencing-recipes.md](./sequencing-recipes.md) for worked examples.
  Conditional routes that read course variables are **experimental**: the
  runtime does not yet provide a supported way to set those variables.
- In `mode: scenario`, `items` is ignored and the module is built from linked
  scene markdown files starting at `sequencing.scenario.start`.

## Lessons (`content/<module-id>/<lesson-id>.md`)

Schema for the frontmatter: `schorm schema lesson`. Required: `id`, `title`,
`module` (must name an existing module). Optional: `type: lesson`, `order`,
`duration`, `objectives`; scenario scenes may add `ending: true` and
`mastery: <0..1>`. Any other frontmatter key is preserved in lesson metadata.

The markdown body becomes the lesson content. Embedded media:

- `{{audio src="../media/m1/intro.mp3" title="Narration"}}`
- `{{video src="../media/m1/demo.mp4" poster="../media/m1/poster.jpg"}}`
- Standard markdown images `![alt](../media/m1/figure.png)`

`src` paths are resolved and normalized to the package's `media/...` layout at
build time. Shortcodes accept an optional `id="..."`; otherwise a
deterministic id is generated (`audio-intro-0`), used for media completion
tracking. Audio/video embedded via shortcodes must finish playing before the
lesson reports completion (see [runtime-behavior.md](./runtime-behavior.md)).

## Quizzes (`quizzes/**.yml`)

Schema: `schorm schema quiz` — including, in its `description` fields, the
cross-reference rules the build validator enforces (unique ids, answer
references, `[[blank]]` marker coupling). Key semantics:

- `module` must name an existing module and the quiz `id` must be listed in
  that module's `items`.
- `passing_score` (0–1, default 0.8) is the pass threshold reported to the
  LMS and used by quiz-gated sequencing.
- Five question types: `single-choice`, `multiple-response`, `true-false`,
  `fill-blank`, `matching`.
- Scoring: single-choice/true-false are right-or-wrong; fill-blank awards
  partial credit per correct blank; multiple-response and matching are
  all-or-nothing by default, or per-selection/per-pair credit with a
  question-level `scoring: { mode: partial }` block (optional `perCorrect`,
  `penaltyPerIncorrect`, `minScore` — see the schema for exact semantics).

## Validation

`schorm validate` (or any `schorm build`) checks everything above:
structure, cross-references, sequencing graph acyclicity, and quiz rules,
with error codes documented in [errors.md](./errors.md). The JSON schemas are
additionally verified against the repo's examples in CI so they stay in sync
with the validators.
