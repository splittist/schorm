import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('Media Shortcodes Integration', () => {
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

  it('should build a course with audio shortcode in lesson', () => {
    const projectName = 'audio-shortcode-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create media file
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'sample.mp3'), 'fake audio content');

    // Create a lesson with audio shortcode
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction with Audio"
module: m1
---

# Introduction

This is a lesson with audio.

{{audio src="../media/m1/sample.mp3" title="Sample Audio"}}

More content here.
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

    // Verify build succeeded
    const buildDir = path.join(projectPath, 'build');
    expect(fs.existsSync(buildDir)).toBe(true);

    // Verify HTML file was created
    const htmlPath = path.join(buildDir, 'm1-intro.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    // Read HTML content
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Verify the shortcode was NOT rendered as raw text
    expect(html).not.toContain('{{audio');
    expect(html).not.toContain('}}');

    // Verify media was rendered (not as placeholder, but as actual media block)
    expect(html).not.toContain('<schorm-media');
    expect(html).toContain('class="media-block audio');
    expect(html).toContain('<audio controls>');
    // Path should be normalized to media/m1/sample.mp3
    expect(html).toContain('src="media/m1/sample.mp3"');

    // Verify other content is still present
    expect(html).toContain('<h1>Introduction</h1>');
    expect(html).toContain('This is a lesson with audio.');
    expect(html).toContain('More content here.');
  });

  it('should build a course with video shortcode including poster', () => {
    const projectName = 'video-shortcode-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create media files
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'video.mp4'), 'fake video content');
    fs.writeFileSync(path.join(mediaDir, 'poster.jpg'), 'fake image content');

    // Create a lesson with video shortcode
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'intro.md'),
      `---
id: m1-intro
title: "Introduction with Video"
module: m1
---

# Video Demo

Watch this video:

{{video src="../media/m1/video.mp4" poster="../media/m1/poster.jpg" title="Demo Video"}}

That's all!
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

    // Verify build succeeded
    const buildDir = path.join(projectPath, 'build');
    const htmlPath = path.join(buildDir, 'm1-intro.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Verify the shortcode was processed
    expect(html).not.toContain('{{video');
    expect(html).not.toContain('<schorm-media');
    expect(html).toContain('class="media-block video');
    expect(html).toContain('<video controls');
    // Paths should be normalized to media/m1/
    expect(html).toContain('poster="media/m1/poster.jpg"');
    expect(html).toContain('src="media/m1/video.mp4"');
  });

  it('should handle multiple media shortcodes in a single lesson', () => {
    const projectName = 'multiple-media-course';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create media files
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'intro.mp3'), 'fake audio 1');
    fs.writeFileSync(path.join(mediaDir, 'demo.mp4'), 'fake video');
    fs.writeFileSync(path.join(mediaDir, 'outro.mp3'), 'fake audio 2');

    // Create a lesson with multiple media shortcodes
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
id: m1-lesson
title: "Multimedia Lesson"
module: m1
---

# Multimedia Lesson

## Introduction Audio

{{audio src="../media/m1/intro.mp3" title="Introduction"}}

## Video Demo

{{video src="../media/m1/demo.mp4" title="Demo"}}

## Conclusion Audio

{{audio src="../media/m1/outro.mp3" title="Conclusion"}}

The end.
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

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify build succeeded
    const buildDir = path.join(projectPath, 'build');
    const htmlPath = path.join(buildDir, 'm1-lesson.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Verify all three shortcodes were processed
    const mediaBlockMatches = html.match(/<div class="media-block/g);
    expect(mediaBlockMatches).toHaveLength(3);

    // Verify no raw shortcode syntax remains
    expect(html).not.toContain('{{audio');
    expect(html).not.toContain('{{video');
    expect(html).not.toContain('}}');
    
    // Verify actual media elements are present
    expect(html).toContain('<audio controls>');
    expect(html).toContain('<video controls');
  });

  it('should preserve markdown formatting around media shortcodes', () => {
    const projectName = 'markdown-media-mix';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create media file
    const mediaDir = path.join(projectPath, 'media', 'm1');
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, 'sample.mp3'), 'fake audio');

    // Create a lesson with mixed markdown and shortcodes
    const lessonDir = path.join(projectPath, 'content', 'm1');
    fs.mkdirSync(lessonDir, { recursive: true });
    fs.writeFileSync(
      path.join(lessonDir, 'lesson.md'),
      `---
id: m1-lesson
title: "Mixed Content"
module: m1
---

# Heading

This is **bold** and this is *italic*.

{{audio src="../media/m1/sample.mp3"}}

- List item 1
- List item 2

[A link](https://example.com)
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

    // Run build
    execSync(`${CLI_PATH} build`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify build succeeded
    const buildDir = path.join(projectPath, 'build');
    const htmlPath = path.join(buildDir, 'm1-lesson.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Verify markdown was properly rendered
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<li>List item 1</li>');
    expect(html).toContain('<li>List item 2</li>');
    expect(html).toContain('<a href="https://example.com">A link</a>');

    // Verify media shortcode was processed
    expect(html).not.toContain('<schorm-media');
    expect(html).not.toContain('{{audio');
    expect(html).toContain('class="media-block audio');
    expect(html).toContain('<audio controls>');
  });
});
