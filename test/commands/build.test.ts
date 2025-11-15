import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm build command', () => {
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

  it('should build a basic course with one module and one lesson', () => {
    const projectName = 'basic-course';
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

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify build directory exists
    const buildDir = path.join(projectPath, 'build');
    expect(fs.existsSync(buildDir)).toBe(true);

    // Verify HTML file was created
    expect(fs.existsSync(path.join(buildDir, 'm1-intro.html'))).toBe(true);

    // Verify manifest was created
    const manifestPath = path.join(buildDir, 'imsmanifest.xml');
    expect(fs.existsSync(manifestPath)).toBe(true);

    // Verify manifest content
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    expect(manifest).toContain('m1-intro');
    expect(manifest).toContain('Module 1');
    expect(manifest).toContain('ADL SCORM');
    expect(manifest).toContain('2004 4th Edition');

    // Verify assets were copied
    expect(
      fs.existsSync(path.join(buildDir, 'assets', 'schorm-runtime.js'))
    ).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'assets', 'styles.css'))).toBe(
      true
    );
  });

  it('should build a course with multiple lessons', () => {
    const projectName = 'multi-lesson-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create multiple lessons
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });

    fs.writeFileSync(
      path.join(lessonDir, 'lesson1.md'),
      `---
id: m1-l1
title: "Lesson 1"
module: m1
---

# Lesson 1
Content for lesson 1.
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
Content for lesson 2.
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
          items: ['m1-l1', 'm1-l2'],
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

    const buildDir = path.join(projectPath, 'build');

    // Verify both HTML files were created
    expect(fs.existsSync(path.join(buildDir, 'm1-l1.html'))).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'm1-l2.html'))).toBe(true);

    // Verify manifest includes both lessons
    const manifest = fs.readFileSync(
      path.join(buildDir, 'imsmanifest.xml'),
      'utf-8'
    );
    expect(manifest).toContain('m1-l1');
    expect(manifest).toContain('m1-l2');
    expect(manifest).toContain('RES-m1-l1');
    expect(manifest).toContain('RES-m1-l2');
  });

  it('should include learning objectives in rendered HTML', () => {
    const projectName = 'objectives-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create lesson with objectives
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction"
module: m1
objectives:
  - Understand SCORM basics
  - Learn about SCOs
---

# Introduction
This is a lesson with objectives.
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

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    const buildDir = path.join(projectPath, 'build');
    const html = fs.readFileSync(path.join(buildDir, 'm1-intro.html'), 'utf-8');

    // Verify objectives are in HTML
    expect(html).toContain('Learning Objectives');
    expect(html).toContain('Understand SCORM basics');
    expect(html).toContain('Learn about SCOs');
  });

  it('should copy media files to build directory', () => {
    const projectName = 'media-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create media files
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'image.jpg'), 'fake image content');
    fs.writeFileSync(path.join(mediaDir, 'audio.mp3'), 'fake audio content');

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
This lesson has media.
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

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    const buildDir = path.join(projectPath, 'build');

    // Verify media files were copied
    expect(
      fs.existsSync(path.join(buildDir, 'media', 'm1', 'image.jpg'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(buildDir, 'media', 'm1', 'audio.mp3'))
    ).toBe(true);

    // Verify media files are referenced in manifest
    const manifest = fs.readFileSync(
      path.join(buildDir, 'imsmanifest.xml'),
      'utf-8'
    );
    expect(manifest).toContain('media/m1/image.jpg');
    expect(manifest).toContain('media/m1/audio.mp3');
  });

  it('should generate valid SCORM 2004 manifest structure', () => {
    const projectName = 'manifest-test';
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

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    const buildDir = path.join(projectPath, 'build');
    const manifest = fs.readFileSync(
      path.join(buildDir, 'imsmanifest.xml'),
      'utf-8'
    );

    // Verify manifest structure
    expect(manifest).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(manifest).toContain('<manifest');
    expect(manifest).toContain('xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"');
    expect(manifest).toContain('xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"');
    expect(manifest).toContain('<metadata>');
    expect(manifest).toContain('<schema>ADL SCORM</schema>');
    expect(manifest).toContain('<schemaversion>2004 4th Edition</schemaversion>');
    expect(manifest).toContain('<organizations');
    expect(manifest).toContain('<organization');
    expect(manifest).toContain('<item');
    expect(manifest).toContain('<resources>');
    expect(manifest).toContain('<resource');
    expect(manifest).toContain('adlcp:scormType="sco"');
    expect(manifest).toContain('<file href=');
  });

  it('should fail gracefully when config file is missing', () => {
    const projectName = 'no-config';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create minimal directory structure without config
    fs.mkdirSync(projectPath, { recursive: true });

    // Try to build without config
    expect(() => {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should fail gracefully when course.yml is missing', () => {
    const projectName = 'no-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create minimal directory structure with config but no course.yml
    fs.mkdirSync(projectPath, { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'schorm.config.yml'),
      yaml.stringify({
        scorm_version: '2004-4th',
        theme: 'theme',
      })
    );

    // Try to build without course.yml
    expect(() => {
      execSync(`${CLI_PATH} build`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should use custom output directory when specified', () => {
    const projectName = 'custom-output';
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

    // Run build with custom output directory
    const customOutput = 'dist';
    execSync(`${CLI_PATH} build --output ${customOutput}`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify custom output directory was used
    const buildDir = path.join(projectPath, customOutput);
    expect(fs.existsSync(buildDir)).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'm1-intro.html'))).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'imsmanifest.xml'))).toBe(true);
  });
});
