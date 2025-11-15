/**
 * Course data model and structure
 */

import * as fs from 'fs';
import * as yaml from 'yaml';

export interface Course {
  id: string;
  title: string;
  version?: string;
  modules: Module[];
  metadata?: CourseMetadata;
}

export interface Module {
  id: string;
  title: string;
  items: string[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  metadata: LessonMetadata;
  module?: string;
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

export function loadCourse(coursePath: string): Course {
  if (!fs.existsSync(coursePath)) {
    throw new Error(`Course file not found: ${coursePath}`);
  }

  const content = fs.readFileSync(coursePath, 'utf-8');
  const course = yaml.parse(content) as Course;

  if (!course.id) {
    throw new Error('Course must have an id');
  }
  if (!course.title) {
    throw new Error('Course must have a title');
  }
  if (!course.modules) {
    course.modules = [];
  }

  return course;
}
