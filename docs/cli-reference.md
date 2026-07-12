# CLI Reference

Every schorm command, flag, and output format. All commands run from the
project root (the directory containing `course.yml`) unless noted.

General:

- `schorm --version` prints the version (read from package.json).
- `schorm --help` / `schorm <command> --help` print usage.
- Commands exit `0` on success and `1` on failure.

---

## `schorm init <project-name>`

Create a new project directory with the default structure (`course.yml`,
`schorm.config.yml`, `content/`, `quizzes/`, `media/`, and a copy of the
default theme in `theme/`).

| Flag | Default | Description |
| --- | --- | --- |
| `--title <title>` | project name | Course title written to `course.yml` |
| `--scorm-version <version>` | `2004-4th` | Target SCORM version. `2004-4th` is currently the only supported value; anything else is rejected |
| `--force` | off | Overwrite an existing directory |

## `schorm new <type> <id> [title]`

Scaffold content. `<type>` is `module`, `lesson`, or `quiz`.

- `schorm new module <module-id> [title]` — adds the module to `course.yml`
  and creates `content/<module-id>/`, `quizzes/<module-id>/`,
  `media/<module-id>/`.
- `schorm new lesson <module-id>/<lesson-id> [title]` — creates
  `content/<module-id>/<lesson-id>.md` with valid frontmatter and appends the
  lesson to the module's `items`. Fails (without leaving files behind) if the
  module doesn't exist.
- `schorm new quiz <module-id>/<quiz-id> [title]` — creates
  `quizzes/<module-id>/<quiz-id>.yml` with a starter question and appends it
  to the module's `items`. Same module-existence check.

Titles default to a capitalized form of the id.

## `schorm build`

Render lessons and quizzes to HTML, copy media and theme assets, and generate
`imsmanifest.xml`.

| Flag | Default | Description |
| --- | --- | --- |
| `-o, --output <dir>` | `build` | Output directory (cleared and recreated) |
| `-c, --config <file>` | `schorm.config.yml` | Config file path |
| `--json` | off | Suppress progress output; print a machine-readable result |

`--json` prints a single JSON object:

```json
{
  "ok": true,
  "errors": [],
  "warnings": [],
  "summary": {
    "modules": 1,
    "lessons": 2,
    "media": 1,
    "outputDir": "/path/to/build",
    "outputSize": 123456
  }
}
```

Errors and warnings are objects with `code` (e.g. `E-QUIZ-...`,
`E-LESSON-PARSE`), `message`, `severity`, and optional `file`/`scoId`/
`moduleId`/`originatingStep`. Error codes are documented in
[errors.md](./errors.md).

## `schorm preview`

Serve a built course locally with a mock SCORM 2004 API injected into every
HTML page, so completion/score/interaction calls can be observed in the
browser console without an LMS.

| Flag | Default | Description |
| --- | --- | --- |
| `-p, --port <port>` | `4173` | Port to listen on |
| `-o, --open` | off | Open the browser automatically |
| `-d, --dir <directory>` | `build` | Directory to serve |

The server only serves files inside the chosen directory (path traversal is
rejected).

## `schorm validate`

Check the project structure, course model, lesson frontmatter, and quiz files
without building.

| Flag | Default | Description |
| --- | --- | --- |
| `--json` | off | Machine-readable output |
| `--debug-validation` | off | Verbose per-check detail |

## `schorm package`

Zip a built course into an LMS-uploadable SCORM package. The whole build
directory is included.

| Flag | Default | Description |
| --- | --- | --- |
| `--source <directory>` | `build` | Build directory to package (match `build --output`) |
| `--out <directory>` | `dist` | Where to write the ZIP |
| `--name <filename>` | `<course-id>-scorm2004` | ZIP filename (`.zip` appended if missing) |
| `--no-validate` | validation on | Skip the pre-flight checks (manifest + HTML present) |

## `schorm schema [name]`

Print a JSON schema on stdout, ready to pipe into an LLM prompt or editor
tooling. With no argument, lists the available schemas.

`name` is one of `quiz`, `course`, `lesson`, `config`. See
[../schemas/README.md](../schemas/README.md).

---

## Planned commands

`schorm lint` (authoring lint rules) and `schorm graph` (course graph export)
are planned but not yet implemented.
