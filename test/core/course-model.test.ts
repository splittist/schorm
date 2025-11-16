import { describe, it, expect } from 'vitest';
import {
  validateId,
  titleFromId,
  ensureModuleExists,
  appendItemToModule,
  type Course,
} from '../../src/core/course-model.js';

describe('validateId', () => {
  it('should accept valid IDs with letters, numbers, hyphens, and underscores', () => {
    expect(() => validateId('module1')).not.toThrow();
    expect(() => validateId('module-1')).not.toThrow();
    expect(() => validateId('module_1')).not.toThrow();
    expect(() => validateId('Module-1_test')).not.toThrow();
    expect(() => validateId('m1')).not.toThrow();
  });

  it('should reject IDs with spaces', () => {
    expect(() => validateId('module 1')).toThrow(/Invalid ID/);
    expect(() => validateId('module 1', 'custom')).toThrow(/Invalid custom/);
  });

  it('should reject IDs with special characters', () => {
    expect(() => validateId('module@1')).toThrow(/Invalid ID/);
    expect(() => validateId('module!1')).toThrow(/Invalid ID/);
    expect(() => validateId('module#1')).toThrow(/Invalid ID/);
    expect(() => validateId('module$1')).toThrow(/Invalid ID/);
  });

  it('should use custom type in error message', () => {
    expect(() => validateId('invalid id', 'module ID')).toThrow(
      /Invalid module ID/
    );
  });
});

describe('titleFromId', () => {
  it('should capitalize simple IDs', () => {
    expect(titleFromId('intro')).toBe('Intro');
    expect(titleFromId('m1')).toBe('M1');
    expect(titleFromId('overview')).toBe('Overview');
  });

  it('should convert hyphenated IDs to title case', () => {
    expect(titleFromId('getting-started')).toBe('Getting Started');
    expect(titleFromId('module-one')).toBe('Module One');
    expect(titleFromId('my-first-lesson')).toBe('My First Lesson');
  });

  it('should convert underscored IDs to title case', () => {
    expect(titleFromId('getting_started')).toBe('Getting Started');
    expect(titleFromId('module_one')).toBe('Module One');
    expect(titleFromId('my_first_lesson')).toBe('My First Lesson');
  });

  it('should convert mixed IDs to title case', () => {
    expect(titleFromId('module-1_overview')).toBe('Module 1 Overview');
    expect(titleFromId('m1-lesson_one')).toBe('M1 Lesson One');
  });

  it('should handle empty segments', () => {
    expect(titleFromId('module--one')).toBe('Module  One');
  });
});

describe('ensureModuleExists', () => {
  it('should return the module if it exists', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [
        { id: 'm1', title: 'Module 1', items: [] },
        { id: 'm2', title: 'Module 2', items: [] },
      ],
    };

    const module = ensureModuleExists(course, 'm1');
    expect(module.id).toBe('m1');
    expect(module.title).toBe('Module 1');
  });

  it('should throw an error if module does not exist', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [{ id: 'm1', title: 'Module 1', items: [] }],
    };

    expect(() => ensureModuleExists(course, 'm2')).toThrow(
      /Module "m2" not found/
    );
  });

  it('should include helpful message in error', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [],
    };

    expect(() => ensureModuleExists(course, 'missing')).toThrow(
      /Run "schorm new module missing" first/
    );
  });
});

describe('appendItemToModule', () => {
  it('should add an item to a module', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [{ id: 'm1', title: 'Module 1', items: [] }],
    };

    appendItemToModule(course, 'm1', 'lesson-1');
    expect(course.modules[0].items).toContain('lesson-1');
  });

  it('should not add duplicate items', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [{ id: 'm1', title: 'Module 1', items: ['lesson-1'] }],
    };

    appendItemToModule(course, 'm1', 'lesson-1');
    expect(course.modules[0].items).toHaveLength(1);
    expect(course.modules[0].items[0]).toBe('lesson-1');
  });

  it('should add multiple items in order', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [{ id: 'm1', title: 'Module 1', items: [] }],
    };

    appendItemToModule(course, 'm1', 'lesson-1');
    appendItemToModule(course, 'm1', 'quiz-1');
    appendItemToModule(course, 'm1', 'lesson-2');

    expect(course.modules[0].items).toHaveLength(3);
    expect(course.modules[0].items[0]).toBe('lesson-1');
    expect(course.modules[0].items[1]).toBe('quiz-1');
    expect(course.modules[0].items[2]).toBe('lesson-2');
  });

  it('should throw error if module does not exist', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [{ id: 'm1', title: 'Module 1', items: [] }],
    };

    expect(() => appendItemToModule(course, 'm2', 'lesson-1')).toThrow(
      /Module "m2" not found/
    );
  });

  it('should work with different item types', () => {
    const course: Course = {
      id: 'test-course',
      title: 'Test Course',
      modules: [{ id: 'm1', title: 'Module 1', items: [] }],
    };

    appendItemToModule(course, 'm1', 'm1-intro');
    appendItemToModule(course, 'm1', 'm1-quiz');
    appendItemToModule(course, 'm1', 'm1-summary');

    expect(course.modules[0].items).toHaveLength(3);
    expect(course.modules[0].items).toContain('m1-intro');
    expect(course.modules[0].items).toContain('m1-quiz');
    expect(course.modules[0].items).toContain('m1-summary');
  });
});
