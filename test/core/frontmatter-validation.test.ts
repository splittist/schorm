import { describe, it, expect } from 'vitest';
import {
  validateLessonFrontmatter,
  type Course,
  type LessonFrontmatter,
} from '../../src/core/course-model.js';

const mockCourse: Course = {
  id: 'test-course',
  title: 'Test Course',
  modules: [
    { id: 'm1', title: 'Module 1', items: [] },
    { id: 'm2', title: 'Module 2', items: [] },
    { id: 'intro-module', title: 'Introduction Module', items: [] },
  ],
};

describe('validateLessonFrontmatter', () => {
  describe('valid frontmatter', () => {
    it('should accept valid frontmatter with all required fields', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'm1',
      };

      const result = validateLessonFrontmatter(
        frontmatter,
        mockCourse,
        'content/intro.md'
      );

      expect(result.id).toBe('m1-intro');
      expect(result.title).toBe('Introduction');
      expect(result.module).toBe('m1');
    });

    it('should accept frontmatter with optional type field set to "lesson"', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'm1',
        type: 'lesson',
      };

      const result = validateLessonFrontmatter(
        frontmatter,
        mockCourse,
        'content/intro.md'
      );

      expect(result.type).toBe('lesson');
    });

    it('should accept frontmatter with optional order field', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'm1',
        order: 1,
      };

      const result = validateLessonFrontmatter(
        frontmatter,
        mockCourse,
        'content/intro.md'
      );

      expect(result.order).toBe(1);
    });

    it('should accept frontmatter with extra unknown fields', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'm1',
        customField: 'custom value',
        anotherField: 123,
      };

      const result = validateLessonFrontmatter(
        frontmatter,
        mockCourse,
        'content/intro.md'
      );

      expect(result.customField).toBe('custom value');
      expect(result.anotherField).toBe(123);
    });

    it('should accept IDs with hyphens and underscores', () => {
      const frontmatter1 = {
        id: 'module-1-lesson-1',
        title: 'Lesson',
        module: 'm1',
      };
      const frontmatter2 = {
        id: 'module_1_lesson_1',
        title: 'Lesson',
        module: 'm1',
      };
      const frontmatter3 = {
        id: 'm1-lesson_1',
        title: 'Lesson',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter1, mockCourse, 'content/test.md')
      ).not.toThrow();
      expect(() =>
        validateLessonFrontmatter(frontmatter2, mockCourse, 'content/test.md')
      ).not.toThrow();
      expect(() =>
        validateLessonFrontmatter(frontmatter3, mockCourse, 'content/test.md')
      ).not.toThrow();
    });

    it('should accept alphanumeric IDs', () => {
      const frontmatter = {
        id: 'abc123XYZ',
        title: 'Lesson',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/test.md')
      ).not.toThrow();
    });
  });

  describe('missing required fields', () => {
    it('should throw error when id is missing', () => {
      const frontmatter = {
        title: 'Introduction',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter missing required field "id"');
    });

    it('should throw error when title is missing', () => {
      const frontmatter = {
        id: 'm1-intro',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter missing required field "title"');
    });

    it('should throw error when module is missing', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter missing required field "module"');
    });
  });

  describe('invalid field types', () => {
    it('should throw error when id is not a string', () => {
      const frontmatter = {
        id: 123,
        title: 'Introduction',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter "id" must be a non-empty string');
    });

    it('should throw error when id is an empty string', () => {
      const frontmatter = {
        id: '',
        title: 'Introduction',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter "id" must be a non-empty string');
    });

    it('should throw error when id is whitespace only', () => {
      const frontmatter = {
        id: '   ',
        title: 'Introduction',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter "id" must be a non-empty string');
    });

    it('should throw error when title is not a string', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 123,
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow(
        'content/intro.md: frontmatter "title" must be a non-empty string'
      );
    });

    it('should throw error when title is an empty string', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: '',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow(
        'content/intro.md: frontmatter "title" must be a non-empty string'
      );
    });

    it('should throw error when module is not a string', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 123,
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow(
        'content/intro.md: frontmatter "module" must be a non-empty string'
      );
    });

    it('should throw error when type is not a string', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'm1',
        type: 123,
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter "type" must be a string');
    });

    it('should throw error when type is not "lesson"', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'm1',
        type: 'quiz',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow(
        'content/intro.md: frontmatter "type" must be "lesson" (got "quiz")'
      );
    });

    it('should throw error when order is not a number', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'm1',
        order: '1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow('content/intro.md: frontmatter "order" must be a number');
    });
  });

  describe('invalid ID format', () => {
    it('should throw error when id contains spaces', () => {
      const frontmatter = {
        id: 'my lesson',
        title: 'Lesson',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/test.md')
      ).toThrow(/content\/test\.md:.*Invalid lesson ID.*my lesson/);
    });

    it('should throw error when id contains special characters', () => {
      const frontmatter1 = {
        id: 'lesson@1',
        title: 'Lesson',
        module: 'm1',
      };
      const frontmatter2 = {
        id: 'lesson#1',
        title: 'Lesson',
        module: 'm1',
      };
      const frontmatter3 = {
        id: 'lesson!1',
        title: 'Lesson',
        module: 'm1',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter1, mockCourse, 'content/test.md')
      ).toThrow(/Invalid lesson ID/);
      expect(() =>
        validateLessonFrontmatter(frontmatter2, mockCourse, 'content/test.md')
      ).toThrow(/Invalid lesson ID/);
      expect(() =>
        validateLessonFrontmatter(frontmatter3, mockCourse, 'content/test.md')
      ).toThrow(/Invalid lesson ID/);
    });
  });

  describe('module validation', () => {
    it('should throw error when module does not exist in course', () => {
      const frontmatter = {
        id: 'm1-intro',
        title: 'Introduction',
        module: 'nonexistent',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter, mockCourse, 'content/intro.md')
      ).toThrow(
        'content/intro.md: frontmatter "module" refers to unknown module "nonexistent"'
      );
    });

    it('should accept valid module references', () => {
      const frontmatter1 = {
        id: 'test-1',
        title: 'Test',
        module: 'm1',
      };
      const frontmatter2 = {
        id: 'test-2',
        title: 'Test',
        module: 'm2',
      };
      const frontmatter3 = {
        id: 'test-3',
        title: 'Test',
        module: 'intro-module',
      };

      expect(() =>
        validateLessonFrontmatter(frontmatter1, mockCourse, 'content/test.md')
      ).not.toThrow();
      expect(() =>
        validateLessonFrontmatter(frontmatter2, mockCourse, 'content/test.md')
      ).not.toThrow();
      expect(() =>
        validateLessonFrontmatter(frontmatter3, mockCourse, 'content/test.md')
      ).not.toThrow();
    });
  });

  describe('error messages include file path', () => {
    it('should include correct file path in all error messages', () => {
      const filePath = 'content/subfolder/my-lesson.md';

      expect(() =>
        validateLessonFrontmatter({ title: 'Test', module: 'm1' }, mockCourse, filePath)
      ).toThrow(filePath);

      expect(() =>
        validateLessonFrontmatter({ id: 'm1-test', module: 'm1' }, mockCourse, filePath)
      ).toThrow(filePath);

      expect(() =>
        validateLessonFrontmatter({ id: 'm1-test', title: 'Test' }, mockCourse, filePath)
      ).toThrow(filePath);

      expect(() =>
        validateLessonFrontmatter(
          { id: 'm1-test', title: 'Test', module: 'invalid' },
          mockCourse,
          filePath
        )
      ).toThrow(filePath);
    });
  });
});
