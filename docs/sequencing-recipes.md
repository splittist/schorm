# Sequencing recipes

The sequencing DSL in `course.yml` focuses on a small set of predictable behaviors so authors do not need to know any external standards. Use these copy-pasteable patterns to express navigation rules the manifest generator understands today.

## Recommended: Scenario mode (auto-generated branching)

**New in v0.2:** The simplest way to create branching "choose your own adventure" courses is **scenario mode**. Instead of manually defining sequencing rules, you write markdown files with choices as regular links and Schorm auto-generates the SCORM sequencing.

```yaml
modules:
  - id: crisis-response
    title: "Email Crisis Management"
    items: []  # Auto-populated from markdown graph
    sequencing:
      mode: scenario
      scenario:
        start: the-incident.md  # Entry point
```

Then in your markdown files:

```markdown
---
id: the-incident
title: The Incident
module: crisis-response
---

You just sent an angry email to the client by mistake!

## What do you do?

- [Try to recall the message](recall-attempt.md)
- [Own the mistake immediately](owning-it.md)
```

Ending scenes use frontmatter flags:

```markdown
---
id: ending-success
title: Professional Response
module: crisis-response
ending: true
mastery: 1.0  # SCORM score (0.0-1.0)
---

You handled the crisis professionally. Well done!
```

**What happens automatically:**
- Schorm crawls all markdown files starting from `start`
- Extracts choice links `[Label](target.md)` as navigation options
- Generates SCORM objectives for each choice
- Creates precondition rules to lock scenes until choices are made
- Converts links to interactive buttons in the output
- Sets mastery scores from ending scenes

**Benefits:**
- ✅ No SCORM knowledge required - just write markdown
- ✅ Works in any markdown editor
- ✅ Standard `[link](target)` syntax
- ✅ Graph auto-discovered by crawling
- ✅ Ending-based scoring (simple, clear)

See `examples/reply-all-scenario/` for a complete working example.

---

## Advanced: Manual sequencing (for complex cases)

If you need features not supported by scenario mode (like external variables, LMS profile data, or complex conditional logic), use the manual sequencing DSL below.

## DSL knobs recap

- `mode`: `linear` forces chronological navigation; `free` leaves sequencing off; `scenario` auto-generates from markdown. Omit the block entirely for default free navigation.
- `gate.quiz`: writes and checks a shared completion flag so later items are disabled until the quiz is passed.
- `branches`: named entry points into the routing graph (handy for documentation and for scoping which choices apply to a flow).
- `choices`: rules evaluated at an item that jump to another item or end the attempt. Optional route conditions read course variables and only fire when the variable check is satisfied.

## Recipe: keep a module linear

Force learners to move through items in order, while still allowing LMS next/back buttons:

```yaml
modules:
  - id: onboarding
    title: "Linear orientation"
    items: [intro, safety, wrap-up]
    sequencing:
      mode: linear
```

## Recipe: lock later content until a quiz is passed

Require a quiz before unlocking the debrief. `gate.quiz` both writes the completion flag when passed and marks items that follow the gate in `items` order as disabled until that flag is set:

```yaml
modules:
  - id: m1
    title: "Product walkthrough"
    items: [intro, practice, final-quiz, debrief]
    sequencing:
      mode: linear
      gate:
        quiz: final-quiz
```

Author expectations:
- The gate quiz must appear in `items` and will map its passing score to a shared completion flag.
- Anything after the gate inherits the lock, so learners will see those items greyed out or blocked until the quiz is passed.

## Recipe: branch by learner profile at a fork

Use a named branch plus a choice set to route learners to role-specific lessons. Each route becomes a jump rule on the `from` item. The optional `condition` checks a course variable; make sure something earlier in the course sets that variable to the expected value when the learner profile matches.

```yaml
modules:
  - id: m1
    title: "Role-based onboarding"
    items: [intro, role-briefing, fork-choice, engineer-path, field-path, debrief]
    sequencing:
      branches:
        - id: role-flow
          start: intro
          choices: [role-split]
      choices:
        - id: role-split
          from: fork-choice
          routes:
            - label: "Engineering"
              to: engineer-path
            - label: "Field operations"
              to: field-path
              condition:
                variable: learner.role
                in: [field, responder]
```

Notes:
- Branches and routes must reference item IDs that already exist in `items`.
- Conditions rely on course variables named like `branch-<module>-<variable>-<comparator>`. The runtime does not yet expose a supported helper for setting those variables from lesson content, so treat conditional routes as blocked until that capability is added.

## Recipe: offer an explicit early exit

Add a route with `end: true` to let learners exit the attempt instead of jumping elsewhere.

```yaml
choices:
  - id: early-exit
    from: checkpoint
    routes:
      - label: "Finish now"
        end: true
      - label: "Continue"
        to: next-lesson
```

## Recipe: converge branches after a detour

When multiple routes rejoin the main path, point them at the same target item. Each branch route will jump there regardless of which branch the learner took.

```yaml
choices:
  - id: remediation-split
    from: checkpoint
    routes:
      - label: "Need a refresher"
        to: refresher
      - label: "Skip refresher"
        to: summary
  - id: rejoin
    from: refresher
    routes:
      - label: "Back to summary"
        to: summary
```

Tips:
- Keep the graph acyclic; validation rejects loops like `a -> b -> a`.
- If you want these routes to be part of a documented flow, list the relevant choice IDs under a `branches[].choices` array.
