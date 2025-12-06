import { describe, it, expect } from 'vitest';
import {
  validateModuleSequencing,
  type Module,
} from '../../src/core/course-model.js';
import { buildManifestFromCourse } from '../../src/core/manifest.js';
import type { Course, Lesson } from '../../src/core/course-model.js';
import type { Quiz } from '../../src/core/quiz-model.js';

describe('Module Sequencing Validation', () => {
  it('should accept module without sequencing config', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['lesson-1', 'lesson-2'],
    };

    expect(() => validateModuleSequencing(module)).not.toThrow();
  });

  it('should accept module with free sequencing mode', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['lesson-1', 'lesson-2'],
      sequencing: {
        mode: 'free',
      },
    };

    expect(() => validateModuleSequencing(module)).not.toThrow();
  });

  it('should accept module with linear sequencing mode', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['lesson-1', 'lesson-2'],
      sequencing: {
        mode: 'linear',
      },
    };

    expect(() => validateModuleSequencing(module)).not.toThrow();
  });

  it('should reject module with invalid sequencing mode', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['lesson-1', 'lesson-2'],
      sequencing: {
        mode: 'invalid' as any,
      },
    };

    expect(() => validateModuleSequencing(module)).toThrow(
      /sequencing.mode must be "linear", "free", or "scenario"/
    );
  });

  it('should accept module with valid quiz gate', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['lesson-1', 'm1-quiz', 'lesson-2'],
      sequencing: {
        mode: 'linear',
        gate: {
          quiz: 'm1-quiz',
        },
      },
    };

    expect(() => validateModuleSequencing(module)).not.toThrow();
  });

  it('should reject module with gate quiz not in items', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['lesson-1', 'lesson-2'],
      sequencing: {
        mode: 'linear',
        gate: {
          quiz: 'non-existent-quiz',
        },
      },
    };

    expect(() => validateModuleSequencing(module)).toThrow(
      /sequencing.gate.quiz "non-existent-quiz" is not in the module's items/
    );
  });

  it('should reject module with missing gate quiz field', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['lesson-1', 'lesson-2'],
      sequencing: {
        mode: 'linear',
        gate: {} as any,
      },
    };

    expect(() => validateModuleSequencing(module)).toThrow(
      /sequencing.gate.quiz is required/
    );
  });

  it('should accept module with branching choices and branches', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['intro', 'decision', 'path-a', 'path-b'],
      sequencing: {
        mode: 'free',
        branches: [
          { id: 'default', start: 'intro', choices: ['decision-choice'] },
        ],
        choices: [
          {
            id: 'decision-choice',
            from: 'decision',
            routes: [
              { to: 'path-a', label: 'Path A' },
              { to: 'path-b', label: 'Path B', end: false },
              { end: true, label: 'Stop' },
            ],
          },
        ],
      },
    };

    expect(() => validateModuleSequencing(module)).not.toThrow();
  });

  it('should reject branching route with unknown target', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['intro', 'decision'],
      sequencing: {
        choices: [
          {
            id: 'decision-choice',
            from: 'decision',
            routes: [{ to: 'missing-target' }],
          },
        ],
      },
    };

    expect(() => validateModuleSequencing(module)).toThrow(/route target "missing-target"/);
  });

  it('should reject branching cycles', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['a', 'b', 'c'],
      sequencing: {
        choices: [
          { id: 'choice-a', from: 'a', routes: [{ to: 'b' }] },
          { id: 'choice-b', from: 'b', routes: [{ to: 'a' }] },
        ],
      },
    };

    expect(() => validateModuleSequencing(module)).toThrow(/create a cycle/);
  });

  it('should reject branches referencing missing choices', () => {
    const module: Module = {
      id: 'm1',
      title: 'Module 1',
      items: ['intro'],
      sequencing: {
        branches: [{ id: 'default', start: 'intro', choices: ['unknown-choice'] }],
        choices: [],
      },
    };

    expect(() => validateModuleSequencing(module)).toThrow(/references unknown choice "unknown-choice"/);
  });
});

describe('Manifest Sequencing Generation', () => {
  const createBasicCourse = (modules: Module[]): Course => ({
    id: 'test-course',
    title: 'Test Course',
    modules,
  });

  const createLesson = (id: string, title: string, module: string): Lesson => ({
    type: 'lesson',
    id,
    title,
    module,
    content: '<p>Test content</p>',
    metadata: {},
  });

  const createQuiz = (id: string, title: string, module: string): Quiz => ({
    id,
    title,
    module,
    questions: [
      {
        id: 'q1',
        type: 'single-choice',
        prompt: 'Test question?',
        options: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
        ],
        correct: 'a',
      },
    ],
  });

  it('should generate manifest without sequencing for basic course', () => {
    const course = createBasicCourse([
      {
        id: 'm1',
        title: 'Module 1',
        items: ['lesson-1'],
      },
    ]);
    const lessons = [createLesson('lesson-1', 'Lesson 1', 'm1')];

    const manifest = buildManifestFromCourse(course, lessons, []);

    expect(manifest).toContain('<manifest');
    expect(manifest).toContain('ITEM-m1');
    expect(manifest).toContain('ITEM-lesson-1');
    // Should not have sequencing elements for non-sequenced modules
    expect(manifest).not.toContain('imsss:controlMode');
  });

  it('should generate manifest with linear sequencing', () => {
    const course = createBasicCourse([
      {
        id: 'm1',
        title: 'Module 1',
        items: ['lesson-1', 'lesson-2'],
        sequencing: {
          mode: 'linear',
        },
      },
    ]);
    const lessons = [
      createLesson('lesson-1', 'Lesson 1', 'm1'),
      createLesson('lesson-2', 'Lesson 2', 'm1'),
    ];

    const manifest = buildManifestFromCourse(course, lessons, []);

    expect(manifest).toContain('imsss:sequencing');
    expect(manifest).toContain('imsss:controlMode');
    expect(manifest).toContain('flow="true"');
    expect(manifest).toContain('forwardOnly="true"');
  });

  it('should generate manifest with quiz-gated sequencing', () => {
    const course = createBasicCourse([
      {
        id: 'm1',
        title: 'Module 1',
        items: ['lesson-1', 'm1-quiz', 'lesson-2'],
        sequencing: {
          mode: 'linear',
          gate: {
            quiz: 'm1-quiz',
          },
        },
      },
    ]);
    const lessons = [
      createLesson('lesson-1', 'Lesson 1', 'm1'),
      createLesson('lesson-2', 'Lesson 2', 'm1'),
    ];
    const quizzes = [createQuiz('m1-quiz', 'Module 1 Quiz', 'm1')];

    const manifest = buildManifestFromCourse(course, lessons, [], quizzes);

    // Should have sequencing elements
    expect(manifest).toContain('imsss:sequencing');
    
    // Should have objectives for the quiz
    expect(manifest).toContain('imsss:objectives');
    expect(manifest).toContain('imsss:primaryObjective');
    expect(manifest).toContain('m1-gate-passed');
    
    // Should have mapInfo for writing to global objective
    expect(manifest).toContain('imsss:mapInfo');
    expect(manifest).toContain('writeSatisfiedStatus="true"');
    
    // Should have precondition rules for items after the quiz
    expect(manifest).toContain('imsss:sequencingRules');
    expect(manifest).toContain('imsss:preConditionRule');
    expect(manifest).toContain('imsss:ruleConditions');
    expect(manifest).toContain('condition="satisfied"');
    expect(manifest).toContain('operator="not"');
    expect(manifest).toContain('action="disabled"');
  });

  it('should include quiz resources in manifest', () => {
    const course = createBasicCourse([
      {
        id: 'm1',
        title: 'Module 1',
        items: ['lesson-1', 'm1-quiz'],
      },
    ]);
    const lessons = [createLesson('lesson-1', 'Lesson 1', 'm1')];
    const quizzes = [createQuiz('m1-quiz', 'Module 1 Quiz', 'm1')];

    const manifest = buildManifestFromCourse(course, lessons, [], quizzes);

    // Should have quiz resource
    expect(manifest).toContain('RES-m1-quiz');
    expect(manifest).toContain('m1-quiz.html');
  });

  it('should generate manifest with multiple modules having different sequencing', () => {
    const course = createBasicCourse([
      {
        id: 'm1',
        title: 'Module 1 (Linear)',
        items: ['m1-lesson-1', 'm1-lesson-2'],
        sequencing: {
          mode: 'linear',
        },
      },
      {
        id: 'm2',
        title: 'Module 2 (Free)',
        items: ['m2-lesson-1', 'm2-lesson-2'],
        sequencing: {
          mode: 'free',
        },
      },
    ]);
    const lessons = [
      createLesson('m1-lesson-1', 'M1 Lesson 1', 'm1'),
      createLesson('m1-lesson-2', 'M1 Lesson 2', 'm1'),
      createLesson('m2-lesson-1', 'M2 Lesson 1', 'm2'),
      createLesson('m2-lesson-2', 'M2 Lesson 2', 'm2'),
    ];

    const manifest = buildManifestFromCourse(course, lessons, []);

    expect(manifest).toContain('ITEM-m1');
    expect(manifest).toContain('ITEM-m2');
    // Linear module should have sequencing
    expect(manifest).toContain('imsss:sequencing');
    expect(manifest).toContain('forwardOnly="true"');
  });

  it('should emit branching post-condition rules and objectives for choices', () => {
    const course = createBasicCourse([
      {
        id: 'm1',
        title: 'Module 1',
        items: ['intro', 'decision', 'path-a', 'path-b'],
        sequencing: {
          mode: 'free',
          branches: [{ id: 'main', start: 'intro', choices: ['role-choice'] }],
          choices: [
            {
              id: 'role-choice',
              from: 'decision',
              routes: [
                { to: 'path-a', condition: { variable: 'learner.role', equals: 'architect' } },
                { to: 'path-b', condition: { variable: 'learner.role', notEquals: 'architect' } },
                { end: true },
              ],
            },
          ],
        },
      },
    ]);

    const lessons = [
      createLesson('intro', 'Intro', 'm1'),
      createLesson('decision', 'Decision', 'm1'),
      createLesson('path-a', 'Path A', 'm1'),
      createLesson('path-b', 'Path B', 'm1'),
    ];

    const manifest = buildManifestFromCourse(course, lessons, []);

    expect(manifest).toContain('imsss:postConditionRule');
    expect(manifest).toContain('action="jump" target="ITEM-path-a"');
    expect(manifest).toContain('action="exitAll"');
    expect(manifest).toContain('branch-m1-learner-role-eq-architect');
    expect(manifest).toContain('local-decision-learner-role-eq-architect');
    expect(manifest).toContain('choice="true"');
    expect(manifest).toContain('flow="true"');
  });

  it('should combine multiple route conditions with jump sequencing', () => {
    const course = createBasicCourse([
      {
        id: 'm1',
        title: 'Module 1',
        items: ['start', 'checkpoint', 'advanced'],
        sequencing: {
          choices: [
            {
              id: 'checkpoint-choice',
              from: 'checkpoint',
              routes: [
                {
                  to: 'advanced',
                  conditions: [
                    { variable: 'score.passed', equals: true },
                    { variable: 'region', in: ['us', 'ca'] },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]);

    const lessons = [
      createLesson('start', 'Start', 'm1'),
      createLesson('checkpoint', 'Checkpoint', 'm1'),
      createLesson('advanced', 'Advanced', 'm1'),
    ];

    const manifest = buildManifestFromCourse(course, lessons, []);

    expect(manifest).toContain('conditionCombination="all"');
    expect(manifest).toContain('branch-m1-score-passed-eq-true');
    expect(manifest).toContain('branch-m1-region-in-us-ca');
    expect(manifest).toContain('target="ITEM-advanced"');
  });
});
