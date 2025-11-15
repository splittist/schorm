# schorm — Product Requirements Document (PRD, Draft 0.1)

**Tagline**:
A CLI-driven static-site-style authoring tool for SCORM 2004 content packages.

## 1. Purpose & Vision

schorm aims to provide a developer-friendly, LLM-friendly, and version-control-friendly way to create SCORM 2004-compliant e-learning courses without the complexity of GUI-based CMS systems (e.g., Adapt Authoring).

Instead of a visual CMS, schorm treats SCORM content as a static site:
- Markdown for lessons
- YAML/JSON for quizzes & metadata
- A clean template system for HTML output
- A small JS runtime to handle SCORM calls

This makes it ideal for:
- integration with AI content agents
- rapid authoring workflows
- Git-based collaboration
- deterministic, reproducible builds
- transparent course structure & version history

## 2. Target Users
- Developers building LMS content pipelines
- Instructional designers comfortable with Markdown
- Legal/ops teams integrating structured training modules
- LLM agents and agent-based pipelines that need strict schemas
- Any team needing a lightweight alternative to enterprise SCORM tooling

## 3. Non-Goals

schorm does not aim to be:
- a multi-user CMS
- a drag-and-drop WYSIWYG editor
- a full adaptive learning system
- a full SCORM 2004 sequencing engine (narrow subset only at MVP)

## 4. Core Principles
	1.	**CLI-first, File-first**
Everything lives in files (Markdown, YAML, HTML templates).
Builds run from a deterministic CLI.
	2.	**Static-site mental model**
schorm functions like Hugo/MkDocs for SCORM packages.
	3.	**Minimal SCORM 2004 subset**
Basic sequencing only; no full complex sequencing tree.
	4.	**Strict schemas → LLM-friendly**
Exportable JSON Schemas for content types.
	5.	**Runtime simplicity**
HTML templates + small JS for SCORM API integration.
Playback UI lives inside schorm, not LMS.

5. **High-Level Architecture**

```
project/
  schorm.config.yml         # global config
  course.yml                # course structure
  content/                  # Markdown lessons
  quizzes/                  # YAML quiz specs
  media/                    # images, audio, video
  theme/
    layouts/*.html          # Handlebars templates
    partials/*.html
    assets/*                # CSS + runtime JS
  build/                    # build output
```

schorm pipeline:

Parse Source → Internal Model → Template Render → SCORM Manifest → Package

## 6. Features (MVP)

### 6.1 CLI Commands

**Required for MVP**
- `schorm init`
Create new project structure.
- `schorm new <type>`
Scaffold modules, lessons, quizzes.
- `schorm build`
Render HTML, compile manifest, copy media.
- `schorm preview`
Local webserver + mock SCORM runtime.
- `schorm package`
ZIP build output into SCORM 2004 package.
- `schorm validate`
Validate manifest structure & cross-reference correctness.

**Planned Post-MVP**
- `schorm lint` (content/style rules)
- `schorm schema` (generate JSON schemas for agents)
- `schorm graph` (course graph output)
- `schorm doctor` (environment checks)
- `schorm clean`

## 7. Content Authoring Model

### 7.1 Lessons (Markdown)

Each `.md` file contains:
- frontmatter (YAML block)
- markdown body → converted to HTML
- auto-detected media references

Example:

```yml
---
id: m1-intro
title: "The Buyer-Seller Relationship"
module: m1
---
# The Buyer-Seller Relationship

![Meeting](../media/m1/seller-meeting.jpg)

{{audio src="../media/m1/intro.mp3" title="Welcome Introduction"}}
```

### 7.2 Quizzes (YAML)

Strongly typed schema:

```yml
id: m1-quiz
module: m1
title: "Intro Quiz"
questions:
  - id: q1
    type: single-choice
    prompt: "Who owes…"
    options:
      - id: a
        text: "The buyer"
      - id: b
        text: "The seller"
    correct: b
```

### 7.3 Course Structure (YAML)

Defines modules and SCO order:

```yml
id: whiterock-onboarding
language: en
scorm_version: "2004-4th"

modules:
  - id: m1
    title: "Introduction"
    items:
      - m1-intro
      - m1-quiz
```

## 8. Templating System

### 8.1 Choice

Handlebars is the templating engine.

Rationale:
- logic-minimal
- stable
- familiar
- works in Node, Rust, Go
- agent-friendly
- supports partials

### 8.2 Theme Structure

```
theme/
  layouts/
    lesson.html
    quiz.html
    base.html
  partials/
    header.html
    footer.html
    media-block.html
  assets/
    styles.css
    schorm-runtime.js
```

### 8.3 Rendering Mechanism
- content/*.md → HTML body → inserted via {{{content}}}
- layout selection based on content type
- partials for headers, footers, media blocks

Example:

```
{{#> base }}
  {{#*inline "body"}}
    <article>
      <h1>{{title}}</h1>
      {{{content}}}
    </article>
  {{/inline}}
{{/base}}
```

## 9. Media Handling

### 9.1 Authoring
- Markdown images: `![alt](../media/m1/image.jpg)`
- Shortcodes:

```
{{audio src="../media/m1/intro.mp3"}}
{{video src="../media/m1/owner-interview.mp4" poster="../media/m1/thumb.jpg"}}
```

### 9.2 Build Behaviour
- Copy /media → /build/media
- Parse & track all referenced media
- Inject into manifest as `<file href=… />`
- Warnings for broken references

### 9.3 Playback
- schorm runtime JS provides playback hooks
- LMS provides no media player UI


## 10. SCORM Behaviour (Subset)

### 10.1 Required Runtime Calls
- Initialize("")
- SetValue("cmi.location"…)
- SetValue("cmi.completion_status"…)
- SetValue("cmi.success_status"…)
- Commit("")
- Terminate("")

### 10.2 Sequencing (minimal viable support)
- Default sequencing if none configured
- Optional simple rules:
  - linear progression
  - quiz-gated progression
  - “unlock next item on completion”

These compile to minimal `<imsss:sequencing>` snippets.

## 11. schorm Runtime JS

Functions provided:

```js
schormRuntime.initializeSco()
schormRuntime.markScoComplete()
schormRuntime.mediaCompleted(id)
schormRuntime.quizPassed(score)
```

Other capabilities:
- event listeners for media ended
- localStorage fallback for preview mode
- clean logging & error surface

## 12. Preview Mode

`schorm preview`:
- Serves build/ via local HTTP server
- Injects mock SCORM API (window.API_1484_11)
- Logs SCORM calls to console
- Enables instant iteration

**Key property**:
No LMS required during development.

## 13. Packaging

`schorm package`:
- Runs build and validate
- Creates ZIP with:
  - imsmanifest.xml
  - all SCO HTML pages
  - media files
  - theme assets
  - JS runtime

Should be immediately importable into SCORM Cloud, Moodle, Cornerstone, and Docebo.

## 14. Validation

`schorm validate` checks:
- imsmanifest.xml well-formed
- All `<resource>` files exist
- No missing or circular references in modules
- Media files actually present
- Optional LMS profile rules (later)

Outputs both human-readable and machine-readable (--json) modes.

## 15. LLM Integration

### 15.1 JSON Schemas

Generated via `schorm schema`, covering:
- course.yml
- lesson frontmatter
- quiz YAML
- media configuration (optional)

### 15.2 Agent Workflows

Agents can:
	1.	Read schemas
	2.	Generate/update Markdown/YAML
	3.	Run schorm build
	4.	Parse schorm validate --json errors
	5.	Fix issues → repeat

Everything takes place over files → perfect for automation.

## 16. Roadmap (Short-Term)

v0.1 – Skeleton CLI
- init, build, preview, package

v0.2 – Content Scaffolding
- new lesson, new quiz, media shortcodes

v0.3 – Validation
- Manifest structure checks
- Media integrity checks

v0.4 – Minimal Sequencing
- Linear & quiz-gated

v0.5 – LLM Tooling
- schorm schema
- schorm graph
- JSON outputs for errors

## 17. Open Questions (for next iteration)
- Should schorm support external media URLs in v0?
- Should we add a minimal theme gallery, or assume one default theme?
- How much SCORM metadata should we auto-generate (duration, description, etc.)?
	•	Should we add support for tracking media progress (e.g. 80% watched)?
	•	Do we support multi-SCO per HTML file in later versions?
