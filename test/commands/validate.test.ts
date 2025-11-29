import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm validate command', () => {
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

  it('should pass validation for a valid project', () => {
    const projectName = 'valid-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
---

# Introduction

This is a valid lesson.
`
    );

    // Update course.yml
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-intro'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation
    const output = execSync(`${CLI_PATH} validate`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    expect(output).toContain('Validation passed');
  });

  it('should fail validation with unknown item reference', () => {
    const projectName = 'invalid-ref';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create course.yml with reference to non-existent item
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-intro', 'm1-missing'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation (expect failure)
    try {
      execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('E-MODULE-UNKNOWN-ITEM');
      expect(error.stdout.toString()).toContain('m1-missing');
    }
  });

  it('should fail validation with duplicate SCO IDs', () => {
    const projectName = 'duplicate-ids';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create two lessons with the same ID
    const lessonDir = path.join(projectPath, 'content');
    fs.mkdirSync(lessonDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(lessonDir, 'intro1.md'),
      `---
id: m1-intro
title: "Introduction 1"
module: m1
---

# Introduction 1
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'intro2.md'),
      `---
id: m1-intro
title: "Introduction 2"
module: m1
---

# Introduction 2
`
    );

    // Update course.yml
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-intro'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation (expect failure)
    try {
      execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('E-SCO-DUP-ID');
      expect(error.stdout.toString()).toContain('m1-intro');
    }
  });

  it('should fail validation with missing media file', () => {
    const projectName = 'missing-media';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with media reference
    const lessonDir = path.join(projectPath, 'content');
    fs.mkdirSync(lessonDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(lessonDir, 'media-lesson.md'),
      `---
id: m1-media
title: "Media Lesson"
module: m1
---

# Media Lesson

{{audio id="aud1" src="../media/missing.mp3" title="Missing Audio"}}
`
    );

    // Update course.yml
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-media'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation (expect failure)
    try {
      execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('E-MEDIA-MISSING-SRC');
    }
  });

  it('should output JSON format with --json flag', () => {
    const projectName = 'json-output';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create course.yml with an error
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-missing'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation with --json
    try {
      execSync(`${CLI_PATH} validate --json`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      
      // Parse JSON output
      const result = JSON.parse(output);
      expect(result).toHaveProperty('ok');
      expect(result.ok).toBe(false);
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check error structure
      const firstError = result.errors[0];
      expect(firstError).toHaveProperty('code');
      expect(firstError).toHaveProperty('message');
      expect(firstError).toHaveProperty('severity');
    }
  });

  it('should warn about unreferenced SCOs', () => {
    const projectName = 'unreferenced-sco';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create two lessons, but only reference one
    const lessonDir = path.join(projectPath, 'content');
    fs.mkdirSync(lessonDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
---

# Introduction
`
    );

    fs.writeFileSync(
      path.join(lessonDir, 'extra.md'),
      `---
id: m1-extra
title: "Extra Content"
module: m1
---

# Extra Content
`
    );

    // Update course.yml - only reference m1-intro
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-intro'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation (should pass with warnings)
    const output = execSync(`${CLI_PATH} validate`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    expect(output).toContain('Validation passed');
    expect(output).toContain('W-SCO-UNREFERENCED');
    expect(output).toContain('m1-extra');
  });

  it('should validate quiz files', () => {
    const projectName = 'quiz-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a valid quiz using the correct format
    const quizzesDir = path.join(projectPath, 'quizzes');
    fs.mkdirSync(quizzesDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(quizzesDir, 'm1-quiz.yml'),
      `id: m1-quiz
title: "Module 1 Quiz"
module: m1
questions:
  - id: q1
    type: single-choice
    prompt: "What is 2+2?"
    options:
      - id: a
        text: "3"
      - id: b
        text: "4"
      - id: c
        text: "5"
    correct: b
`
    );

    // Update course.yml
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-quiz'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation
    const output = execSync(`${CLI_PATH} validate`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    expect(output).toContain('Validation passed');
  });

  it('should detect duplicate items in a module', () => {
    const projectName = 'dup-items';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson
    const lessonDir = path.join(projectPath, 'content');
    fs.mkdirSync(lessonDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
---

# Introduction
`
    );

    // Update course.yml with duplicate item
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['m1-intro', 'm1-intro'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation (expect failure)
    try {
      execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stdout.toString()).toContain('E-MODULE-DUP-ITEM');
    }
  });

  it('should detect SCO with unknown module reference', () => {
    const projectName = 'unknown-module';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with reference to unknown module
    const lessonDir = path.join(projectPath, 'content');
    fs.mkdirSync(lessonDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m2-intro
title: "Introduction"
module: m2
---

# Introduction
`
    );

    // Update course.yml - only has m1, not m2
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: [],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run validation (expect failure)
    try {
      execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      // The error can be caught either during parsing (E-LESSON-PARSE-ERROR) 
      // or during validation (E-SCO-UNKNOWN-MODULE)
      expect(output).toMatch(/E-(LESSON-PARSE-ERROR|SCO-UNKNOWN-MODULE)/);
      expect(output).toContain('m2');
    }
  });

  describe('Quiz Schema Validation', () => {
    it('should fail validation when quiz has invalid correct option reference', () => {
      const projectName = 'quiz-invalid-ref';
      const projectPath = path.join(TEST_DIR, projectName);

      // Initialize project
      execSync(`${CLI_PATH} init ${projectName}`, {
        cwd: TEST_DIR,
        stdio: 'pipe',
      });

      // Create a quiz with invalid correct option
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });

      fs.writeFileSync(
        path.join(quizzesDir, 'm1-quiz.yml'),
        `id: m1-quiz
title: "Module 1 Quiz"
module: m1
questions:
  - id: q1
    type: single-choice
    prompt: "What is 2+2?"
    options:
      - id: a
        text: "3"
      - id: b
        text: "4"
    correct: z
`
      );

      // Update course.yml
      const courseConfig = {
        id: projectName,
        title: projectName,
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            items: ['m1-quiz'],
          },
        ],
      };
      fs.writeFileSync(
        path.join(projectPath, 'course.yml'),
        yaml.stringify(courseConfig)
      );

      // Run validation (expect failure)
      try {
        execSync(`${CLI_PATH} validate`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        const output = error.stdout.toString();
        expect(output).toContain('E-QUIZ-INVALID_OPTION_REFERENCE');
        expect(output).toContain('does not exist in options');
      }
    });

    it('should fail validation when quiz has unknown question type', () => {
      const projectName = 'quiz-unknown-type';
      const projectPath = path.join(TEST_DIR, projectName);

      // Initialize project
      execSync(`${CLI_PATH} init ${projectName}`, {
        cwd: TEST_DIR,
        stdio: 'pipe',
      });

      // Create a quiz with unknown question type
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });

      fs.writeFileSync(
        path.join(quizzesDir, 'm1-quiz.yml'),
        `id: m1-quiz
title: "Module 1 Quiz"
module: m1
questions:
  - id: q1
    type: unknown-type
    prompt: "What is 2+2?"
`
      );

      // Update course.yml
      const courseConfig = {
        id: projectName,
        title: projectName,
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            items: ['m1-quiz'],
          },
        ],
      };
      fs.writeFileSync(
        path.join(projectPath, 'course.yml'),
        yaml.stringify(courseConfig)
      );

      // Run validation (expect failure)
      try {
        execSync(`${CLI_PATH} validate`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        const output = error.stdout.toString();
        expect(output).toContain('E-QUIZ-UNKNOWN_QUESTION_TYPE');
      }
    });

    it('should fail validation when fill-blank has missing blank definition', () => {
      const projectName = 'quiz-missing-blank';
      const projectPath = path.join(TEST_DIR, projectName);

      // Initialize project
      execSync(`${CLI_PATH} init ${projectName}`, {
        cwd: TEST_DIR,
        stdio: 'pipe',
      });

      // Create a quiz with fill-blank missing blank definition
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });

      fs.writeFileSync(
        path.join(quizzesDir, 'm1-quiz.yml'),
        `id: m1-quiz
title: "Module 1 Quiz"
module: m1
questions:
  - id: q1
    type: fill-blank
    prompt: "Fill in:"
    text: "The answer is [[blank1]] and [[blank2]]."
    blanks:
      - id: blank1
        correct_answers:
          - answer
`
      );

      // Update course.yml
      const courseConfig = {
        id: projectName,
        title: projectName,
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            items: ['m1-quiz'],
          },
        ],
      };
      fs.writeFileSync(
        path.join(projectPath, 'course.yml'),
        yaml.stringify(courseConfig)
      );

      // Run validation (expect failure)
      try {
        execSync(`${CLI_PATH} validate`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        const output = error.stdout.toString();
        expect(output).toContain('E-QUIZ-MISSING_BLANK_IN_TEXT');
        expect(output).toContain('blank2');
      }
    });

    it('should fail validation when matching has invalid premise reference', () => {
      const projectName = 'quiz-matching-invalid';
      const projectPath = path.join(TEST_DIR, projectName);

      // Initialize project
      execSync(`${CLI_PATH} init ${projectName}`, {
        cwd: TEST_DIR,
        stdio: 'pipe',
      });

      // Create a quiz with matching invalid premise reference
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });

      fs.writeFileSync(
        path.join(quizzesDir, 'm1-quiz.yml'),
        `id: m1-quiz
title: "Module 1 Quiz"
module: m1
questions:
  - id: q1
    type: matching
    prompt: "Match:"
    premises:
      - id: p1
        text: "France"
    responses:
      - id: r1
        text: "Paris"
    correct_pairs:
      - premise: p999
        response: r1
`
      );

      // Update course.yml
      const courseConfig = {
        id: projectName,
        title: projectName,
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            items: ['m1-quiz'],
          },
        ],
      };
      fs.writeFileSync(
        path.join(projectPath, 'course.yml'),
        yaml.stringify(courseConfig)
      );

      // Run validation (expect failure)
      try {
        execSync(`${CLI_PATH} validate`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        const output = error.stdout.toString();
        expect(output).toContain('E-QUIZ-INVALID_PREMISE_REFERENCE');
        expect(output).toContain('p999');
      }
    });

    it('should pass validation for a valid quiz with all question types', () => {
      const projectName = 'quiz-valid-all-types';
      const projectPath = path.join(TEST_DIR, projectName);

      // Initialize project
      execSync(`${CLI_PATH} init ${projectName}`, {
        cwd: TEST_DIR,
        stdio: 'pipe',
      });

      // Create a valid quiz with all question types
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });

      fs.writeFileSync(
        path.join(quizzesDir, 'm1-quiz.yml'),
        `id: m1-quiz
title: "Module 1 Quiz"
module: m1
passing_score: 0.8
questions:
  - id: q1
    type: single-choice
    prompt: "What is 2+2?"
    options:
      - id: a
        text: "3"
      - id: b
        text: "4"
    correct: b

  - id: q2
    type: multiple-response
    prompt: "Select prime numbers:"
    options:
      - id: a
        text: "2"
      - id: b
        text: "3"
      - id: c
        text: "4"
    correct:
      - a
      - b

  - id: q3
    type: true-false
    prompt: "The sky is blue."
    correct: true

  - id: q4
    type: fill-blank
    prompt: "Fill in:"
    text: "The capital of France is [[capital]]."
    blanks:
      - id: capital
        correct_answers:
          - Paris
          - paris

  - id: q5
    type: matching
    prompt: "Match:"
    premises:
      - id: p1
        text: "France"
    responses:
      - id: r1
        text: "Paris"
    correct_pairs:
      - premise: p1
        response: r1
`
      );

      // Update course.yml
      const courseConfig = {
        id: projectName,
        title: projectName,
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            items: ['m1-quiz'],
          },
        ],
      };
      fs.writeFileSync(
        path.join(projectPath, 'course.yml'),
        yaml.stringify(courseConfig)
      );

      // Run validation (should pass)
      const output = execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
      });

      expect(output).toContain('Validation passed');
    });

    it('should output quiz validation errors in JSON format', () => {
      const projectName = 'quiz-json-errors';
      const projectPath = path.join(TEST_DIR, projectName);

      // Initialize project
      execSync(`${CLI_PATH} init ${projectName}`, {
        cwd: TEST_DIR,
        stdio: 'pipe',
      });

      // Create an invalid quiz
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });

      fs.writeFileSync(
        path.join(quizzesDir, 'm1-quiz.yml'),
        `id: m1-quiz
title: "Module 1 Quiz"
module: m1
questions:
  - id: q1
    type: single-choice
    prompt: "What?"
    options:
      - id: a
        text: "A"
      - id: b
        text: "B"
    correct: invalid-option
`
      );

      // Update course.yml
      const courseConfig = {
        id: projectName,
        title: projectName,
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            items: ['m1-quiz'],
          },
        ],
      };
      fs.writeFileSync(
        path.join(projectPath, 'course.yml'),
        yaml.stringify(courseConfig)
      );

      // Run validation with --json
      try {
        execSync(`${CLI_PATH} validate --json`, {
          cwd: projectPath,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        const output = error.stdout.toString();

        // Parse JSON output
        const result = JSON.parse(output);
        expect(result.ok).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        // Check error structure
        const quizError = result.errors.find((e: any) =>
          e.code.includes('INVALID_OPTION_REFERENCE')
        );
        expect(quizError).toBeDefined();
        expect(quizError.message).toContain('invalid-option');
        expect(quizError.file).toContain('m1-quiz.yml');
      }
    });
  });
});
