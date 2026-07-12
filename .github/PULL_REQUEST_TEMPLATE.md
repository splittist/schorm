## What & why

<!-- What does this change do, and what problem does it solve? -->

## Checklist

- [ ] `npm run lint && npm run format:check && npm run typecheck && npm run build && npm test` pass locally
- [ ] If a file format changed (course.yml, frontmatter, quiz YAML, config): the matching schema in `schemas/` is updated
- [ ] If user-facing behavior changed: the relevant docs page and CHANGELOG are updated
- [ ] New behavior is covered by tests (test-file directories follow the per-file isolation convention)
