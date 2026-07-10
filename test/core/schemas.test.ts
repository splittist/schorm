/**
 * Schema drift tests
 *
 * The JSON schemas in schemas/ are handed to LLMs to generate course content,
 * so they must stay accurate and complete. These tests keep them honest:
 * every schema must compile, every example file in the repo must validate
 * against its schema, and quizzes accepted by the hand-written validator
 * (the authoritative implementation) must also be accepted by the schema.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import matter from 'gray-matter';
import Ajv from 'ajv';
import { validateQuiz } from '../../src/core/quiz-validator.js';
import type { QuizValidationError } from '../../src/core/quiz-validator.js';

const SCHEMAS_DIR = path.join(process.cwd(), 'schemas');
const EXAMPLES_DIR = path.join(process.cwd(), 'examples');

const SCHEMA_FILES = {
  quiz: 'quiz-schema.json',
  course: 'course-schema.json',
  lesson: 'lesson-frontmatter-schema.json',
  config: 'config-schema.json',
} as const;

function loadSchema(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, file), 'utf-8'));
}

function newAjv(): Ajv {
  // strictRequired is off: it forbids `required` inside anyOf branches that
  // do not re-declare the property, which the course schema uses for the
  // "route needs `to` unless `end: true`" rule
  return new Ajv({
    strict: true,
    strictRequired: false,
    allowUnionTypes: true,
    allErrors: true,
  });
}

function formatErrors(validate: { errors?: unknown }): string {
  return JSON.stringify(validate.errors, null, 2);
}

function runQuizValidator(quizData: unknown): QuizValidationError[] {
  const errors: QuizValidationError[] = [];
  validateQuiz(quizData, errors);
  return errors;
}

describe('JSON schema compilation', () => {
  for (const [name, file] of Object.entries(SCHEMA_FILES)) {
    it(`${name} schema compiles under ajv strict mode`, () => {
      const ajv = newAjv();
      expect(() => ajv.compile(loadSchema(file))).not.toThrow();
    });

    it(`${name} schema declares an $id`, () => {
      const schema = loadSchema(file);
      expect(schema.$id).toMatch(/^https:\/\//);
    });
  }
});

describe('quiz schema', () => {
  const ajv = newAjv();
  const validate = ajv.compile(loadSchema(SCHEMA_FILES.quiz));

  it('documents passing_score (regression pin: it was once missing)', () => {
    const schema = loadSchema(SCHEMA_FILES.quiz) as {
      properties: Record<string, { default?: unknown }>;
    };
    expect(schema.properties.passing_score).toBeDefined();
    expect(schema.properties.passing_score.default).toBe(0.8);
  });

  const quizExamples = fs
    .readdirSync(path.join(EXAMPLES_DIR, 'quizzes'))
    .filter((f) => f.endsWith('.yml'));

  it('has quiz examples to validate', () => {
    expect(quizExamples.length).toBeGreaterThan(0);
  });

  for (const file of quizExamples) {
    it(`examples/quizzes/${file} validates against the schema`, () => {
      const data = yaml.parse(
        fs.readFileSync(path.join(EXAMPLES_DIR, 'quizzes', file), 'utf-8')
      );
      const valid = validate(data);
      expect(valid, formatErrors(validate)).toBe(true);
    });
  }

  // A quiz exercising every question type and optional field the model supports
  const kitchenSinkQuiz = {
    id: 'drift-check',
    module: 'm1',
    title: 'Drift Check Quiz',
    passing_score: 0.7,
    questions: [
      {
        id: 'q1',
        type: 'single-choice',
        prompt: 'Pick one',
        points: 2,
        shuffle_options: true,
        tags: ['a', 'b'],
        feedback: { correct: 'Yes', incorrect: 'No' },
        options: [
          { id: 'a', text: 'A', feedback: 'per-option' },
          { id: 'b', text: 'B' },
        ],
        correct: 'a',
      },
      {
        id: 'q2',
        type: 'multiple-response',
        prompt: 'Pick some',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
        ],
        correct: ['a', 'c'],
        scoring: { mode: 'partial', partial: { perCorrect: 1, penaltyPerIncorrect: 0.5 } },
      },
      {
        id: 'q3',
        type: 'true-false',
        prompt: 'True or false?',
        correct: false,
      },
      {
        id: 'q4',
        type: 'fill-blank',
        prompt: 'Fill it in',
        text: 'The answer is [[answer_1]].',
        blanks: [
          {
            id: 'answer_1',
            correct_answers: ['42', 'forty-two'],
            case_sensitive: false,
            trim_whitespace: true,
          },
        ],
      },
      {
        id: 'q5',
        type: 'matching',
        prompt: 'Match them',
        premises: [
          { id: 'p1', text: 'One' },
          { id: 'p2', text: 'Two' },
        ],
        responses: [
          { id: 'r1', text: 'Uno' },
          { id: 'r2', text: 'Dos' },
          { id: 'r3', text: 'Tres' },
        ],
        correct_pairs: [
          { premise: 'p1', response: 'r1' },
          { premise: 'p2', response: 'r2' },
        ],
      },
    ],
  };

  it('accepts everything the hand-written validator accepts (kitchen-sink quiz)', () => {
    // Authoritative validator must accept it...
    expect(runQuizValidator(kitchenSinkQuiz)).toEqual([]);
    // ...and so must the schema (schema-too-strict drift check)
    const valid = validate(kitchenSinkQuiz);
    expect(valid, formatErrors(validate)).toBe(true);
  });

  // Structurally-broken quizzes: the schema must reject what the
  // authoritative validator rejects, for every rule a schema can express
  const structurallyInvalid: Array<[string, unknown]> = [
    ['missing questions', { id: 'x', module: 'm', title: 'T' }],
    ['empty questions', { id: 'x', module: 'm', title: 'T', questions: [] }],
    [
      'passing_score above 1',
      { ...kitchenSinkQuiz, passing_score: 1.5 },
    ],
    [
      'single-choice with one option',
      {
        id: 'x',
        module: 'm',
        title: 'T',
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'P',
            options: [{ id: 'a', text: 'A' }],
            correct: 'a',
          },
        ],
      },
    ],
    [
      'true-false with string correct',
      {
        id: 'x',
        module: 'm',
        title: 'T',
        questions: [{ id: 'q1', type: 'true-false', prompt: 'P', correct: 'yes' }],
      },
    ],
    [
      'fill-blank without blanks',
      {
        id: 'x',
        module: 'm',
        title: 'T',
        questions: [{ id: 'q1', type: 'fill-blank', prompt: 'P', text: 'A [[b]].' }],
      },
    ],
    [
      'matching without correct_pairs',
      {
        id: 'x',
        module: 'm',
        title: 'T',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'P',
            premises: [{ id: 'p1', text: 'One' }],
            responses: [{ id: 'r1', text: 'Uno' }],
          },
        ],
      },
    ],
  ];

  for (const [label, data] of structurallyInvalid) {
    it(`rejects ${label} (like the hand-written validator)`, () => {
      expect(runQuizValidator(data).length).toBeGreaterThan(0);
      expect(validate(data)).toBe(false);
    });
  }
});

describe('course schema', () => {
  const ajv = newAjv();
  const validate = ajv.compile(loadSchema(SCHEMA_FILES.course));

  it('examples/reply-all-scenario/course.yml validates against the schema', () => {
    const data = yaml.parse(
      fs.readFileSync(path.join(EXAMPLES_DIR, 'reply-all-scenario', 'course.yml'), 'utf-8')
    );
    const valid = validate(data);
    expect(valid, formatErrors(validate)).toBe(true);
  });

  it('accepts the full sequencing DSL (linear mode, gate, branches, choices)', () => {
    const course = {
      id: 'seq-course',
      title: 'Sequencing Course',
      version: '1.0.0',
      metadata: { author: 'A', description: 'D', duration: 30 },
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          items: ['intro', 'role-decision', 'fundamentals', 'fundamentals-quiz', 'wrap-up'],
          sequencing: {
            mode: 'linear',
            gate: { quiz: 'fundamentals-quiz' },
            branches: [{ id: 'default-path', start: 'intro', choices: ['role-path'] }],
            choices: [
              {
                id: 'role-path',
                from: 'role-decision',
                routes: [
                  {
                    label: 'architect track',
                    to: 'wrap-up',
                    condition: { variable: 'learner.role', in: ['architect', 'lead'] },
                  },
                  { label: 'standard track', to: 'fundamentals' },
                  { label: 'end early', end: true },
                ],
              },
            ],
          },
        },
      ],
    };
    const valid = validate(course);
    expect(valid, formatErrors(validate)).toBe(true);
  });

  it('rejects a route with neither "to" nor "end: true"', () => {
    const course = {
      id: 'c',
      title: 'T',
      modules: [
        {
          id: 'm1',
          title: 'M',
          items: ['a'],
          sequencing: {
            choices: [{ id: 'ch', from: 'a', routes: [{ label: 'nowhere' }] }],
          },
        },
      ],
    };
    expect(validate(course)).toBe(false);
  });

  it('rejects a condition with no comparator', () => {
    const course = {
      id: 'c',
      title: 'T',
      modules: [
        {
          id: 'm1',
          title: 'M',
          items: ['a', 'b'],
          sequencing: {
            choices: [
              {
                id: 'ch',
                from: 'a',
                routes: [{ to: 'b', condition: { variable: 'learner.role' } }],
              },
            ],
          },
        },
      ],
    };
    expect(validate(course)).toBe(false);
  });
});

describe('lesson frontmatter schema', () => {
  const ajv = newAjv();
  const validate = ajv.compile(loadSchema(SCHEMA_FILES.lesson));

  const scenarioContentDir = path.join(
    EXAMPLES_DIR,
    'reply-all-scenario',
    'content',
    'email-scenario'
  );
  const sceneFiles = fs.readdirSync(scenarioContentDir).filter((f) => f.endsWith('.md'));

  it('has scenario scene files to validate', () => {
    expect(sceneFiles.length).toBeGreaterThan(0);
  });

  for (const file of sceneFiles) {
    it(`frontmatter of ${file} validates against the schema`, () => {
      const { data } = matter(fs.readFileSync(path.join(scenarioContentDir, file), 'utf-8'));
      const valid = validate(data);
      expect(valid, formatErrors(validate)).toBe(true);
    });
  }

  it('rejects frontmatter missing required fields', () => {
    expect(validate({ title: 'No id or module' })).toBe(false);
  });

  it('rejects ids with characters outside [a-zA-Z0-9_-]', () => {
    expect(validate({ id: 'bad id!', title: 'T', module: 'm1' })).toBe(false);
  });
});

describe('config schema', () => {
  const ajv = newAjv();
  const validate = ajv.compile(loadSchema(SCHEMA_FILES.config));

  it('examples/reply-all-scenario/schorm.config.yml validates against the schema', () => {
    const data = yaml.parse(
      fs.readFileSync(
        path.join(EXAMPLES_DIR, 'reply-all-scenario', 'schorm.config.yml'),
        'utf-8'
      )
    );
    const valid = validate(data);
    expect(valid, formatErrors(validate)).toBe(true);
  });
});
