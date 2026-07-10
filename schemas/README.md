# schorm JSON Schemas

Machine-readable schemas for every file format a schorm project uses. They are
written for two audiences:

1. **LLMs generating course content.** Paste a schema into a prompt (or run
   `schorm schema <name>` and pipe it) and the model has an accurate,
   self-describing specification of the file it must produce — including, in
   the `description` fields, the cross-reference rules that JSON Schema itself
   cannot express (id uniqueness, answer references, `[[blank]]`/`blanks`
   coupling, sequencing graph constraints).
2. **Editors.** Add a modeline such as
   `# yaml-language-server: $schema=<path-or-url>` to a YAML file and editors
   with the YAML language server validate and autocomplete as you type.

| Schema | Describes | Printed by |
| --- | --- | --- |
| `quiz-schema.json` | Quiz YAML files (`quizzes/**.yml`) | `schorm schema quiz` |
| `course-schema.json` | `course.yml`, including the sequencing/branching DSL | `schorm schema course` |
| `lesson-frontmatter-schema.json` | The YAML frontmatter of lesson markdown files | `schorm schema lesson` |
| `config-schema.json` | `schorm.config.yml` | `schorm schema config` |

## Conventions

- All property names are **snake_case** (`passing_score`, `correct_answers`,
  `shuffle_options`). The TypeScript model uses the same names — there is no
  case mapping anywhere in the pipeline.
- Draft-07, with `$defs` and `const`-discriminated question types.
- Constraints that only the build-time validators can check (e.g. "`correct`
  must reference an existing option id") are stated in `description` text on
  the relevant field. `schorm build` and `schorm validate` enforce them.

## Keeping schemas honest

`test/core/schemas.test.ts` compiles every schema and validates the repo's
example files against them, so a schema that drifts from the validators fails
CI. If you change `src/core/quiz-model.ts`, `src/core/quiz-validator.ts`,
`src/core/course-model.ts` or `src/core/config.ts`, update the matching schema
in the same change.
