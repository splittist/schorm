# Runtime Behavior

What the shipped runtime (`theme-default/assets/schorm-runtime.js`) reports
to the LMS, when, and the limitations you should know before deploying.

## API discovery and preview mode

On page load the runtime searches for the SCORM 2004 API (`API_1484_11`) up
the window's parent chain, then — for popup-launched SCOs — up the opener's
parent chain. If no API is found, the page runs in **preview mode**: every
SCORM call is logged to the browser console and state is kept in
`localStorage` instead. `schorm preview` injects a mock API that logs all
calls and answers `cmi.*` reads like a real LMS, so packages behave the same
way locally as they will after upload.

Preview-mode localStorage keys: `schorm:lesson:<id>`, `schorm:quiz:<id>`,
`schorm:media:<page path>`.

## Lesson completion

Lesson pages call `SchormRuntime.markLessonViewed(lessonId)` on load, which
sets `cmi.completion_status = 'completed'` and commits. If the page contains
tracked media (audio/video embedded via shortcodes), completion is **deferred
until every tracked media element has finished playing**.

## Quiz submission

On submit the runtime collects answers from the DOM, evaluates them against
the quiz model embedded in the page, then writes in one batch and commits:

- `cmi.score.raw` / `cmi.score.max` / `cmi.score.scaled`
- `cmi.success_status` — `passed` if the scaled score reaches the quiz's
  `passing_score` (default 0.8), else `failed`
- `cmi.completion_status = 'completed'`
- `cmi.objectives.0.*` — a `local-<quiz-id>-passed` objective used by
  quiz-gated sequencing
- `cmi.interactions.n.*` — one record per question: `id`, SCORM-mapped
  `type` (`choice`, `true-false`, `fill-in`, `matching`),
  `learner_response` and `correct_responses.0.pattern` in SCORM 2004 pattern
  syntax, `result` (`correct`/`incorrect`), `weighting` (the question's
  points), and `timestamp`. Records append after any existing interactions
  (via `cmi.interactions._count`), enabling item-level analytics in the LMS.

Scoring: single-choice and true-false are right-or-wrong. Fill-blank always
awards partial credit per correct blank. Multiple-response and matching are
all-or-nothing by default; a question-level `scoring: { mode: partial }`
switches them to per-selection/per-pair credit —
`perCorrect × correct − penaltyPerIncorrect × incorrect`, clamped between
`minScore` (default 0) and the question's points, with proportional credit
when no params are given. Wrongly matched premises count as incorrect;
unanswered ones just earn nothing. See `schorm schema quiz` for the exact
parameter semantics.

## Scenario mode

Scenario scenes track the learner's path and use `cmi.location` /
`cmi.suspend_data` for bookmarking, reporting `cmi.score.scaled` from the
reached ending's `mastery` value. See
[sequencing-recipes.md](./sequencing-recipes.md).

## Re-entry (suspend/resume)

Leaving any SCO before it reports completion sets `cmi.exit = 'suspend'`
(after completion, a normal exit), commits, and terminates the session, so
the LMS offers to resume.

Quizzes fully support resuming: answers are saved to `cmi.suspend_data`
(JSON) as the learner changes them, and restored into the form on re-entry.
If the quiz was already submitted, re-entry re-displays the results and
keeps submission locked. In `schorm preview`, the mock API persists its data
model per page in localStorage, so simply reloading the page exercises the
whole resume flow (clear site data to start fresh).

Scenario scenes additionally track the learner's path in
`cmi.location`/`cmi.suspend_data` as before.

## Limitations & trust model

### Score integrity

Quizzes are scored **client-side**: the full quiz model — including correct
answers — is embedded in the page's JSON payload, and the browser writes
`cmi.score.*` directly. Any learner can read the answers from view-source or
set an arbitrary score from the console. This is a common SCORM pattern and
fine for self-paced learning content, but schorm packages are **not suitable
for high-stakes or proctored assessment**.

### Content trust (XSS)

Lesson markdown is rendered with raw HTML enabled, and templates
intentionally emit authored content unescaped (`{{{lesson.content}}}`, quiz
prompts/options). **Content authors are trusted**: anything they write ships
verbatim into pages that run inside your LMS origin. If course content comes
from an untrusted source — including unreviewed LLM output — sanitize it
before building, or review the generated package. This is the flip side of
the LLM-friendly authoring pipeline: schorm validates structure, not the
safety of embedded HTML/JS.
