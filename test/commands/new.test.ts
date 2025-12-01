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
    expect(fs.existsSync(path.join(projectPath, 'media', 'm1'))).toBe(true);
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

describe('schorm new lesson command', () => {
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

  it('should create a new lesson with explicit title', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module first
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create a new lesson
    execSync(`${CLI_PATH} new lesson m1/intro "Introduction"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify lesson file was created in module subdirectory
    const lessonPath = path.join(projectPath, 'content', 'm1', 'intro.md');
    expect(fs.existsSync(lessonPath)).toBe(true);

    // Verify lesson content (no module prefix in id)
    const lessonContent = fs.readFileSync(lessonPath, 'utf-8');
    expect(lessonContent).toContain('id: intro');
    expect(lessonContent).toContain('title: "Introduction"');
    expect(lessonContent).toContain('module: m1');
    expect(lessonContent).toContain('# Introduction');

    // Verify course.yml was updated (no module prefix in items)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toContain('intro');
  });

  it('should create a new lesson with default capitalized title', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module first
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create a new lesson without title
    execSync(`${CLI_PATH} new lesson m1/concepts`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify lesson file was created in module subdirectory
    const lessonPath = path.join(projectPath, 'content', 'm1', 'concepts.md');
    expect(fs.existsSync(lessonPath)).toBe(true);

    // Verify lesson content has capitalized title
    const lessonContent = fs.readFileSync(lessonPath, 'utf-8');
    expect(lessonContent).toContain('title: "Concepts"');
  });

  it('should fail when module does not exist', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Try to create a lesson without creating the module first
    expect(() => {
      execSync(`${CLI_PATH} new lesson m1/intro "Introduction"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Module "m1" not found/);
  });

  it('should fail when missing slash in path', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Try to create a lesson with invalid format
    expect(() => {
      execSync(`${CLI_PATH} new lesson m1-intro "Introduction"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Invalid lesson path format/);
  });

  it('should fail when lesson file already exists', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create a lesson
    execSync(`${CLI_PATH} new lesson m1/intro "Introduction"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Try to create the same lesson again
    expect(() => {
      execSync(`${CLI_PATH} new lesson m1/intro "Introduction Again"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Lesson file already exists/);
  });

  it('should add lesson to module items array', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create multiple lessons
    execSync(`${CLI_PATH} new lesson m1/intro "Introduction"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new lesson m1/concepts "Concepts"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new lesson m1/summary "Summary"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify all lessons were added to the module (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toHaveLength(3);
    expect(courseConfig.modules[0].items).toContain('intro');
    expect(courseConfig.modules[0].items).toContain('concepts');
    expect(courseConfig.modules[0].items).toContain('summary');
  });

  it('should fail when course.yml does not exist', () => {
    const projectPath = path.join(TEST_DIR, 'no-course-project');
    fs.mkdirSync(projectPath, { recursive: true });

    // Try to create a lesson without course.yml
    expect(() => {
      execSync(`${CLI_PATH} new lesson m1/intro "Introduction"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/course\.yml not found/);
  });

  it('should handle lesson IDs with hyphens and underscores', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create lessons with various valid ID formats
    execSync(`${CLI_PATH} new lesson m1/lesson-one "Lesson One"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new lesson m1/lesson_two "Lesson Two"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify lesson files were created in module subdirectory
    expect(fs.existsSync(path.join(projectPath, 'content', 'm1', 'lesson-one.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'content', 'm1', 'lesson_two.md'))).toBe(true);

    // Verify they were added to module (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toContain('lesson-one');
    expect(courseConfig.modules[0].items).toContain('lesson_two');
  });

  it('should fail when lesson ID contains invalid characters', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Try to create a lesson with invalid characters
    expect(() => {
      execSync(`${CLI_PATH} new lesson "m1/lesson with spaces" "Invalid"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Invalid lesson ID/);
  });

  it('should create lessons in multiple modules', () => {
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

    // Create lessons in different modules
    execSync(`${CLI_PATH} new lesson m1/intro "Introduction 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new lesson m2/intro "Introduction 2"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify course.yml (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toContain('intro');
    expect(courseConfig.modules[1].items).toContain('intro');

    // Verify lesson files in module subdirectories
    expect(fs.existsSync(path.join(projectPath, 'content', 'm1', 'intro.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'content', 'm2', 'intro.md'))).toBe(true);
  });
});

describe('schorm new quiz command', () => {
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

  it('should create a new quiz with explicit title', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module first
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create a new quiz
    execSync(`${CLI_PATH} new quiz m1/checkpoint "Checkpoint Quiz"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify quiz file was created in module subdirectory
    const quizPath = path.join(projectPath, 'quizzes', 'm1', 'checkpoint.yml');
    expect(fs.existsSync(quizPath)).toBe(true);

    // Verify quiz content (no module prefix in id)
    const quizContent = fs.readFileSync(quizPath, 'utf-8');
    expect(quizContent).toContain('id: checkpoint');
    expect(quizContent).toContain('title: "Checkpoint Quiz"');
    expect(quizContent).toContain('questions:');
    expect(quizContent).toContain('type: single-choice');

    // Verify course.yml was updated (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toContain('checkpoint');
  });

  it('should create a new quiz with default capitalized title', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module first
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create a new quiz without title
    execSync(`${CLI_PATH} new quiz m1/quiz1`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify quiz file was created in module subdirectory
    const quizPath = path.join(projectPath, 'quizzes', 'm1', 'quiz1.yml');
    expect(fs.existsSync(quizPath)).toBe(true);

    // Verify quiz content has capitalized title
    const quizContent = fs.readFileSync(quizPath, 'utf-8');
    expect(quizContent).toContain('title: "Quiz1"');
  });

  it('should fail when module does not exist', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Try to create a quiz without creating the module first
    expect(() => {
      execSync(`${CLI_PATH} new quiz m1/checkpoint "Checkpoint Quiz"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Module "m1" not found/);
  });

  it('should fail when missing slash in path', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Try to create a quiz with invalid format
    expect(() => {
      execSync(`${CLI_PATH} new quiz m1-checkpoint "Checkpoint Quiz"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Invalid quiz path format/);
  });

  it('should fail when quiz file already exists', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create a quiz
    execSync(`${CLI_PATH} new quiz m1/checkpoint "Checkpoint Quiz"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Try to create the same quiz again
    expect(() => {
      execSync(`${CLI_PATH} new quiz m1/checkpoint "Checkpoint Quiz Again"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Quiz file already exists/);
  });

  it('should add quiz to module items array', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create multiple quizzes
    execSync(`${CLI_PATH} new quiz m1/quiz1 "Quiz 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new quiz m1/quiz2 "Quiz 2"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new quiz m1/final "Final Quiz"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify all quizzes were added to the module (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toHaveLength(3);
    expect(courseConfig.modules[0].items).toContain('quiz1');
    expect(courseConfig.modules[0].items).toContain('quiz2');
    expect(courseConfig.modules[0].items).toContain('final');
  });

  it('should fail when course.yml does not exist', () => {
    const projectPath = path.join(TEST_DIR, 'no-course-project');
    fs.mkdirSync(projectPath, { recursive: true });

    // Try to create a quiz without course.yml
    expect(() => {
      execSync(`${CLI_PATH} new quiz m1/checkpoint "Checkpoint Quiz"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/course\.yml not found/);
  });

  it('should handle quiz IDs with hyphens and underscores', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create quizzes with various valid ID formats
    execSync(`${CLI_PATH} new quiz m1/quiz-one "Quiz One"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new quiz m1/quiz_two "Quiz Two"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify quiz files were created in module subdirectory
    expect(fs.existsSync(path.join(projectPath, 'quizzes', 'm1', 'quiz-one.yml'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'quizzes', 'm1', 'quiz_two.yml'))).toBe(true);

    // Verify they were added to module (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toContain('quiz-one');
    expect(courseConfig.modules[0].items).toContain('quiz_two');
  });

  it('should fail when quiz ID contains invalid characters', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Try to create a quiz with invalid characters
    expect(() => {
      execSync(`${CLI_PATH} new quiz "m1/quiz with spaces" "Invalid"`, {
        cwd: projectPath,
        stdio: 'pipe',
      });
    }).toThrow(/Invalid quiz ID/);
  });

  it('should create quizzes in multiple modules', () => {
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

    // Create quizzes in different modules
    execSync(`${CLI_PATH} new quiz m1/checkpoint "Checkpoint 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new quiz m2/checkpoint "Checkpoint 2"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify course.yml (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toContain('checkpoint');
    expect(courseConfig.modules[1].items).toContain('checkpoint');

    // Verify quiz files in module subdirectories
    expect(fs.existsSync(path.join(projectPath, 'quizzes', 'm1', 'checkpoint.yml'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'quizzes', 'm2', 'checkpoint.yml'))).toBe(true);
  });

  it('should mix lessons and quizzes in the same module', () => {
    const projectName = 'test-project';
    const projectPath = path.join(TEST_DIR, projectName);

    // Initialize project
    execSync(`${CLI_PATH} init ${projectName}`, {
      cwd: TEST_DIR,
      stdio: 'pipe',
    });

    // Create a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Create lessons and quizzes
    execSync(`${CLI_PATH} new lesson m1/intro "Introduction"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new quiz m1/checkpoint "Checkpoint Quiz"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new lesson m1/summary "Summary"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });
    execSync(`${CLI_PATH} new quiz m1/final "Final Quiz"`, {
      cwd: projectPath,
      stdio: 'pipe',
    });

    // Verify all items were added to the module in order (no module prefix)
    const courseConfig = yaml.parse(
      fs.readFileSync(path.join(projectPath, 'course.yml'), 'utf-8')
    );
    expect(courseConfig.modules[0].items).toHaveLength(4);
    expect(courseConfig.modules[0].items[0]).toBe('intro');
    expect(courseConfig.modules[0].items[1]).toBe('checkpoint');
    expect(courseConfig.modules[0].items[2]).toBe('summary');
    expect(courseConfig.modules[0].items[3]).toBe('final');
  });
});
