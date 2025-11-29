# schorm

A CLI-driven static-site generator for SCORM 2004 e-learning content.

## Overview

`schorm` is a command-line tool for building SCORM 2004 packages using a workflow inspired by modern static site generators (e.g., Hugo, MkDocs, Eleventy).

Instead of using a heavy CMS or visual authoring tool, schorm lets you create SCORM-compliant courses using:
- Markdown for lessons
- YAML/JSON for quizzes and metadata
- Handlebars templates for HTML layouts
- A lightweight runtime JS layer for SCORM API integration
- A clean CLI for init → build → preview → package

This makes SCORM content:
- version-controllable
- LLM-friendly
- developer-friendly
- reproducible
- scriptable
- transparent

`schorm` is a great fit for teams who want to automate course creation, integrate AI agents, or simply avoid the bloat of multi-user CMS systems like Adapt Authoring.

## Project Status

**Early development (v0.3)**
Core architecture, CLI scaffolding, default theme, and quiz scoring functionality are implemented.
Not suitable for production use yet.

### Recent Milestones
- **v0.3**: Browser-side quiz scoring with SCORM integration
  - Five question types supported (single-choice, multiple-response, true-false, fill-blank, matching)
  - SCORM 2004 API integration with preview mode fallback
  - Automatic scoring and pass/fail determination
- **v0.1**: Initial CLI and build system

## Features (Current & Planned)

**MVP Goals**
- 🔧 `schorm init` — create a new SCORM project with default structure
- 🧱 `schorm new` — scaffold modules, lessons, and quizzes
- 🏗️ `schorm build` — render content → HTML + templates → SCORM-ready structure
- 🌐 `schorm preview` — local server with mock SCORM runtime
- 📦 `schorm package` — create SCORM 2004 ZIP for upload to an LMS
- 🔍 `schorm validate` — manifest + structure checks

**Core Principles**
- CLI-first, file-first
- Static-site generator mental model
- LLM-friendly schemas
- Minimal viable SCORM 2004 subset
- Deterministic builds

**Planned Later**
- Linting rules (schorm lint)
- JSON schemas (schorm schema)
- Course graph export (schorm graph)
- Additional sequencing rules
- Multi-SCO themes
- Theming system with multiple built-in themes

## **Quick Start** (once implemented)

### Install globally
`npm install -g schorm`

### Create a new course project
`schorm init northhaven-onboarding`
`cd northhaven-onboarding`

### Add content
`schorm new module m1 "Introduction"`
`schorm new lesson m1/intro "The Owner–Operator Relationship"`
`schorm new quiz m1/quiz "Intro Quiz"`

### Build and preview locally
`schorm build`
`schorm preview --open`

### Validate & package as a SCORM 2004 ZIP
`schorm validate`
`schorm package`

## Project Structure

A typical schorm project looks like:

```
course.yml             # course structure & metadata
schorm.config.yml      # global build configuration
content/               # Markdown lessons
quizzes/               # YAML quiz specifications
media/                 # images, audio, video
theme/                 # Handlebars templates + assets
build/                 # generated output (not committed)
```

The output of schorm build includes:
	•	HTML lessons/quizzes
	•	media files
	•	SCORM runtime JS
	•	generated imsmanifest.xml
	•	assets from the theme

All of this is zipped by schorm package into a SCORM-compliant bundle.

### Module sequencing and branching schema

`course.yml` supports progressively richer sequencing controls to keep YAML stable and LLM-friendly:

- `mode`: `linear` or `free` navigation for items in the module (defaults to `free`)
- `gate.quiz`: lock later items until a quiz is passed
- `branches`: named entry points into a navigation graph
- `choices`: conditional routes that jump to other items or end the flow

Example combining all options:

```yaml
modules:
  - id: m1
    title: "Role-based onboarding"
    items:
      - intro
      - role-decision
      - fundamentals
      - architect-lab
      - wrap-up
    sequencing:
      mode: linear
      gate:
        quiz: fundamentals-quiz
      branches:
        - id: default-path
          start: intro
          choices: [role-path]
      choices:
        - id: role-path
          from: role-decision
          routes:
            - label: architect track
              to: architect-lab
              condition:
                variable: learner.role
                in: [architect, lead]
            - label: standard track
              to: fundamentals
            - label: end-early
              end: true
```

Validation protects against invalid references, cycles, and missing targets:

- A `branch.start`, `choice.from`, or `route.to` must refer to an item in `items`
- `branches.choices` must point to defined choice IDs
- Routes must either declare `end: true` or a `to` target
- Conditional routes may not form cycles (e.g., `a -> b -> a`), keeping graphs SCORM-friendly

## Content Authoring

### Writing Lessons

Lessons are authored in Markdown with YAML frontmatter. **All lessons must include valid frontmatter** with the following required fields:

```markdown
---
id: m1-intro           # required: unique identifier (alphanumeric, hyphens, underscores)
title: "Introduction to SCORM"  # required: lesson title
module: m1             # required: must match a module ID in course.yml
type: lesson           # optional: reserved for future use
order: 1               # optional: for future ordering logic
objectives:            # optional: learning objectives
  - Understand SCORM basics
  - Learn about SCOs
---

# Introduction

This is your lesson content.
```

**Frontmatter Schema:**
- `id`: Required. Must be unique across the course. Recommended format: `<module>-<slug>` (e.g., `m1-intro`)
- `title`: Required. The lesson title displayed in the LMS
- `module`: Required. Must reference an existing module ID defined in `course.yml`
- `type`: Optional. If present, must be `"lesson"` (reserved for distinguishing content types in future versions)
- `order`: Optional. Number used for future ordering features
- Other fields (like `objectives`, `duration`) are optional and stored in lesson metadata

**Validation:**
The build process validates all lesson frontmatter and fails with clear error messages if:
- Required fields are missing
- The `module` references a non-existent module
- The `id` contains invalid characters (only alphanumeric, hyphens, and underscores allowed)
- Field types are incorrect (e.g., `order` must be a number)

### Media Shortcodes (v0.2+)

Embed audio and video directly in your Markdown lessons using shortcodes:

**Audio:**
```markdown
{{audio src="../media/m1/intro.mp3" title="Introduction Audio"}}
```

**Video:**
```markdown
{{video src="../media/m1/demo.mp4" poster="../media/m1/poster.jpg" title="Demo Video"}}
```

**Attributes:**
- `src` (required) — path to media file
- `title` (optional) — descriptive label
- `poster` (video only) — poster/thumbnail image
- `id` (optional) — custom ID (auto-generated if omitted)

Both single and double quotes are supported:
```markdown
{{audio src='file.mp3' title='My Audio'}}
```

Media shortcodes are processed during the build and rendered inline where they appear in your content.

---

## Why `schorm`?

1. A modern workflow for SCORM

Most SCORM tools assume non-technical authors and rely on heavyweight GUIs, databases, or server-side CMSes.

`schorm` takes a different approach:
- treat SCORM content as a static site
- represent everything as files (Markdown, YAML, CSS)
- keep authors close to their content
- keep LMS-specific logic inside a small runtime library

2. Great for automation and AI workflows

Since `schorm` is file-driven and uses strict JSON/YAML schemas, it is ideal for:
- LLM content generation
- structured course creation agents
- CI pipelines that auto-build and validate SCORM packages
- GitOps workflows

3. Transparent, maintainable, durable

Your course is just a folder of files.
Everything is inspectable.
Everything works offline.
Everything is version-controllable.

---

## Development Setup

Requirements:
- Node.js 20+
- npm or pnpm

Clone the repo:

```bash
git clone https://github.com/<your-org>/schorm.git
cd schorm
npm install
```
Build & run in dev:

```bash
npm run dev     # runs CLI via tsx
npm run build   # compile TypeScript
npm test        # vitest
```

## Contributing

Discussion, issues, and PRs are welcome.

Useful docs:
- `/docs/prd.md` — Product Requirements (draft)
- `/docs/architecture.md` (draft)

If adding new commands or core functionality, start with an issue first so the design can be aligned with the overall architecture.

---

## License

MIT License.

You may freely use, modify, and distribute schorm.
