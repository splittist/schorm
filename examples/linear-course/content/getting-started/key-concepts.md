---
id: key-concepts
title: "Key Concepts"
module: getting-started
objectives:
  - Embed audio with a shortcode
  - Embed images with markdown
duration: 5
---

# Key Concepts

A schorm project is just files: `course.yml` describes the structure,
markdown files hold the lessons, YAML files hold the quizzes, and everything
compiles to a SCORM 2004 package you can upload to any compliant LMS.

## Embedding media

Audio (and video) use shortcodes. This lesson won't report completion to the
LMS until the narration below has finished playing:

{{audio src="../media/getting-started/narration.wav" title="Narration"}}

Images use standard markdown syntax:

![A diagram placeholder](../media/getting-started/diagram.png)

## What happens at build time

`schorm build` renders this markdown to HTML, copies the media into the
package, tracks it in the SCORM manifest against this lesson, and wires up
the completion tracking automatically.
