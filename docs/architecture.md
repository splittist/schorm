# schorm Architecture Overview

**Document version**: 0.1
**Status**: Draft
**Scope**: Developer-facing technical architecture of schorm, the CLI-driven static-site generator for SCORM 2004 content.

## 1. Introduction

This document describes the internal architecture of schorm, a command-line tool for building SCORM 2004 e-learning packages from Markdown, YAML, templates, and media files.

schorm is designed around two key ideas:
	1.	Treat SCORM content as a static site.
	2.	Keep the SCORM-specific logic in a thin runtime layer so authors work almost entirely in normal web formats.

The architecture is structured for extensibility, testability, and ease of integration with automated workflows (including LLM-driven content generation).

## 2. High-Level System Design

### 2.1 schorm Build Pipeline (Conceptual)

```txt
Input Files           Course Model        Rendering        SCORM Package
───────────────┐    ┌────────────┐    ┌────────────┐    ┌───────────────┐
course.yml      │    │ Modules     │    │ HTML pages  │    │ imsmanifest.xml│
schorm.config   │ →  │ Lessons     │ →  │ Media assets│ →  │ HTML files      │ → ZIP
Markdown *.md   │    │ Quizzes     │    │ Runtime JS  │    │ Media            │
Quiz YAML *.yml │    │ Metadata    │    │ Templates   │    │ Assets            │
Media files     │    └────────────┘    └────────────┘    └───────────────┘
```

The pipeline consists of:
	1.	Parsing
	2.	Normalisation into a typed internal model
	3.	Rendering via Handlebars templates
	4.	Manifest generation
	5.	Packaging

Each stage is deterministic and testable.

## 3. Repository Layout

Top-level repository structure:

```
schorm/
  src/
    cli.ts
    commands/
    core/
    server/
  theme-default/
    layouts/
    partials/
    assets/
  docs/
    prd.md
    architecture.md
  bin/
    schorm
  package.json
  tsconfig.json
```

Below we describe the major modules.

## 4. CLI Architecture

schorm uses a modular command structure, where each command corresponds to a file in src/commands.

Example:

```
src/commands/init.ts
src/commands/build.ts
src/commands/preview.ts
src/commands/package.ts
src/commands/validate.ts
src/commands/new.ts
```

CLI Entry Point
- src/cli.ts
- Sets up Commander.js
- Registers all commands
- Handles global flags
- Acts as a stable interface for future expansions

**Command Responsibilities**

Each command module:
- exposes a function (e.g., registerInitCommand)
- adds itself to the CLI program
- contains minimal orchestration logic
- delegates real work to services in src/core

This separation allows commands to remain thin wrappers around the core engine.

## 5. Core Modules

All business logic resides in src/core.

### 5.1 core/config.ts
- Loads and validates:
  - schorm.config.yml
  - environment overrides
  - theme config
- Provides defaults for omitted settings.

### 5.2 core/course-model.ts

Defines TypeScript interfaces for the internal representation:
- Course
- Module
- SCO (Sharable Content Object)
- Lesson
- Quiz
- Question
- MediaItem

This is the source of truth for the entire build pipeline.

Also contains functions to:
- load course.yml
- resolve item references
- normalise paths
- detect structural errors

### 5.3 core/markdown.ts
- Parses Markdown using markdown-it
- Processes frontmatter using gray-matter
- Extracts media references (images, audio, video)
- Converts content to HTML blocks for template insertion

### 5.4 core/templates.ts
- Loads Handlebars templates from theme
- Registers helper functions (e.g., eq, json, date)
- Provides:
  - renderLesson(context)
  - renderQuiz(context)
  - renderPage(context)

### 5.5 core/media.ts
- Scans for all referenced media files
- Validates paths
- Copies files to build directory
- Tracks associations between SCOs and specific media files
- Supplies media lists to manifest generation

### 5.6 core/manifest.ts
- Constructs SCORM 2004 imsmanifest.xml
- Handles:
  - Organizations / items
  - Resources
  - File references
  - Optional simple sequencing rules
  - Uses xmlbuilder2 to create canonical XML

## 5.7 core/build.ts

Thin orchestration layer:
- clears/creates build/
- loads config + course model
- processes each SCO
- calls template rendering
- writes output files
- triggers manifest generation
- copies runtime + theme assets

## 6. Preview Server

Located in:
`src/server/preview-server.ts`

**Responsibilities**:
-	Serves the build/ directory over HTTP
-	Injects a mock SCORM 2004 runtime, implementing:
  - Initialize
  - GetValue
  - SetValue
  - Commit
  - Terminate
  - Logs SCORM calls to console for debugging
  - Supports --open flag to launch a browser
  - Supports live rebuild (schorm build --watch) in future versions

This isolates the developer from requiring an LMS during authoring.

## 7. Theme System

Themes live in:

```
theme-default/
  layouts/
    base.html
    lesson.html
    quiz.html
  partials/
    header.html
    footer.html
    media-block.html
  assets/
    styles.css
    schorm-runtime.js
```

### 7.1 Layout Files

Each layout is a Handlebars template with:
- page title
- main content region ({{{content}}})
- optional per-SCO metadata

### 7.2 Partials

Reusable blocks:
- headers & footers
- quiz components
- media embed blocks
- navigation UI

### 7.3 Assets

Theme assets are static:
- CSS
- fonts (optional)
- the runtime JS (see below)

schorm copies them verbatim into the build output.

## 8. Runtime JS Architecture

The schorm runtime lives entirely inside:

`theme-default/assets/schorm-runtime.js`

Its responsibilities:

### 8.1 SCORM API Discovery
- Locate window.API_1484_11
- Handle API discovery across nested frames
- Provide fallback mock API in preview mode

### 8.2 SCORM Call Wrappers
- initializeSco()
- setValue(path, value)
- getValue(path)
- commit()
- completeSco()

These wrappers provide uniform error handling and consistent logging.

### 8.3 Lesson Completion Logic

Attach event listeners for:
- media playback (ended)
- quiz scoring callbacks
- scroll-depth or page-read thresholds (optional future feature)

### 8.4 Extensibility

The runtime is intentionally simple:
- small API surface
- no external JS dependencies
- testable separately from CLI
- replaceable via themes if advanced features are needed

## 9. SCORM 2004 Subset

schorm implements only the essential subset of SCORM 2004:

### 9.1 Mandatory Data Model Elements
- cmi.completion_status
- cmi.success_status
- cmi.score.scaled
- cmi.location
- cmi.suspend_data
- cmi.progress_measure

### 9.2 Sequencing (Minimal)

At MVP:
- default sequencing
- optional linear progression
- quiz-gated progression

These compile to small `imsss:sequencing` blocks.

Complex sequencing (preconditions, rollup rules, non-linear flows) is out of scope.

## 10. Build Output Structure

After schorm build, the output layout is:

```
build/
  index.html
  <sco-id>.html
  assets/
    styles.css
    schorm-runtime.js
  media/
    ... (copied media files)
  imsmanifest.xml
```

The schorm package command then zips this directory into a SCORM-compliant package.

## 11. Data Model Overview

### 11.1 Course Model (simplified)

```ts 
interface Course {
  id: string;
  title: string;
  scormVersion: string;
  modules: Module[];
}

interface Module {
  id: string;
  title: string;
  items: SCORef[];
}

type SCORef = string; // e.g., "m1-intro"
```

## 11.2 SCO Types

```ts 
type SCO = Lesson | Quiz;

interface Lesson {
  type: "lesson";
  id: string;
  title: string;
  module: string;
  html: string;        // rendered Markdown
  media: MediaItem[];
}

interface Quiz {
  type: "quiz";
  id: string;
  title: string;
  module: string;
  questions: 
```

### 11.3 Media Items

```
interface MediaItem {
  id: string;
  type: "image" | "audio" | "video";
  src: string;
  alt?: string;
  poster?: string;
}
```

## 12. Extensibility Strategy

schorm is designed for incremental growth:

**Planned Extensions**
- additional content types (assessments, interactions)
- multi-language courses
- theme packs
- SCORM 1.2 compatibility mode
- xAPI export mode (long-term)

**Extension Mechanisms**
- new templates
- additional core modules
- new CLI commands
- theme-level runtime overrides

The architecture avoids premature complexity while leaving room for growth.

## 13. Design Rationale

Key choices:

### 13.1 Node.js + TypeScript

Chosen for:
- excellent tooling for content processing (Markdown, YAML, HTML)
- fast iteration
- portability
- strong ecosystem support
- easy distribution via npm

### 13.2 Handlebars

Chosen because:
- logic-minimal (prevents template complexity)
- stable syntax
- easy for both humans and LLMs
- supports partials and layouts

### 13.3 File-First Approach
- Perfect for Git workflows
- Easy for automation
- Predictable for builds
- Avoids database complexity

## 14. Future Direction

This architecture scales naturally toward:
- more sophisticated SCORM sequencing
- xAPI-compatible output modes
- auto-generation of courses via LLM workflows
- multi-SCO course packaging
- templated corporate branding themes

The separation between CLI, core logic, templates, and runtime ensures schorm remains maintainable and evolvable.

End of Document

