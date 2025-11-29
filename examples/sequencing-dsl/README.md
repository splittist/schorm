# Sequencing DSL Sample Course

This sample project shows how `course.yml` sequencing controls map to SCORM behaviors.

## Files
- `course.yml` — module metadata, items, and sequencing DSL
- `content/` — minimal Markdown lessons with required frontmatter
- `quizzes/` — a single quiz that gates the debrief item

## Storyline
Learners progress through tower orientation content, branch into one of two routes, and must pass a final quiz before the debrief becomes available.

## Behaviors to expect
- **Linear navigation:** `sequencing.mode: linear` sets SCORM `controlMode.forwardOnly=true`, keeping navigation chronological while still allowing LMS next/back buttons.
- **Branch point:** `choices` declare routes from `fork-choice`. The `Field operations` route only appears if `learner.role` is `field` or `responder`; otherwise the engineering path is used. An `end: true` route exits the attempt.
- **Quiz gate:** `gate.quiz: final-quiz` writes a shared SCORM objective when the quiz is passed. Any item that appears after the quiz (`debrief` here) receives a precondition that disables launch until the objective is satisfied, so the LMS will gray it out or refuse to open it.

## Limits & authoring notes
- Branch conditions rely on SCORM objective satisfaction flags; they cannot read arbitrary runtime data beyond the mapped objectives generated from `condition.variable` comparators.
- Choices and branches must reference items that already exist in `items`, and cycles are rejected during validation.
- Only a narrow SCORM sequencing subset is emitted: `controlMode`, preconditions (`disabled`), postconditions (`jump`/`exitAll`), and simple objective mappings for gates and conditions.
