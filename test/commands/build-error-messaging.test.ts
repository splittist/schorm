import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm build error messaging', () => {
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

  it('should show human-readable error for missing frontmatter field', () => {
    const projectName = 'missing-frontmatter';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson missing id field
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
title: "Introduction"
module: m1
---

# Introduction
Test lesson.
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

    // Run build - should fail with clear error
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      
      // Check for error code
      expect(stderr).toContain('E-LESSON-PARSE');
      
      // Check for file path
      expect(stderr).toMatch(/intro\.md/);
      
      // Check for clear message
      expect(stderr).toContain('frontmatter missing required field "id"');
    }
  });

  it('should output JSON format when --json flag is used', () => {
    const projectName = 'json-output';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson missing id field
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
title: "Introduction"
module: m1
---

# Introduction
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

    // Run build with --json flag
    try {
      execSync(`${CLI_PATH} build --json`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const output = error.stdout || '';
      
      // Parse JSON output
      const result = JSON.parse(output);
      
      // Verify JSON structure
      expect(result).toHaveProperty('ok', false);
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Verify error structure
      const firstError = result.errors[0];
      expect(firstError).toHaveProperty('code');
      expect(firstError).toHaveProperty('message');
      expect(firstError).toHaveProperty('severity');
      expect(firstError.code).toBe('E-LESSON-PARSE');
    }
  });

  it('should show success summary in human-readable format', () => {
    const projectName = 'success-summary';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a valid lesson
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
Test lesson.
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

    // Run build - should succeed
    const output = execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // Verify success message
    expect(output).toContain('Build completed successfully');
    expect(output).toContain('Modules: 1');
    expect(output).toContain('Lessons: 1');
    expect(output).toContain('Media files: 0');
    expect(output).toContain('Output:');
  });

  it('should output JSON format on success when --json flag is used', () => {
    const projectName = 'json-success';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a valid lesson
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

    // Run build with --json flag
    const output = execSync(`${CLI_PATH} build --json`, {
      cwd: projectPath,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // Parse JSON output
    const result = JSON.parse(output);

    // Verify JSON structure
    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('summary');
    expect(result.errors).toHaveLength(0);
    
    // Verify summary
    expect(result.summary).toHaveProperty('modules', 1);
    expect(result.summary).toHaveProperty('lessons', 1);
    expect(result.summary).toHaveProperty('media', 0);
    expect(result.summary).toHaveProperty('outputDir');
  });

  it('should continue building other lessons when one fails', () => {
    const projectName = 'partial-failure';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with valid frontmatter
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'good.md'),
      `---
id: m1-good
title: "Good Lesson"
module: m1
---

# Good Lesson
This is valid.
`
    );

    // Create a lesson with invalid frontmatter
    fs.writeFileSync(
      path.join(lessonDir, 'bad.md'),
      `---
title: "Bad Lesson"
module: m1
---

# Bad Lesson
Missing id.
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
          items: ['m1-good', 'm1-bad'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run build - should fail but process both lessons
    try {
      execSync(`${CLI_PATH} build --json`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const output = error.stdout || '';
      const result = JSON.parse(output);

      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check that the error mentions the bad lesson
      const errorMessages = result.errors.map((e: any) => e.message).join(' ');
      expect(errorMessages).toContain('bad.md');
      
      // The good lesson should have been built
      const buildDir = path.join(projectPath, 'build');
      expect(fs.existsSync(path.join(buildDir, 'm1-good.html'))).toBe(true);
    }
  });

  it('should show clear error for missing config file', () => {
    const projectName = 'no-config';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create minimal directory without config
    fs.mkdirSync(projectPath, { recursive: true });
    
    // Create course.yml
    const courseConfig = {
      id: projectName,
      title: projectName,
      modules: [],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run build - should fail with clear error
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      
      expect(stderr).toContain('E-CONFIG-LOAD');
      expect(stderr).toContain('schorm.config.yml');
    }
  });

  it('should show clear error for missing course.yml', () => {
    const projectName = 'no-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create minimal directory with config but no course.yml
    fs.mkdirSync(projectPath, { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'schorm.config.yml'),
      yaml.stringify({
        scorm_version: '2004-4th',
        theme: 'theme',
      })
    );

    // Run build - should fail with clear error
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      
      expect(stderr).toContain('E-COURSE-LOAD');
      expect(stderr).toContain('course.yml');
    }
  });
});
