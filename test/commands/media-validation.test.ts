import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('Media Validation Integration', () => {
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

  it('should validate lesson with markdown image', () => {
    const projectName = 'image-validation';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create media file
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'diagram.png'), 'fake image');

    // Create lesson with markdown image
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
id: m1-lesson
title: "Lesson with Image"
module: m1
---

# Diagram

![Workflow Diagram](../../media/m1/diagram.png)

Some explanation text.
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

    // Run validation (should pass)
    const output = execSync(`${CLI_PATH} validate`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    expect(output).toContain('Validation passed');
  });

  it('should fail validation for missing image file', () => {
    const projectName = 'missing-image';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create lesson with image reference but NO media file
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
id: m1-lesson
title: "Lesson with Missing Image"
module: m1
---

![Missing Diagram](../../media/m1/missing.png)
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

    // Run validation (expect failure)
    try {
      execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain('E-MEDIA-MISSING-SRC');
      expect(output).toContain('m1-lesson');
      expect(output).toContain('media/m1/missing.png');
    }
  });

  it('should fail validation for missing video poster', () => {
    const projectName = 'missing-poster';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create video file but not poster
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'video.mp4'), 'fake video');
    // Note: NOT creating poster.jpg

    // Create lesson with video that has poster
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
id: m1-lesson
title: "Video Lesson"
module: m1
---

{{video src="../../media/m1/video.mp4" poster="../../media/m1/poster.jpg" title="Demo"}}
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

    // Run validation (expect failure)
    try {
      execSync(`${CLI_PATH} validate`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      expect(output).toContain('E-MEDIA-MISSING-POSTER');
      expect(output).toContain('m1-lesson');
      expect(output).toContain('media/m1/poster.jpg');
    }
  });

  it('should validate multiple media types in one lesson', () => {
    const projectName = 'multi-media';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create all media files
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'diagram.png'), 'fake image');
    fs.writeFileSync(path.join(mediaDir, 'audio.mp3'), 'fake audio');
    fs.writeFileSync(path.join(mediaDir, 'video.mp4'), 'fake video');
    fs.writeFileSync(path.join(mediaDir, 'poster.jpg'), 'fake poster');

    // Create lesson with multiple media types
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
id: m1-lesson
title: "Multimedia Lesson"
module: m1
---

# Introduction

![Diagram](../../media/m1/diagram.png)

## Audio Section

{{audio src="../../media/m1/audio.mp3" title="Narration"}}

## Video Section

{{video src="../../media/m1/video.mp4" poster="../../media/m1/poster.jpg" title="Demo"}}
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

    // Run validation (should pass)
    const output = execSync(`${CLI_PATH} validate`, {
      cwd: projectPath,
      encoding: 'utf-8',
    });

    expect(output).toContain('Validation passed');
  });

  it('should output JSON format with media errors', () => {
    const projectName = 'json-media-error';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create lesson with missing media
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
id: m1-lesson
title: "Lesson"
module: m1
---

![Missing](../../media/missing.jpg)
{{audio src="../../media/missing.mp3"}}
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

    // Run validation with --json
    try {
      execSync(`${CLI_PATH} validate --json`, {
        cwd: projectPath,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout.toString();
      
      // Parse JSON output
      const result = JSON.parse(output);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      
      // Check for both media errors
      const mediaErrors = result.errors.filter((e: any) => 
        e.code === 'E-MEDIA-MISSING-SRC'
      );
      expect(mediaErrors.length).toBe(2);
      
      // Verify error structure includes all required fields
      const firstError = mediaErrors[0];
      expect(firstError).toHaveProperty('code');
      expect(firstError).toHaveProperty('message');
      expect(firstError).toHaveProperty('severity');
      expect(firstError).toHaveProperty('scoId');
      expect(firstError).toHaveProperty('file');
      expect(firstError).toHaveProperty('path');
      expect(firstError.scoId).toBe('m1-lesson');
    }
  });

  it('should validate lessons across multiple modules', () => {
    const projectName = 'multi-module-media';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create media for both modules
    const media1Dir = path.join(projectPath, 'media', 'm1');
    const media2Dir = path.join(projectPath, 'media', 'm2');
    fs.mkdirSync(media1Dir, { recursive: true });
    fs.mkdirSync(media2Dir, { recursive: true });
    fs.writeFileSync(path.join(media1Dir, 'img1.png'), 'fake');
    fs.writeFileSync(path.join(media2Dir, 'img2.png'), 'fake');

    // Create lessons in both modules
    const content1Dir = path.join(projectPath, 'content', 'm1');
    const content2Dir = path.join(projectPath, 'content', 'm2');
    fs.mkdirSync(content1Dir, { recursive: true });
    fs.mkdirSync(content2Dir, { recursive: true });
    
    fs.writeFileSync(
      path.join(content1Dir, 'lesson.md'),
      `---
id: m1-lesson
title: "Module 1 Lesson"
module: m1
---

![Image 1](../../media/m1/img1.png)
`
    );

    fs.writeFileSync(
      path.join(content2Dir, 'lesson.md'),
      `---
id: m2-lesson
title: "Module 2 Lesson"
module: m2
---

![Image 2](../../media/m2/img2.png)
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
        {
          id: 'm2',
          title: 'Module 2',
          items: ['m2-lesson'],
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
});
