import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.resolve('test-output');
const CLI_PATH = path.resolve('bin/schorm');

describe('Fill-in-the-Blank Question Tests', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should build a course with a single-blank fill-in question', () => {
    const projectPath = path.join(TEST_DIR, 'single-blank-test');
    
    // Initialize project
    execSync(`${CLI_PATH} init single-blank-test`, { cwd: TEST_DIR });
    
    // Add a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    // Create a quiz with single fill-blank question
    const quizContent = `id: single-blank-quiz
module: m1
title: Single Blank Quiz

questions:
  - id: q1
    type: fill-blank
    prompt: Complete the sentence.
    text: The capital of France is [[capital]].
    points: 1
    blanks:
      - id: capital
        correct_answers:
          - Paris
          - paris
        case_sensitive: false
        trim_whitespace: true
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'single-blank-quiz.yml'),
      quizContent
    );
    
    // Update course.yml to include the quiz
    const courseContent = `id: single-blank-test
title: Single Blank Test
modules:
  - id: m1
    title: Module 1
    items:
      - single-blank-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    // Build the project
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    // Verify build output exists
    const buildDir = path.join(projectPath, 'build');
    expect(fs.existsSync(buildDir)).toBe(true);
    
    // Verify quiz HTML was generated
    const quizHtml = path.join(buildDir, 'single-blank-quiz.html');
    expect(fs.existsSync(quizHtml)).toBe(true);
    
    // Check that HTML contains fill-blank input with correct attributes
    const html = fs.readFileSync(quizHtml, 'utf-8');
    expect(html).toContain('data-question-type="fill-blank"');
    expect(html).toContain('class="fill-blank-input"');
    expect(html).toContain('data-blank-id="capital"');
    expect(html).toContain('data-correct-answers="Paris|||paris"');
    expect(html).toContain('data-case-sensitive="false"');
    expect(html).toContain('data-trim-whitespace="true"');
    
    // Verify the [[capital]] marker was replaced with an input field
    expect(html).not.toContain('[[capital]]');
    expect(html).toContain('The capital of France is');
  });

  it('should build a course with a multi-blank fill-in question', () => {
    const projectPath = path.join(TEST_DIR, 'multi-blank-test');
    
    // Initialize project
    execSync(`${CLI_PATH} init multi-blank-test`, { cwd: TEST_DIR });
    
    // Add a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    // Create a quiz with multiple fill-blank questions
    const quizContent = `id: multi-blank-quiz
module: m1
title: Multi Blank Quiz

questions:
  - id: q1
    type: fill-blank
    prompt: Fill in the blanks about JavaScript.
    text: JavaScript was created by [[creator]] in [[year]] at [[company]].
    points: 3
    blanks:
      - id: creator
        correct_answers:
          - Brendan Eich
        case_sensitive: true
        trim_whitespace: true
      - id: year
        correct_answers:
          - "1995"
        case_sensitive: false
        trim_whitespace: true
      - id: company
        correct_answers:
          - Netscape
          - Netscape Communications
        case_sensitive: false
        trim_whitespace: true
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'multi-blank-quiz.yml'),
      quizContent
    );
    
    // Update course.yml
    const courseContent = `id: multi-blank-test
title: Multi Blank Test
modules:
  - id: m1
    title: Module 1
    items:
      - multi-blank-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    // Build the project
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    // Verify quiz HTML
    const quizHtml = path.join(projectPath, 'build', 'multi-blank-quiz.html');
    expect(fs.existsSync(quizHtml)).toBe(true);
    
    // Check that all three blanks are rendered
    const html = fs.readFileSync(quizHtml, 'utf-8');
    expect(html).toContain('data-blank-id="creator"');
    expect(html).toContain('data-blank-id="year"');
    expect(html).toContain('data-blank-id="company"');
    
    // Verify case sensitivity settings
    expect(html).toContain('data-correct-answers="Brendan Eich"');
    expect(html).toMatch(/data-blank-id="creator"[^>]*data-case-sensitive="true"/);
    expect(html).toMatch(/data-blank-id="year"[^>]*data-case-sensitive="false"/);
    
    // Verify multiple correct answers for company
    expect(html).toContain('data-correct-answers="Netscape|||Netscape Communications"');
    
    // Verify no [[blank]] markers remain
    expect(html).not.toContain('[[creator]]');
    expect(html).not.toContain('[[year]]');
    expect(html).not.toContain('[[company]]');
  });

  it('should include SCORM runtime with quiz validation logic', () => {
    const projectPath = path.join(TEST_DIR, 'runtime-test');
    
    // Initialize and build a simple project
    execSync(`${CLI_PATH} init runtime-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: test-quiz
module: m1
title: Test Quiz

questions:
  - id: q1
    type: fill-blank
    prompt: Test question
    text: Answer is [[ans]].
    blanks:
      - id: ans
        correct_answers:
          - test
`;
    
    fs.writeFileSync(path.join(projectPath, 'quizzes', 'test-quiz.yml'), quizContent);
    
    const courseContent = `id: runtime-test
title: Runtime Test
modules:
  - id: m1
    title: Module 1
    items:
      - test-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    // Check that runtime JS was copied and contains quiz validation
    const runtimeJs = path.join(projectPath, 'build', 'assets', 'schorm-runtime.js');
    expect(fs.existsSync(runtimeJs)).toBe(true);
    
    const jsContent = fs.readFileSync(runtimeJs, 'utf-8');
    expect(jsContent).toContain('SchormQuiz');
    expect(jsContent).toContain('checkFillBlankAnswer');
    expect(jsContent).toContain('gradeFillBlankQuestion');
    expect(jsContent).toContain('initQuizForm');
  });

  it('should handle fill-blank questions with case sensitivity options', () => {
    const projectPath = path.join(TEST_DIR, 'case-test');
    
    execSync(`${CLI_PATH} init case-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: case-quiz
module: m1
title: Case Sensitivity Test

questions:
  - id: q1
    type: fill-blank
    prompt: Test case sensitivity
    text: Type [[sensitive]] and [[insensitive]].
    blanks:
      - id: sensitive
        correct_answers:
          - ABC
        case_sensitive: true
      - id: insensitive
        correct_answers:
          - XYZ
        case_sensitive: false
`;
    
    fs.writeFileSync(path.join(projectPath, 'quizzes', 'case-quiz.yml'), quizContent);
    
    const courseContent = `id: case-test
title: Case Test
modules:
  - id: m1
    title: Module 1
    items:
      - case-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'case-quiz.html'),
      'utf-8'
    );
    
    // Verify both case sensitivity settings are present
    expect(html).toMatch(/data-blank-id="sensitive"[^>]*data-case-sensitive="true"/);
    expect(html).toMatch(/data-blank-id="insensitive"[^>]*data-case-sensitive="false"/);
  });

  it('should build successfully with existing fill-blank example file', () => {
    const projectPath = path.join(TEST_DIR, 'example-test');
    const exampleQuizPath = path.resolve('examples/quizzes/fill-blank-example.yml');
    
    // Skip test if example file doesn't exist
    if (!fs.existsSync(exampleQuizPath)) {
      console.log('Skipping test - fill-blank-example.yml not found');
      return;
    }
    
    execSync(`${CLI_PATH} init example-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module geography "Geography"`, { cwd: projectPath });
    
    // Copy the example quiz
    fs.copyFileSync(
      exampleQuizPath,
      path.join(projectPath, 'quizzes', 'fill-blank-example.yml')
    );
    
    // Update course.yml
    const courseContent = `id: example-test
title: Example Test
modules:
  - id: geography
    title: Geography
    items:
      - fill-blank-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    // Build should succeed
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const quizHtml = path.join(projectPath, 'build', 'fill-blank-quiz.html');
    expect(fs.existsSync(quizHtml)).toBe(true);
    
    const html = fs.readFileSync(quizHtml, 'utf-8');
    
    // Verify all three questions from the example are present
    expect(html).toContain('data-question-id="q1"');
    expect(html).toContain('data-question-id="q2"');
    expect(html).toContain('data-question-id="q3"');
    
    // Verify the multi-blank question (q2) has all three blanks
    expect(html).toContain('data-blank-id="creator"');
    expect(html).toContain('data-blank-id="year"');
    expect(html).toContain('data-blank-id="company"');
  });
});
