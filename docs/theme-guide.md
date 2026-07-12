# Theme Guide

How schorm themes work and how to customize one safely.

## Anatomy

A theme is a directory (default: `theme/`, copied from the package's
`theme-default/` by `schorm init`, selected via `theme:` in
`schorm.config.yml`):

```txt
theme/
  layouts/               # one Handlebars template per page type
    lesson.html          # rendered per lesson (required)
    quiz.html            # rendered per quiz (required if the course has quizzes)
    scenario.html        # rendered per scenario scene (required for scenario mode)
    index.html           # course landing page (required)
    base.html            # spare generic layout (not used by the build)
  partials/              # registered recursively as Handlebars partials
    header.html          # used as {{> header}}
    footer.html          # used as {{> footer}}
    media-block.html     # renders one media item ({{> media-block media=this}})
    quiz/                # subdirectory partials get a path prefix:
      question.hbs       #   {{> quiz/question}}
      single-choice.hbs  #   ...one per question type
      multiple-response.hbs
      true-false.hbs
      fill-blank.hbs
      matching.hbs
  assets/                # copied verbatim into build/assets/
    schorm-runtime.js    # the SCORM runtime (see runtime-behavior.md)
    styles.css
```

Partials may use `.html` or `.hbs`; both register under their basename, with
subdirectories adding a `dir/` prefix.

## Template contexts

What the build passes to each layout (`src/commands/build.ts`):

| Layout | Context |
| --- | --- |
| `lesson.html` | `courseTitle`, `lesson.{id, title, content, metadata}` — `content` is rendered HTML, so use `{{{lesson.content}}}` |
| `quiz.html` | `courseTitle`, `quiz` (the full parsed quiz object, snake_case fields as in the quiz schema) |
| `scenario.html` | `courseTitle`, `lesson.{id, title, content, metadata, isEnding, masteryScore}` |
| `index.html` | `courseTitle`, `courseDescription`, `modules` (each with resolved item titles/links) |

Available helpers (registered in `src/core/templates.ts`): `eq`, `gt`,
`contains`, `uppercase`, `add1` (0-based → 1-based), `jsonStringify`
(compact JSON, used to embed the quiz model), and `parseFillBlanks`
(replaces `[[blank]]` markers with input fields).

## Contracts the build and runtime rely on

Customize freely, but keep these invariants or scoring/completion breaks:

1. **Asset paths are package-relative** — pages are written flat into the
   build root, so reference `assets/styles.css`, never `../assets/...`
   (an LMS serves the package under a subpath).
2. **Every page loads the runtime**: `<script src="assets/schorm-runtime.js">`.
3. **Lessons report completion** by calling
   `SchormRuntime.markLessonViewed('{{lesson.id}}')` after the runtime loads.
4. **Quiz pages embed the quiz model** in
   `<script type="application/json" id="schorm-quiz-data">{{{jsonStringify quiz}}}</script>`
   and give the submit button/results area the ids the runtime queries
   (`schorm-quiz-submit`, `schorm-quiz-result` — see `quiz.html`).
5. **Question markup carries the data attributes the runtime reads**:
   `.question[data-question-id][data-question-type]`, input `name`/`value`
   conventions per type, `.fill-blank-input[data-blank-id]`,
   `.matching-select[data-premise-id]` (see the quiz partials).
6. **Media completion tracking** finds `.schorm-media[data-id]` wrappers —
   `media-block.html` emits them; keep that class/attribute if you restyle it.
7. **Lesson media placeholders**: the markdown pipeline inserts
   `<schorm-media data-schorm-id="...">` placeholders which the build replaces
   using the `media-block` partial — don't rename that partial.

## Customizing

1. `schorm init` already gave you a private copy in `theme/` — edit it
   directly, or copy it elsewhere and point `theme:` in `schorm.config.yml`
   at the new path.
2. Start with `assets/styles.css` (pure CSS, no contracts), then partials,
   then layouts.
3. Rebuild and use `schorm preview` — the injected mock SCORM API logs every
   runtime call to the browser console, which is the quickest way to confirm
   contracts 2–5 still hold.
