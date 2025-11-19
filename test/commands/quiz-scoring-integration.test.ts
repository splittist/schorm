/**
 * Integration tests for quiz scoring functionality
 * Tests the complete workflow: build quiz -> check HTML output -> verify runtime integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.join(process.cwd(), 'test-output');
const CLI_PATH = path.join(process.cwd(), 'bin/schorm');

describe('Quiz Scoring Integration', () => {
  beforeEach(() => {
    // Create test output directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test output
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Quiz Template with Scoring Elements', () => {
    it('should embed quiz data as JSON in quiz HTML', () => {
      const projectPath = path.join(TEST_DIR, 'quiz-json-test');
      
      // Initialize project
      execSync(`${CLI_PATH} init quiz-json-test`, { cwd: TEST_DIR });
      
      // Create a simple quiz
      const quizYaml = `id: simple-quiz
module: m1
title: Simple Quiz
passing_score: 0.75
questions:
  - id: q1
    type: single-choice
    prompt: What is 2 + 2?
    points: 1
    options:
      - id: a
        text: "3"
      - id: b
        text: "4"
      - id: c
        text: "5"
    correct: b
`;
      
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });
      fs.writeFileSync(path.join(quizzesDir, 'simple-quiz.yml'), quizYaml);
      
      // Update course.yml to include quiz
      const courseYaml = `id: test-course
title: Test Course
version: 1.0.0
modules:
  - id: m1
    title: Module 1
    items:
      - simple-quiz
`;
      fs.writeFileSync(path.join(projectPath, 'course.yml'), courseYaml);
      
      // Build
      execSync(`${CLI_PATH} build`, { cwd: projectPath });
      
      // Check that quiz HTML exists
      const quizHtml = fs.readFileSync(
        path.join(projectPath, 'build', 'simple-quiz.html'),
        'utf-8'
      );
      
      // Verify quiz data is embedded
      expect(quizHtml).toContain('id="schorm-quiz-data"');
      expect(quizHtml).toContain('application/json');
      expect(quizHtml).toContain('"id":"simple-quiz"');
      expect(quizHtml).toContain('"passing_score":0.75');
    });

    it('should include submit button with correct ID', () => {
      const projectPath = path.join(TEST_DIR, 'quiz-submit-test');
      
      execSync(`${CLI_PATH} init quiz-submit-test`, { cwd: TEST_DIR });
      
      const quizYaml = `id: test-quiz
module: m1
title: Test Quiz
questions:
  - id: q1
    type: true-false
    prompt: True or false?
    correct: true
`;
      
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });
      fs.writeFileSync(path.join(quizzesDir, 'test-quiz.yml'), quizYaml);
      
      const courseYaml = `id: test-course
title: Test Course
version: 1.0.0
modules:
  - id: m1
    title: Module 1
    items:
      - test-quiz
`;
      fs.writeFileSync(path.join(projectPath, 'course.yml'), courseYaml);
      
      execSync(`${CLI_PATH} build`, { cwd: projectPath });
      
      const quizHtml = fs.readFileSync(
        path.join(projectPath, 'build', 'test-quiz.html'),
        'utf-8'
      );
      
      expect(quizHtml).toContain('id="schorm-quiz-submit"');
      expect(quizHtml).toContain('Submit Quiz');
      expect(quizHtml).toContain('type="button"');
    });

    it('should include result container with correct ID', () => {
      const projectPath = path.join(TEST_DIR, 'quiz-result-test');
      
      execSync(`${CLI_PATH} init quiz-result-test`, { cwd: TEST_DIR });
      
      const quizYaml = `id: result-test
module: m1
title: Result Test
questions:
  - id: q1
    type: true-false
    prompt: Test?
    correct: false
`;
      
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });
      fs.writeFileSync(path.join(quizzesDir, 'result-test.yml'), quizYaml);
      
      const courseYaml = `id: test-course
title: Test Course
version: 1.0.0
modules:
  - id: m1
    title: Module 1
    items:
      - result-test
`;
      fs.writeFileSync(path.join(projectPath, 'course.yml'), courseYaml);
      
      execSync(`${CLI_PATH} build`, { cwd: projectPath });
      
      const quizHtml = fs.readFileSync(
        path.join(projectPath, 'build', 'result-test.html'),
        'utf-8'
      );
      
      expect(quizHtml).toContain('id="schorm-quiz-result"');
      expect(quizHtml).toContain('display: none');
    });

    it('should not include data-correct attributes in new template', () => {
      const projectPath = path.join(TEST_DIR, 'quiz-clean-test');
      
      execSync(`${CLI_PATH} init quiz-clean-test`, { cwd: TEST_DIR });
      
      const quizYaml = `id: clean-quiz
module: m1
title: Clean Quiz
questions:
  - id: q1
    type: single-choice
    prompt: Pick one
    options:
      - id: a
        text: Option A
      - id: b
        text: Option B
    correct: a
`;
      
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });
      fs.writeFileSync(path.join(quizzesDir, 'clean-quiz.yml'), quizYaml);
      
      const courseYaml = `id: test-course
title: Test Course
version: 1.0.0
modules:
  - id: m1
    title: Module 1
    items:
      - clean-quiz
`;
      fs.writeFileSync(path.join(projectPath, 'course.yml'), courseYaml);
      
      execSync(`${CLI_PATH} build`, { cwd: projectPath });
      
      const quizHtml = fs.readFileSync(
        path.join(projectPath, 'build', 'clean-quiz.html'),
        'utf-8'
      );
      
      // Should not leak correct answers to client
      expect(quizHtml).not.toContain('data-correct="true"');
      expect(quizHtml).not.toContain('data-correct="false"');
    });
  });

  describe('Quiz with All Question Types', () => {
    it('should build quiz with all supported question types', () => {
      const projectPath = path.join(TEST_DIR, 'comprehensive-quiz');
      
      execSync(`${CLI_PATH} init comprehensive-quiz`, { cwd: TEST_DIR });
      
      const quizYaml = `id: comprehensive
module: m1
title: Comprehensive Quiz
passing_score: 0.7
questions:
  - id: q1
    type: single-choice
    prompt: Single choice question
    points: 2
    options:
      - id: a
        text: Option A
      - id: b
        text: Option B
    correct: a
    
  - id: q2
    type: multiple-response
    prompt: Multiple response question
    points: 3
    options:
      - id: a
        text: Option A
      - id: b
        text: Option B
      - id: c
        text: Option C
    correct:
      - a
      - c
      
  - id: q3
    type: true-false
    prompt: True/false question
    points: 1
    correct: true
    
  - id: q4
    type: fill-blank
    prompt: Fill blank question
    text: "The answer is [[blank1]]"
    points: 2
    blanks:
      - id: blank1
        correct_answers:
          - answer
          - ANSWER
        case_sensitive: false
        
  - id: q5
    type: matching
    prompt: Matching question
    points: 4
    premises:
      - id: p1
        text: Premise 1
      - id: p2
        text: Premise 2
    responses:
      - id: r1
        text: Response 1
      - id: r2
        text: Response 2
    correct_pairs:
      - premise: p1
        response: r1
      - premise: p2
        response: r2
`;
      
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });
      fs.writeFileSync(path.join(quizzesDir, 'comprehensive.yml'), quizYaml);
      
      const courseYaml = `id: test-course
title: Test Course
version: 1.0.0
modules:
  - id: m1
    title: Module 1
    items:
      - comprehensive
`;
      fs.writeFileSync(path.join(projectPath, 'course.yml'), courseYaml);
      
      execSync(`${CLI_PATH} build`, { cwd: projectPath });
      
      const quizHtml = fs.readFileSync(
        path.join(projectPath, 'build', 'comprehensive.html'),
        'utf-8'
      );
      
      // Verify all question types are present
      expect(quizHtml).toContain('data-question-type="single-choice"');
      expect(quizHtml).toContain('data-question-type="multiple-response"');
      expect(quizHtml).toContain('data-question-type="true-false"');
      expect(quizHtml).toContain('data-question-type="fill-blank"');
      expect(quizHtml).toContain('data-question-type="matching"');
      
      // Verify embedded data includes all questions
      expect(quizHtml).toContain('"id":"q1"');
      expect(quizHtml).toContain('"id":"q2"');
      expect(quizHtml).toContain('"id":"q3"');
      expect(quizHtml).toContain('"id":"q4"');
      expect(quizHtml).toContain('"id":"q5"');
      
      // Verify passing score is embedded
      expect(quizHtml).toContain('"passing_score":0.7');
    });
  });

  describe('Runtime JavaScript Integration', () => {
    it('should include schorm-runtime.js in quiz page', () => {
      const projectPath = path.join(TEST_DIR, 'runtime-include');
      
      execSync(`${CLI_PATH} init runtime-include`, { cwd: TEST_DIR });
      
      const quizYaml = `id: runtime-test
module: m1
title: Runtime Test
questions:
  - id: q1
    type: true-false
    prompt: Test
    correct: true
`;
      
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });
      fs.writeFileSync(path.join(quizzesDir, 'runtime-test.yml'), quizYaml);
      
      const courseYaml = `id: test-course
title: Test Course
version: 1.0.0
modules:
  - id: m1
    title: Module 1
    items:
      - runtime-test
`;
      fs.writeFileSync(path.join(projectPath, 'course.yml'), courseYaml);
      
      execSync(`${CLI_PATH} build`, { cwd: projectPath });
      
      const quizHtml = fs.readFileSync(
        path.join(projectPath, 'build', 'runtime-test.html'),
        'utf-8'
      );
      
      expect(quizHtml).toContain('schorm-runtime.js');
      
      // Verify runtime file is copied to build
      const runtimePath = path.join(projectPath, 'build', 'assets', 'schorm-runtime.js');
      expect(fs.existsSync(runtimePath)).toBe(true);
      
      const runtimeContent = fs.readFileSync(runtimePath, 'utf-8');
      expect(runtimeContent).toContain('SchormQuiz');
      expect(runtimeContent).toContain('evaluateQuiz');
    });
  });

  describe('Default Passing Score', () => {
    it('should allow quiz without explicit passing_score', () => {
      const projectPath = path.join(TEST_DIR, 'default-passing');
      
      execSync(`${CLI_PATH} init default-passing`, { cwd: TEST_DIR });
      
      const quizYaml = `id: default-quiz
module: m1
title: Default Quiz
questions:
  - id: q1
    type: true-false
    prompt: Test
    correct: true
`;
      
      const quizzesDir = path.join(projectPath, 'quizzes');
      fs.mkdirSync(quizzesDir, { recursive: true });
      fs.writeFileSync(path.join(quizzesDir, 'default-quiz.yml'), quizYaml);
      
      const courseYaml = `id: test-course
title: Test Course
version: 1.0.0
modules:
  - id: m1
    title: Module 1
    items:
      - default-quiz
`;
      fs.writeFileSync(path.join(projectPath, 'course.yml'), courseYaml);
      
      // Should build successfully
      execSync(`${CLI_PATH} build`, { cwd: projectPath });
      
      const quizHtml = fs.readFileSync(
        path.join(projectPath, 'build', 'default-quiz.html'),
        'utf-8'
      );
      
      // Should not have passing_score in JSON (undefined values are not serialized)
      const jsonMatch = quizHtml.match(/<script type="application\/json" id="schorm-quiz-data">\s*({[\s\S]*?})\s*<\/script>/);
      expect(jsonMatch).toBeTruthy();
      
      if (jsonMatch) {
        const quizData = JSON.parse(jsonMatch[1]);
        // passing_score should be undefined (not in JSON)
        expect(quizData.passing_score).toBeUndefined();
      }
    });
  });
});
