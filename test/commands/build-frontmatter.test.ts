import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm build frontmatter validation', () => {
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

  it('should build successfully with valid frontmatter', () => {
    const projectName = 'valid-frontmatter';
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
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
---

# Introduction

This is the introduction lesson.
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

    // Verify build succeeded
    const buildDir = path.join(projectPath, 'build');
    expect(fs.existsSync(buildDir)).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'm1-intro.html'))).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'imsmanifest.xml'))).toBe(true);
  });

  it('should fail build when lesson is missing id field', () => {
    const projectName = 'missing-id';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson missing id
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

    // Run build - should fail
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      expect(stderr).toContain('frontmatter missing required field "id"');
      expect(stderr).toContain('intro.md');
    }
  });

  it('should fail build when lesson is missing title field', () => {
    const projectName = 'missing-title';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson missing title
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
module: m1
---

# Content
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

    // Run build - should fail
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      expect(stderr).toContain('frontmatter missing required field "title"');
      expect(stderr).toContain('intro.md');
    }
  });

  it('should fail build when lesson is missing module field', () => {
    const projectName = 'missing-module';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson missing module
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
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

    // Run build - should fail
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      expect(stderr).toContain('frontmatter missing required field "module"');
      expect(stderr).toContain('intro.md');
    }
  });

  it('should fail build when module reference is invalid', () => {
    const projectName = 'invalid-module-ref';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with non-existent module reference
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: nonexistent
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

    // Run build - should fail
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      expect(stderr).toContain('refers to unknown module "nonexistent"');
      expect(stderr).toContain('intro.md');
    }
  });

  it('should fail build when lesson id has invalid format', () => {
    const projectName = 'invalid-id-format';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with invalid ID (contains spaces)
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: "my lesson"
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
          items: ['my lesson'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run build - should fail
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      expect(stderr).toContain('Invalid lesson ID');
      expect(stderr).toContain('intro.md');
    }
  });

  it('should fail build when type field is present but not "lesson"', () => {
    const projectName = 'invalid-type';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with invalid type
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
type: quiz
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

    // Run build - should fail
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      expect(stderr).toContain('frontmatter "type" must be "lesson"');
      expect(stderr).toContain('intro.md');
    }
  });

  it('should accept lesson with type: lesson', () => {
    const projectName = 'valid-type';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with valid type
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
type: lesson
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

    // Run build - should succeed
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify build succeeded
    const buildDir = path.join(projectPath, 'build');
    expect(fs.existsSync(buildDir)).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'm1-intro.html'))).toBe(true);
  });

  it('should accept lesson with optional order field', () => {
    const projectName = 'valid-order';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson with order
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
order: 1
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

    // Run build - should succeed
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify build succeeded
    const buildDir = path.join(projectPath, 'build');
    expect(fs.existsSync(buildDir)).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'm1-intro.html'))).toBe(true);
  });

  it('should display clear file path in error message', () => {
    const projectName = 'error-message-test';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a lesson in a nested directory with missing id
    const lessonDir = path.join(projectPath, 'content', 'm1', 'subfolder');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
title: "Test Lesson"
module: m1
---

# Test
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
          items: ['m1-lesson'],
        },
      ],
    };
    fs.writeFileSync(
      path.join(projectPath, 'course.yml'),
      yaml.stringify(courseConfig)
    );

    // Run build - should fail with clear file path
    try {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      expect.fail('Build should have failed');
    } catch (error: any) {
      const stderr = error.stderr || error.stdout || '';
      // Should show the file path in the error
      expect(stderr).toMatch(/lesson\.md.*frontmatter missing required field "id"/);
    }
  });
});
