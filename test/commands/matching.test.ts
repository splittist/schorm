import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.resolve('test-output');
const CLI_PATH = path.resolve('bin/schorm');

describe('Matching Question Tests', () => {
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

  it('should build a course with a basic matching question', () => {
    const projectPath = path.join(TEST_DIR, 'basic-matching-test');
    
    // Initialize project
    execSync(`${CLI_PATH} init basic-matching-test`, { cwd: TEST_DIR });
    
    // Add a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    // Create a quiz with a matching question
    const quizContent = `id: basic-matching-quiz
module: m1
title: Basic Matching Quiz

questions:
  - id: q1
    type: matching
    prompt: Match each term to its definition.
    points: 3
    premises:
      - id: p1
        text: "CPU"
      - id: p2
        text: "RAM"
      - id: p3
        text: "SSD"
    responses:
      - id: r1
        text: "Volatile working memory"
      - id: r2
        text: "Permanent solid-state storage"
      - id: r3
        text: "Central processing unit"
    correct_pairs:
      - premise: p1
        response: r3
      - premise: p2
        response: r1
      - premise: p3
        response: r2
    scoring:
      mode: partial
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'basic-matching-quiz.yml'),
      quizContent
    );
    
    // Update course.yml to include the quiz
    const courseContent = `id: basic-matching-test
title: Basic Matching Test
modules:
  - id: m1
    title: Module 1
    items:
      - basic-matching-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    // Build the project
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    // Verify build output exists
    const buildDir = path.join(projectPath, 'build');
    expect(fs.existsSync(buildDir)).toBe(true);
    
    // Verify quiz HTML was generated
    const quizHtml = path.join(buildDir, 'basic-matching-quiz.html');
    expect(fs.existsSync(quizHtml)).toBe(true);
    
    // Check that HTML contains matching question structure
    const html = fs.readFileSync(quizHtml, 'utf-8');
    expect(html).toContain('data-question-type="matching"');
    expect(html).toContain('class="matching-question"');
    expect(html).toContain('class="matching-pairs"');
    
    // Verify premises are rendered
    expect(html).toContain('data-premise-id="p1"');
    expect(html).toContain('data-premise-id="p2"');
    expect(html).toContain('data-premise-id="p3"');
    expect(html).toContain('CPU');
    expect(html).toContain('RAM');
    expect(html).toContain('SSD');
    
    // Verify response options are rendered in select dropdowns
    expect(html).toContain('Volatile working memory');
    expect(html).toContain('Permanent solid-state storage');
    expect(html).toContain('Central processing unit');
    
    // Verify correct pairs are stored as JSON (HTML encoded)
    expect(html).toContain('class="correct-pairs-data"');
    expect(html).toContain('&quot;premise&quot;:&quot;p1&quot;');
    expect(html).toContain('&quot;response&quot;:&quot;r3&quot;');
  });

  it('should build a course with asymmetric matching (more responses than premises)', () => {
    const projectPath = path.join(TEST_DIR, 'asymmetric-matching-test');
    
    // Initialize project
    execSync(`${CLI_PATH} init asymmetric-matching-test`, { cwd: TEST_DIR });
    
    // Add a module
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    // Create a quiz with asymmetric matching question
    const quizContent = `id: asymmetric-quiz
module: m1
title: Asymmetric Matching Quiz

questions:
  - id: q1
    type: matching
    prompt: Match programming languages to their primary use case.
    points: 3
    premises:
      - id: p1
        text: JavaScript
      - id: p2
        text: Python
      - id: p3
        text: SQL
    responses:
      - id: r1
        text: Web interactivity and client-side scripting
      - id: r2
        text: Data science and machine learning
      - id: r3
        text: Database queries
      - id: r4
        text: Mobile app development
    correct_pairs:
      - premise: p1
        response: r1
      - premise: p2
        response: r2
      - premise: p3
        response: r3
    scoring:
      mode: partial
      partial:
        perCorrect: 1
        penaltyPerIncorrect: 0
        minScore: 0
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'asymmetric-quiz.yml'),
      quizContent
    );
    
    // Update course.yml
    const courseContent = `id: asymmetric-matching-test
title: Asymmetric Matching Test
modules:
  - id: m1
    title: Module 1
    items:
      - asymmetric-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    // Build the project
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    // Verify quiz HTML
    const quizHtml = path.join(projectPath, 'build', 'asymmetric-quiz.html');
    expect(fs.existsSync(quizHtml)).toBe(true);
    
    // Check that HTML contains all premises and responses
    const html = fs.readFileSync(quizHtml, 'utf-8');
    
    // Verify all premises are present
    expect(html).toContain('JavaScript');
    expect(html).toContain('Python');
    expect(html).toContain('SQL');
    
    // Verify all responses (including the distractor) are in dropdowns
    expect(html).toContain('Web interactivity and client-side scripting');
    expect(html).toContain('Data science and machine learning');
    expect(html).toContain('Database queries');
    expect(html).toContain('Mobile app development');
    
    // Verify dropdowns contain all 4 response options
    const selectMatches = html.match(/<select[^>]*class="matching-select"[^>]*>[\s\S]*?<\/select>/g);
    expect(selectMatches).toBeTruthy();
    expect(selectMatches!.length).toBe(3); // One for each premise
    
    // Each select should have 5 options (1 empty + 4 responses)
    selectMatches!.forEach((select) => {
      const optionMatches = select.match(/<option/g);
      expect(optionMatches?.length).toBe(5);
    });
  });

  it('should build successfully with existing matching-example.yml file', () => {
    const projectPath = path.join(TEST_DIR, 'example-matching-test');
    const exampleQuizPath = path.resolve('examples/quizzes/matching-example.yml');
    
    // Skip test if example file doesn't exist
    if (!fs.existsSync(exampleQuizPath)) {
      console.log('Skipping test - matching-example.yml not found');
      return;
    }
    
    execSync(`${CLI_PATH} init example-matching-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module web-technologies "Web Technologies"`, { cwd: projectPath });
    
    // Copy the example quiz
    fs.copyFileSync(
      exampleQuizPath,
      path.join(projectPath, 'quizzes', 'matching-example.yml')
    );
    
    // Update course.yml
    const courseContent = `id: example-matching-test
title: Example Matching Test
modules:
  - id: web-technologies
    title: Web Technologies
    items:
      - matching-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    // Build should succeed
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const quizHtml = path.join(projectPath, 'build', 'matching-quiz.html');
    expect(fs.existsSync(quizHtml)).toBe(true);
    
    const html = fs.readFileSync(quizHtml, 'utf-8');
    
    // Verify all three questions from the example are present
    expect(html).toContain('data-question-id="q1"');
    expect(html).toContain('data-question-id="q2"');
    expect(html).toContain('data-question-id="q3"');
    
    // Verify question prompts
    expect(html).toContain('Match each programming language to its primary use case');
    expect(html).toContain('Match each country to its capital city');
    expect(html).toContain('Match HTML elements to their semantic purpose');
  });

  it('should handle matching questions with all-or-nothing scoring', () => {
    const projectPath = path.join(TEST_DIR, 'scoring-test');
    
    execSync(`${CLI_PATH} init scoring-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: scoring-quiz
module: m1
title: Scoring Test

questions:
  - id: q1
    type: matching
    prompt: Match HTTP status codes to meanings.
    points: 3
    premises:
      - id: p1
        text: "200"
      - id: p2
        text: "404"
      - id: p3
        text: "500"
    responses:
      - id: r1
        text: OK - Success
      - id: r2
        text: Not Found
      - id: r3
        text: Internal Server Error
    correct_pairs:
      - premise: p1
        response: r1
      - premise: p2
        response: r2
      - premise: p3
        response: r3
    scoring:
      mode: all-or-nothing
`;
    
    fs.writeFileSync(path.join(projectPath, 'quizzes', 'scoring-quiz.yml'), quizContent);
    
    const courseContent = `id: scoring-test
title: Scoring Test
modules:
  - id: m1
    title: Module 1
    items:
      - scoring-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'scoring-quiz.html'),
      'utf-8'
    );
    
    // Verify the question is rendered correctly
    expect(html).toContain('data-question-type="matching"');
    expect(html).toContain('Match HTTP status codes to meanings');
    
    // Verify correct pairs data includes all pairs (HTML encoded)
    expect(html).toContain('&quot;premise&quot;:&quot;p1&quot;');
    expect(html).toContain('&quot;premise&quot;:&quot;p2&quot;');
    expect(html).toContain('&quot;premise&quot;:&quot;p3&quot;');
  });
});
