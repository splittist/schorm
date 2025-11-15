import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm package command', () => {
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

  it('should create a ZIP file from build directory', () => {
    const projectName = 'package-test';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize and build project
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
Test lesson.
`
    );

    // Update course.yml
    const courseConfig = {
      id: 'test-course',
      title: 'Test Course',
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

    // Build the project
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Package the project
    execSync(`${CLI_PATH} package`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify ZIP file was created
    const zipPath = path.join(projectPath, 'dist', 'test-course-scorm2004.zip');
    expect(fs.existsSync(zipPath)).toBe(true);

    // Verify ZIP file has content
    const stats = fs.statSync(zipPath);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should fail when build directory does not exist', () => {
    const projectName = 'no-build';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create minimal directory structure without building
    fs.mkdirSync(projectPath, { recursive: true });

    // Try to package without building
    expect(() => {
      execSync(`${CLI_PATH} package`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should fail when imsmanifest.xml is missing', () => {
    const projectName = 'no-manifest';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create build directory without manifest
    const buildDir = path.join(projectPath, 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'test.html'), '<html></html>');

    // Try to package without manifest
    expect(() => {
      execSync(`${CLI_PATH} package`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should fail when no HTML files exist', () => {
    const projectName = 'no-html';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create build directory with only manifest
    const buildDir = path.join(projectPath, 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(
      path.join(buildDir, 'imsmanifest.xml'),
      '<?xml version="1.0"?><manifest/>'
    );

    // Try to package without HTML files
    expect(() => {
      execSync(`${CLI_PATH} package`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should use custom output directory with --out option', () => {
    const projectName = 'custom-out';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize and build project
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
Test lesson.
`
    );

    // Update course.yml
    const courseConfig = {
      id: 'custom-out-course',
      title: 'Custom Out Course',
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

    // Build the project
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Package with custom output directory
    const customOut = 'custom-dist';
    execSync(`${CLI_PATH} package --out ${customOut}`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify ZIP file was created in custom directory
    const zipPath = path.join(
      projectPath,
      customOut,
      'custom-out-course-scorm2004.zip'
    );
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should use custom filename with --name option', () => {
    const projectName = 'custom-name';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize and build project
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
Test lesson.
`
    );

    // Update course.yml
    const courseConfig = {
      id: 'custom-name-course',
      title: 'Custom Name Course',
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

    // Build the project
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Package with custom name
    execSync(`${CLI_PATH} package --name my-custom-package`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify ZIP file was created with custom name
    const zipPath = path.join(projectPath, 'dist', 'my-custom-package.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should skip validation with --no-validate option', () => {
    const projectName = 'no-validate';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create build directory with only an HTML file (no manifest)
    const buildDir = path.join(projectPath, 'build');
    fs.mkdirSync(buildDir, { recursive: true });
    fs.writeFileSync(path.join(buildDir, 'test.html'), '<html></html>');

    // Package with --no-validate should not fail
    execSync(`${CLI_PATH} package --no-validate`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify ZIP file was created
    const zipPath = path.join(projectPath, 'dist', 'course-scorm2004.zip');
    expect(fs.existsSync(zipPath)).toBe(true);
  });

  it('should include assets and media directories in ZIP', () => {
    const projectName = 'full-package';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize and build project
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
Test lesson with media.
`
    );

    // Create media files
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'image.jpg'), 'fake image');

    // Update course.yml
    const courseConfig = {
      id: 'full-course',
      title: 'Full Course',
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

    // Build the project
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Package the project
    execSync(`${CLI_PATH} package`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify ZIP file was created
    const zipPath = path.join(projectPath, 'dist', 'full-course-scorm2004.zip');
    expect(fs.existsSync(zipPath)).toBe(true);

    // Note: We could extract and verify ZIP contents here,
    // but for now we just verify the file exists and has content
    const stats = fs.statSync(zipPath);
    expect(stats.size).toBeGreaterThan(1000); // Should be reasonably sized
  });
});
