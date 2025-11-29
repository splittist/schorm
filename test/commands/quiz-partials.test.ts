import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.resolve('test-output');
const CLI_PATH = path.resolve('bin/schorm');

describe('Quiz Partials Tests', () => {
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

  it('should render quiz with question partials and proper structure', () => {
    const projectPath = path.join(TEST_DIR, 'partial-test');
    
    execSync(`${CLI_PATH} init partial-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: partial-quiz
module: m1
title: Partials Test Quiz

questions:
  - id: q1
    type: single-choice
    prompt: What is the primary color?
    options:
      - id: a
        text: Red
      - id: b
        text: Green
    correct: a
  - id: q2
    type: multiple-response
    prompt: Which are fruits?
    options:
      - id: a
        text: Apple
      - id: b
        text: Carrot
    correct:
      - a
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'partial-quiz.yml'),
      quizContent
    );
    
    const courseContent = `id: partial-test
title: Partials Test
modules:
  - id: m1
    title: Module 1
    items:
      - partial-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'partial-quiz.html'),
      'utf-8'
    );
    
    // Verify question wrapper structure from question.hbs
    expect(html).toContain('class="schorm-question question"');
    expect(html).toContain('data-question-id="q1"');
    expect(html).toContain('data-question-id="q2"');
    
    // Verify question numbers (from add1 helper)
    expect(html).toContain('Question 1');
    expect(html).toContain('Question 2');
    
    // Verify feedback containers
    expect(html).toContain('class="schorm-question-feedback"');
    expect(html).toContain('data-feedback-for="q1"');
    expect(html).toContain('data-feedback-for="q2"');
    
    // Verify single-choice uses radio buttons with correct naming
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="question-q1"');
    expect(html).toContain('data-option-id="a"');
    
    // Verify multiple-response uses checkboxes
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="question-q2"');
  });

  it('should render true-false questions with correct values', () => {
    const projectPath = path.join(TEST_DIR, 'tf-partial-test');
    
    execSync(`${CLI_PATH} init tf-partial-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: tf-quiz
module: m1
title: True False Partials Test

questions:
  - id: q1
    type: true-false
    prompt: TypeScript adds static typing to JavaScript.
    correct: true
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'tf-quiz.yml'),
      quizContent
    );
    
    const courseContent = `id: tf-partial-test
title: TF Partials Test
modules:
  - id: m1
    title: Module 1
    items:
      - tf-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'tf-quiz.html'),
      'utf-8'
    );
    
    // Verify true-false structure
    expect(html).toContain('data-question-type="true-false"');
    expect(html).toContain('name="question-q1"');
    expect(html).toContain('value="true"');
    expect(html).toContain('value="false"');
    expect(html).toContain('<span>True</span>');
    expect(html).toContain('<span>False</span>');
  });

  it('should render fill-blank questions using partial', () => {
    const projectPath = path.join(TEST_DIR, 'fb-partial-test');
    
    execSync(`${CLI_PATH} init fb-partial-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: fb-quiz
module: m1
title: Fill Blank Partials Test

questions:
  - id: q1
    type: fill-blank
    prompt: Complete the sentence.
    text: The capital of France is [[answer]].
    blanks:
      - id: answer
        correct_answers:
          - Paris
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'fb-quiz.yml'),
      quizContent
    );
    
    const courseContent = `id: fb-partial-test
title: FB Partials Test
modules:
  - id: m1
    title: Module 1
    items:
      - fb-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'fb-quiz.html'),
      'utf-8'
    );
    
    // Verify fill-blank structure from partial
    expect(html).toContain('data-question-type="fill-blank"');
    expect(html).toContain('class="fill-blank-question schorm-fill-blank"');
    expect(html).toContain('data-blank-id="answer"');
    expect(html).toContain('The capital of France is');
  });

  it('should render matching questions using partial with dropdown', () => {
    const projectPath = path.join(TEST_DIR, 'match-partial-test');
    
    execSync(`${CLI_PATH} init match-partial-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: match-quiz
module: m1
title: Matching Partials Test

questions:
  - id: q1
    type: matching
    prompt: Match items
    premises:
      - id: p1
        text: "Red"
      - id: p2
        text: "Blue"
    responses:
      - id: r1
        text: "Sky color"
      - id: r2
        text: "Fire color"
    correct_pairs:
      - premise: p1
        response: r2
      - premise: p2
        response: r1
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'match-quiz.yml'),
      quizContent
    );
    
    const courseContent = `id: match-partial-test
title: Match Partials Test
modules:
  - id: m1
    title: Module 1
    items:
      - match-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'match-quiz.html'),
      'utf-8'
    );
    
    // Verify matching structure from partial
    expect(html).toContain('data-question-type="matching"');
    expect(html).toContain('class="matching-question"');
    expect(html).toContain('class="matching-pairs"');
    expect(html).toContain('data-premise-id="p1"');
    expect(html).toContain('data-premise-id="p2"');
    expect(html).toContain('Red');
    expect(html).toContain('Blue');
    expect(html).toContain('Sky color');
    expect(html).toContain('Fire color');
    expect(html).toContain('— Choose —');
  });

  it('should include sr-only legends for accessibility', () => {
    const projectPath = path.join(TEST_DIR, 'a11y-test');
    
    execSync(`${CLI_PATH} init a11y-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: a11y-quiz
module: m1
title: Accessibility Test

questions:
  - id: q1
    type: single-choice
    prompt: Pick one option
    options:
      - id: a
        text: Option A
    correct: a
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'a11y-quiz.yml'),
      quizContent
    );
    
    const courseContent = `id: a11y-test
title: A11y Test
modules:
  - id: m1
    title: Module 1
    items:
      - a11y-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'a11y-quiz.html'),
      'utf-8'
    );
    
    // Verify accessibility structure
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('<legend');
    expect(html).toContain('<fieldset');
  });

  it('should embed quiz model JSON for runtime use', () => {
    const projectPath = path.join(TEST_DIR, 'json-test');
    
    execSync(`${CLI_PATH} init json-test`, { cwd: TEST_DIR });
    execSync(`${CLI_PATH} new module m1 "Module 1"`, { cwd: projectPath });
    
    const quizContent = `id: json-quiz
module: m1
title: JSON Embed Test

questions:
  - id: q1
    type: single-choice
    prompt: Test question
    options:
      - id: a
        text: Option A
    correct: a
`;
    
    fs.writeFileSync(
      path.join(projectPath, 'quizzes', 'json-quiz.yml'),
      quizContent
    );
    
    const courseContent = `id: json-test
title: JSON Test
modules:
  - id: m1
    title: Module 1
    items:
      - json-quiz
`;
    fs.writeFileSync(path.join(projectPath, 'course.yml'), courseContent);
    
    execSync(`${CLI_PATH} build`, { cwd: projectPath });
    
    const html = fs.readFileSync(
      path.join(projectPath, 'build', 'json-quiz.html'),
      'utf-8'
    );
    
    // Verify quiz JSON is embedded for runtime
    expect(html).toContain('id="schorm-quiz-data"');
    expect(html).toContain('type="application/json"');
    expect(html).toContain('"id":"json-quiz"');
    expect(html).toContain('"questions"');
  });
});
