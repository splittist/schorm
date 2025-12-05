import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm build sequencing integration', () => {
  beforeEach(() => {
    // Create test output directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test output directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should build a course with linear sequencing', () => {
    const projectName = 'linear-seq-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create project directory structure
    fs.mkdirSync(projectPath, { recursive: true });

    // Create schorm.config.yml
    fs.writeFileSync(
      path.join(projectPath, 'schorm.config.yml'),
      yaml.stringify({
        scorm_version: '2004-4th',
        theme: path.join(__dirname, '..', '..', 'theme-default'),
      })
    );

    // Create lesson directory
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });

    // Create lessons
    fs.writeFileSync(
      path.join(lessonDir, 'lesson1.md'),
      `---
id: m1-l1
title: "Lesson 1"
module: m1
---

# Lesson 1
First lesson content.
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'lesson2.md'),
      `---
id: m1-l2
title: "Lesson 2"
module: m1
---

# Lesson 2
Second lesson content.
`
    );

    // Create course.yml with linear sequencing
    const courseConfig = {
      id: projectName,
      title: 'Linear Sequencing Test',
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-l1', 'm1-l2'],
          sequencing: {
            mode: 'linear',
          },
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Create empty quizzes directory to prevent warnings
    fs.mkdirSync(path.join(projectPath, 'quizzes'), { recursive: true });

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify manifest was created
    const manifestPath = path.join(projectPath, 'build', 'imsmanifest.xml');
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Verify manifest contains sequencing
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    expect(manifest).toContain('imsss:sequencing');
    expect(manifest).toContain('imsss:controlMode');
    expect(manifest).toContain('flow="true"');
    expect(manifest).toContain('forwardOnly="true"');
  });

  it('should build a course with quiz-gated sequencing', () => {
    const projectName = 'gated-seq-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create project directory structure
    fs.mkdirSync(projectPath, { recursive: true });

    // Create schorm.config.yml
    fs.writeFileSync(
      path.join(projectPath, 'schorm.config.yml'),
      yaml.stringify({
        scorm_version: '2004-4th',
        theme: path.join(__dirname, '..', '..', 'theme-default'),
      })
    );

    // Create lesson directory
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });

    // Create lessons
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
---

# Introduction
Before the quiz.
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'advanced.md'),
      `---
id: m1-advanced
title: "Advanced Content"
module: m1
---

# Advanced Content
After the quiz.
`
    );

    // Create quiz
    const quizzesDir = path.join(projectPath, 'quizzes');
    fs.mkdirSync(quizzesDir, { recursive: true });
    fs.writeFileSync(
      path.join(quizzesDir, 'm1-quiz.yml'),
      yaml.stringify({
        id: 'm1-quiz',
        module: 'm1',
        title: 'Gate Quiz',
        passing_score: 0.8,
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'Test question?',
            options: [
              { id: 'a', text: 'Wrong' },
              { id: 'b', text: 'Correct' },
            ],
            correct: 'b',
          },
        ],
      })
    );

    // Create course.yml with quiz-gated sequencing
    const courseConfig = {
      id: projectName,
      title: 'Quiz-Gated Test',
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-intro', 'm1-quiz', 'm1-advanced'],
          sequencing: {
            mode: 'linear',
            gate: {
              quiz: 'm1-quiz',
            },
          },
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify manifest was created
    const manifestPath = path.join(projectPath, 'build', 'imsmanifest.xml');
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Verify manifest contains sequencing
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    
    // Should have sequencing elements
    expect(manifest).toContain('imsss:sequencing');
    
    // Should have objectives
    expect(manifest).toContain('imsss:objectives');
    expect(manifest).toContain('imsss:primaryObjective');
    
    // Should have the global objective for the gate
    expect(manifest).toContain('m1-gate-passed');
    
    // Should have mapInfo for writing to global objective
    expect(manifest).toContain('imsss:mapInfo');
    expect(manifest).toContain('writeSatisfiedStatus="true"');
    
    // Should have precondition rules for items after the quiz
    expect(manifest).toContain('imsss:sequencingRules');
    expect(manifest).toContain('imsss:preConditionRule');
    expect(manifest).toContain('action="disabled"');
  });

  it('should build a course without sequencing when not configured', () => {
    const projectName = 'no-seq-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create project directory structure
    fs.mkdirSync(projectPath, { recursive: true });

    // Create schorm.config.yml
    fs.writeFileSync(
      path.join(projectPath, 'schorm.config.yml'),
      yaml.stringify({
        scorm_version: '2004-4th',
        theme: path.join(__dirname, '..', '..', 'theme-default'),
      })
    );

    // Create lesson directory
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });

    // Create lessons
    fs.writeFileSync(
      path.join(lessonDir, 'lesson1.md'),
      `---
id: m1-l1
title: "Lesson 1"
module: m1
---

# Lesson 1
Content.
`
    );

    // Create course.yml without sequencing
    const courseConfig = {
      id: projectName,
      title: 'No Sequencing Test',
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-l1'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Create empty quizzes directory
    fs.mkdirSync(path.join(projectPath, 'quizzes'), { recursive: true });

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify manifest was created
    const manifestPath = path.join(projectPath, 'build', 'imsmanifest.xml');
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Verify manifest does NOT contain sequencing elements
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    expect(manifest).not.toContain('imsss:sequencing');
    expect(manifest).not.toContain('imsss:controlMode');
  });

  it('should build a course with scenario mode looking in module subdirectory', () => {
    const projectName = 'scenario-subdir-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create project directory structure
    fs.mkdirSync(projectPath, { recursive: true });

    // Create schorm.config.yml
    fs.writeFileSync(
      path.join(projectPath, 'schorm.config.yml'),
      yaml.stringify({
        scorm_version: '2004-4th',
        theme: path.join(__dirname, '..', '..', 'theme-default'),
      })
    );

    // Create lesson directory in module subdirectory (content/email-scenario)
    const lessonDir = path.join(projectPath, 'content', 'email-scenario');
    fs.mkdirSync(lessonDir, { recursive: true });

    // Create scenario files
    fs.writeFileSync(
      path.join(lessonDir, 'the-incident.md'),
      `---
id: the-incident
title: The Incident
module: email-scenario
---

# The Incident

You just sent an email to the wrong person!

## What do you do?

- [Try to recall the message](recall-attempt.md)
- [Own the mistake immediately](owning-it.md)
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'recall-attempt.md'),
      `---
id: recall-attempt
title: The Recall Attempt
module: email-scenario
ending: true
---

# Recall Attempt

You tried to recall the message.
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'owning-it.md'),
      `---
id: owning-it
title: Owning It
module: email-scenario
ending: true
---

# Owning It

You owned your mistake.
`
    );

    // Create course.yml with scenario mode
    const courseConfig = {
      id: projectName,
      title: 'Scenario Test',
      modules: [
        {
          id: 'email-scenario',
          title: 'Email Crisis Management',
          items: [],
          sequencing: {
            mode: 'scenario',
            scenario: {
              start: 'the-incident.md',
            },
          },
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Create empty quizzes directory
    fs.mkdirSync(path.join(projectPath, 'quizzes'), { recursive: true });

    // Run build
    const output = execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    // Verify build succeeded with scenario scenes
    expect(output).toContain('Building scenario graph for module "email-scenario"');
    expect(output).toContain('Found 3 scenes');
    expect(output).toContain('2 endings');
    expect(output).toContain('the-incident.html (scenario)');
    expect(output).toContain('recall-attempt.html (scenario)');
    expect(output).toContain('owning-it.html (scenario)');

    // Verify manifest was created
    const manifestPath = path.join(projectPath, 'build', 'imsmanifest.xml');
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Verify HTML files were created
    expect(fs.existsSync(path.join(projectPath, 'build', 'the-incident.html'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'build', 'recall-attempt.html'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'build', 'owning-it.html'))).toBe(true);
  });
});
