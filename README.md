# schorm

A CLI-driven static-site generator for SCORM 2004 e-learning content.

---

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

---

## Project Status

**Early development (v0.1)**
This is the foundational repository setup. Core architecture, CLI scaffolding, and default theme structure are being implemented.
Not suitable for production use yet.

---

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

---

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
schorm validate
schorm package

---

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
