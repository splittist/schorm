# Linear Course Example

A complete, minimal schorm course using every core building block:

- **Three markdown lessons** (`content/getting-started/`) — one embeds audio
  via a `{{audio}}` shortcode and an image via markdown syntax
- **One quiz** (`quizzes/getting-started/checkpoint.yml`) with four question
  types and a `passing_score` of 0.7
- **Linear sequencing with a quiz gate** (`course.yml`): the LMS presents
  items in order, and the *Summary* lesson stays locked until the checkpoint
  quiz is passed

It doubles as a reference when prompting an LLM to generate a course: show it
this directory plus the output of `schorm schema course` / `schorm schema
quiz` / `schorm schema lesson`.

## Try it

From this directory:

```bash
# Render lessons + quiz, copy media, generate imsmanifest.xml into build/
schorm build

# Serve build/ locally with a mock SCORM API (watch the browser console)
schorm preview --open

# Check structure and cross-references without building
schorm validate

# Create dist/linear-course-scorm2004.zip for LMS upload
schorm package
```

(If you're working from a clone of the schorm repo rather than an installed
package, use `node ../../bin/schorm build` etc. after `npm run build` at the
repo root.)

## Things to notice

- In `schorm preview`, the *Key Concepts* lesson logs its completion only
  after the narration audio finishes — media completion gating in action.
- Submitting the quiz logs one `cmi.interactions.N.*` record per question in
  the console: that's what an LMS receives for item-level analytics.
- Two consecutive `schorm build` runs produce byte-identical output —
  builds are deterministic.
- `schorm.config.yml` points `theme` at the repo's `theme-default/`; in a
  project created with `schorm init` it points at the project's own `theme/`
  copy instead.
