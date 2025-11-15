/**
 * Course data model and structure
 */

export interface Course {
  title: string;
  version: string;
  modules: Module[];
  metadata: CourseMetadata;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  quizzes: Quiz[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  metadata: LessonMetadata;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-blank';
  text: string;
  options?: string[];
  correctAnswer: string | string[];
}

export interface CourseMetadata {
  author?: string;
  description?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LessonMetadata {
  duration?: number;
  objectives?: string[];
  [key: string]: unknown;
}

export function parseCourse(coursePath: string): Course {
  // TODO: Implement course parsing from files
  console.log('Parsing course from:', coursePath);
  return {
    title: 'Sample Course',
    version: '1.0.0',
    modules: [],
    metadata: {},
  };
}
