import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

const CLI_PATH = path.join(__dirname, '..', '..', 'bin', 'schorm');
const TEST_DIR = path.join(__dirname, '..', '..', 'test-output');

describe('schorm new module command', () => {
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

  it('should create a new module with explicit title', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a new module
    execSync(`${CLI_PATH} new module m1 "Getting Started"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify course.yml was updated
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules).toHaveLength(1);
    expect(courseConfig.modules[0]).toEqual({
      id: 'm1',
      title: 'Getting Started',
      items: [],
    });

    // Verify directories were created
    expect(fs.existsSync(path.join(projectPath, 'content', 'm1'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'quizzes', 'm1'))).toBe(true);
  });

  it('should create a new module with default capitalized title', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a new module without title
    execSync(`${CLI_PATH} new module m2`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify course.yml was updated with capitalized title
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules).toHaveLength(1);
    expect(courseConfig.modules[0]).toEqual({
      id: 'm2',
      title: 'M2',
      items: [],
    });
  });

  it('should handle module IDs with hyphens and underscores', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create modules with various valid ID formats
    execSync(`${CLI_PATH} new module module-one "Module One"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new module module_two "Module Two"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new module ModuleThree "Module Three"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify all modules were added
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules).toHaveLength(3);
    expect(courseConfig.modules[0].id).toBe('module-one');
    expect(courseConfig.modules[1].id).toBe('module_two');
    expect(courseConfig.modules[2].id).toBe('ModuleThree');
  });

  it('should fail when module ID already exists', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "First Module"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Try to create the same module again
    expect(() => {
      execSync(`${CLI_PATH} new module m1 "Duplicate Module"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/already exists/);

    // Verify only one module exists
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules).toHaveLength(1);
    expect(courseConfig.modules[0].title).toBe('First Module');
  });

  it('should fail when course.yml does not exist', () => {
    const projectPath = path.join(TEST_DIR, 'no-course-project');
    fs.mkdirSync(projectPath, { recursive: true });

    // Try to create a module without course.yml
    expect(() => {
      execSync(`${CLI_PATH} new module m1 "Test Module"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/course\.yml not found/);
  });

  it('should fail when module ID contains invalid characters', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Try to create a module with invalid characters
    expect(() => {
      execSync(`${CLI_PATH} new module "m1 with spaces" "Invalid Module"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Invalid module ID/);

    expect(() => {
      execSync(`${CLI_PATH} new module "m1@special" "Invalid Module"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Invalid module ID/);
  });

  it('should preserve existing modules when adding a new one', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create multiple modules
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new module m2 "Module 2"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new module m3 "Module 3"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify all modules exist
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules).toHaveLength(3);
    expect(courseConfig.modules[0].id).toBe('m1');
    expect(courseConfig.modules[1].id).toBe('m2');
    expect(courseConfig.modules[2].id).toBe('m3');
  });

  it('should not create directories if module already exists', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "First Module"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Add a marker file to the content directory
    fs.writeFileSync(
      path.join(projectPath, 'content', 'm1', 'marker.txt'),
      'test'
    );

    // Try to create the same module again
    expect(() => {
      execSync(`${CLI_PATH} new module m1 "Duplicate Module"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow();

    // Verify marker file still exists (directories weren't recreated)
    expect(
      fs.existsSync(path.join(projectPath, 'content', 'm1', 'marker.txt'))
    ).toBe(true);
  });

  it('should leave existing directories unchanged', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Pre-create the directories with content
    fs.mkdirSync(path.join(projectPath, 'content', 'm1'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'quizzes', 'm1'), { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, 'content', 'm1', 'existing.md'),
      'existing content'
    );

    // Create the module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify existing file still exists
    expect(
      fs.existsSync(path.join(projectPath, 'content', 'm1', 'existing.md'))
    ).toBe(true);
    expect(
      fs.readFileSync(path.join(projectPath, 'content', 'm1', 'existing.md'), 'utf-8')
    ).toBe('existing content');
  });
});
