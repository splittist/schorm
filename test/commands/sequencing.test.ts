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

    // Verify manifest structure for scenario
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    
    // Should have sequencing with choice control mode
    expect(manifest).toContain('imsss:sequencing');
    expect(manifest).toContain('choice="true"');
    
    // Should have objectives with proper mapInfo for global objectives
    expect(manifest).toContain('imsss:objectives');
    expect(manifest).toContain('imsss:mapInfo');
    
    // Should have precondition rules for non-start nodes
    expect(manifest).toContain('imsss:preConditionRule');
    
    // Verify generated HTML uses correct runtime API calls
    const scenarioHtml = fs.readFileSync(path.join(projectPath, 'build', 'the-incident.html'), 'utf-8');
    
    // Should use SchormRuntime namespace (not old global functions)
    expect(scenarioHtml).toContain('SchormRuntime.init()');
    expect(scenarioHtml).toContain('SchormRuntime.setValue');
    expect(scenarioHtml).toContain('SchormRuntime.getValue');
    expect(scenarioHtml).toContain('SchormRuntime.commit()');
    expect(scenarioHtml).toContain('SchormRuntime.terminate()');
    
    // Should NOT use old global function names
    expect(scenarioHtml).not.toContain('initializeSco()');
    expect(scenarioHtml).not.toContain('completeSco()');
    
    // Should get objectives count and find next available index
    expect(scenarioHtml).toContain('cmi.objectives._count');
    expect(scenarioHtml).toContain('objectiveIndex');
    
    // Should set objectives using dynamic index variable
    expect(scenarioHtml).toContain('cmi.objectives.\' + objectiveIndex + \'.id');
    expect(scenarioHtml).toContain('cmi.objectives.\' + objectiveIndex + \'.success_status');
    expect(scenarioHtml).toContain('cmi.objectives.\' + objectiveIndex + \'.completion_status');
    
    // Verify ending scene uses runtime API correctly
    const endingHtml = fs.readFileSync(path.join(projectPath, 'build', 'owning-it.html'), 'utf-8');
    expect(endingHtml).toContain('SchormRuntime.commit()');
    expect(endingHtml).toContain('SchormRuntime.terminate()');
  });

  it('should not create duplicate resources for scenario modules', () => {
    const projectName = 'scenario-no-duplicates';
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

    // Create lesson directory in module subdirectory
    const lessonDir = path.join(projectPath, 'content', 'test-scenario');
    fs.mkdirSync(lessonDir, { recursive: true });

    // Create scenario files
    fs.writeFileSync(
      path.join(lessonDir, 'start.md'),
      `---
id: start
title: Start Scene
module: test-scenario
---

# Start

[Go to End](end.md)
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'end.md'),
      `---
id: end
title: End Scene
module: test-scenario
ending: true
---

# End
`
    );

    // Create course.yml with scenario mode
    const courseConfig = {
      id: projectName,
      title: 'No Duplicates Test',
      modules: [
        {
          id: 'test-scenario',
          title: 'Test Scenario',
          items: [],
          sequencing: {
            mode: 'scenario',
            scenario: {
              start: 'start.md',
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
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    // Verify manifest was created
    const manifestPath = path.join(projectPath, 'build', 'imsmanifest.xml');
    const manifest = fs.readFileSync(manifestPath, 'utf-8');

    // Count resource identifiers - should have exactly 3:
    // 1. RES-index
    // 2. RES-start
    // 3. RES-end
    const resourceMatches = manifest.match(/<resource identifier="RES-/g);
    expect(resourceMatches).not.toBeNull();
    expect(resourceMatches!.length).toBe(3);

    // Verify no duplicate identifiers
    expect((manifest.match(/identifier="RES-start"/g) || []).length).toBe(1);
    expect((manifest.match(/identifier="RES-end"/g) || []).length).toBe(1);
  });

  it('should define global objectives properly for scenario preconditions', () => {
    const projectName = 'scenario-objectives';
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

    // Create lesson directory in module subdirectory
    const lessonDir = path.join(projectPath, 'content', 'obj-scenario');
    fs.mkdirSync(lessonDir, { recursive: true });

    // Create scenario files with a choice
    fs.writeFileSync(
      path.join(lessonDir, 'start.md'),
      `---
id: start
title: Start
module: obj-scenario
---

# Start

[Go to middle](middle.md)
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'middle.md'),
      `---
id: middle
title: Middle
module: obj-scenario
ending: true
---

# Middle
`
    );

    // Create course.yml with scenario mode
    const courseConfig = {
      id: projectName,
      title: 'Objectives Test',
      modules: [
        {
          id: 'obj-scenario',
          title: 'Objectives Scenario',
          items: [],
          sequencing: {
            mode: 'scenario',
            scenario: {
              start: 'start.md',
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
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    // Verify manifest was created
    const manifestPath = path.join(projectPath, 'build', 'imsmanifest.xml');
    const manifest = fs.readFileSync(manifestPath, 'utf-8');

    // The source node (start) should have an objective that writes to the global objective
    expect(manifest).toContain('writeSatisfiedStatus="true"');
    
    // The target node (middle) should have an objective that reads from the global objective
    expect(manifest).toContain('readSatisfiedStatus="true"');
    
    // The precondition should reference the read objective
    expect(manifest).toContain('referencedObjective="read_obj_obj-scenario_0"');
    
    // The read objective should be defined in the middle item
    expect(manifest).toContain('objectiveID="read_obj_obj-scenario_0"');
    
    // The local write objective should be defined in the start item
    expect(manifest).toContain('objectiveID="local_obj_obj-scenario_0"');
    
    // Both objectives should map to the same global objective
    expect(manifest).toContain('targetObjectiveID="obj_obj-scenario_0"');
  });
});
