# Reply-All Apocalypse - Scenario Example

This example demonstrates Schorm's **scenario mode** - a simplified way to create "choose your own adventure" style courses where learners make decisions and experience consequences.

## What is Scenario Mode?

Scenario mode auto-generates branching SCORM sequencing from markdown content. Instead of manually defining sequencing rules, you simply:

1. Write markdown files with choices as regular links
2. Specify a starting file in `course.yml`
3. Schorm crawls the content graph and builds SCORM sequencing automatically

## How It Works

### Course Configuration

```yaml
modules:
  - id: email-scenario
    title: "Email Crisis Management"
    sequencing:
      mode: scenario
      scenario:
        start: the-incident.md  # Entry point
```

### Content Structure

Each scene is a markdown file with:

- **Frontmatter** defining `id`, `title`, `module`
- **Content** describing the scenario
- **Choices** as standard markdown links to other scenes
- **Endings** marked with `ending: true` and optional `mastery` score

Example scene:

```markdown
---
id: the-incident
title: The Incident
module: email-scenario
---

You just sent an angry email to the client by mistake!

## What do you do?

- [Try to recall the message](recall-attempt.md)
- [Own the mistake immediately](owning-it.md)
```

Example ending:

```markdown
---
id: ending-professional
title: The Professional
module: email-scenario
ending: true
mastery: 1.0  # SCORM score (0.0-1.0)
---

## Good Recovery

You handled the crisis professionally...
```

## Building

```bash
cd examples/reply-all-scenario
schorm build
```

This generates:
- SCORM 2004 package with sequencing rules
- HTML for each scene
- Manifest with objectives and preconditions
- Interactive choice buttons

## Key Features

✅ **No SCORM knowledge required** - Just write markdown  
✅ **Auto-generated sequencing** - Graph crawled from links  
✅ **Mastery scoring** - Each ending can set a completion score  
✅ **LMS-compatible** - Standards-compliant SCORM 2004 4th Edition  
✅ **Preview mode** - Test locally before deploying to LMS

## Scenario Flow

```
the-incident.md
  ├─> recall-attempt.md
  │     ├─> ending-ostrich.md (mastery: 0.4)
  │     └─> ending-damage-control.md (mastery: 0.7)
  ├─> hacker-lie.md
  │     ├─> ending-termination.md (mastery: 0.0)
  │     └─> ending-damage-control.md (mastery: 0.7)
  └─> owning-it.md
        ├─> ending-damage-control.md (mastery: 0.7)
        └─> ending-professional.md (mastery: 1.0)
```

## Comparison to Manual Sequencing

**Old way (manual sequencing):**
```yaml
sequencing:
  mode: free
  branches:
    - id: main-flow
      start: scene1
      choices: [choice1, choice2]
  choices:
    - id: choice1
      from: scene1
      routes:
        - to: scene2a
          condition:
            variable: user.choice
            equals: "option1"
        - to: scene2b
          condition:
            variable: user.choice
            equals: "option2"
```

**New way (scenario mode):**
```yaml
sequencing:
  mode: scenario
  scenario:
    start: scene1.md
```

Then in `scene1.md`:
```markdown
- [Option 1](scene2a.md)
- [Option 2](scene2b.md)
```

The builder automatically:
- Creates SCORM objectives for each choice
- Generates precondition rules
- Wires up navigation
- Sets mastery scores from endings

## Design Principles

1. **Standard Markdown** - Use `[Label](target.md)` syntax, works in any editor
2. **Explicit Endings** - Require `ending: true` frontmatter flag for clarity
3. **Simple Scoring** - One mastery score per ending (not per choice)
4. **Crawl from Root** - Start file defines the entry point, graph auto-discovered

This approach keeps authors focused on storytelling, not SCORM plumbing.
