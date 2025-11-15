import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm init command', () => {
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

  it('should create a valid project structure', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Run init command
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Verify directories exist
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'content'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'quizzes'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'media'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'theme'))).toBe(true);

    // Verify config files exist and are valid YAML
    const schormConfigPath = path.join(projectPath, 'schorm.config.yml');
    expect(fs.existsSync(schormConfigPath)).toBe(true);
    const schormConfig = yaml.parse(
      fs.readFileSync(schormConfigPath, 'utf-8')
    );
    expect(schormConfig.scorm_version).toBe('2004-4th');
    expect(schormConfig.theme).toBe('theme');

    const courseConfigPath = path.join(projectPath, 'course.yml');
    expect(fs.existsSync(courseConfigPath)).toBe(true);
    const courseConfig = yaml.parse(
      fs.readFileSync(courseConfigPath, 'utf-8')
    );
    expect(courseConfig.id).toBe(projectName);
    expect(courseConfig.title).toBe(projectName);
    expect(courseConfig.modules).toEqual([]);

    // Verify theme files were copied
    expect(
      fs.existsSync(path.join(projectPath, 'theme', 'layouts', 'base.html'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectPath, 'theme', 'layouts', 'lesson.html'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectPath, 'theme', 'layouts', 'quiz.html'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectPath, 'theme', 'partials', 'header.html'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectPath, 'theme', 'partials', 'footer.html'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectPath, 'theme', 'assets', 'styles.css'))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(projectPath, 'theme', 'assets', 'schorm-runtime.js')
      )
    ).toBe(true);
  });

  it('should use custom title when provided', () => {
    const projectName = 'custom-title-project';
    const projectPath = path.join(TEST_DIR, projectName);
    const customTitle = 'My Custom Course Title';

    execSync(`${CLI_PATH} init ${projectName} --title "${customTitle}"`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.title).toBe(customTitle);
  });

  it('should use custom scorm-version when provided', () => {
    const projectName = 'custom-scorm-project';
    const projectPath = path.join(TEST_DIR, projectName);
    const scormVersion = '1.2';

    execSync(`${CLI_PATH} init ${projectName} --scorm-version "${scormVersion}"`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    const schormConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'schorm.config.yml'), 'utf-8')
    );
    expect(schormConfig.scorm_version).toBe(scormVersion);
  });

  it('should fail when directory already exists', () => {
    const projectName = 'existing-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create project first
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Try to create again without --force
    expect(() => {
      execSync(`${CLI_PATH} init ${projectName}`, {
        cwd: TEST_DIR,
        stdio: 'pipe',
      });
    }).toThrow();

    // Verify directory still exists
    expect(fs.existsSync(projectPath)).toBe(true);
  });

  it('should overwrite when --force flag is used', () => {
    const projectName = 'force-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Create project first
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Add a marker file
    fs.writeFileSync(path.join(projectPath, 'marker.txt'), 'test');

    // Create again with --force
    execSync(`${CLI_PATH} init ${projectName} --force`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Verify project structure exists
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'schorm.config.yml'))).toBe(
      true
    );
  });
});
