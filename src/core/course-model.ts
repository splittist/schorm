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

export interface MediaItem {
  id: string;
  type: 'audio' | 'video';
  src: string;
  title?: string;
  poster?: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  metadata: LessonMetadata;
  module?: string;
  media?: MediaItem[];
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

/**
 * Save a course object to a YAML file
 */
export function saveCourse(coursePath: string, course: Course): void {
  const content = yaml.stringify(course);
  fs.writeFileSync(coursePath, content, 'utf-8');
}

/**
 * Validate module ID format
 */
export function validateModuleId(moduleId: string): void {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(moduleId)) {
    throw new Error(
      `Invalid module ID "${moduleId}". Module IDs must contain only letters, numbers, hyphens, and underscores.`
    );
  }
}

/**
 * Add a new module to the course
 */
export function addModule(
  course: Course,
  moduleId: string,
  moduleTitle: string
): void {
  // Validate module ID format
  validateModuleId(moduleId);

  // Check for duplicate module ID
  const existingModule = course.modules.find((m) => m.id === moduleId);
  if (existingModule) {
    throw new Error(`Module "${moduleId}" already exists in course.yml.`);
  }

  // Add the new module
  course.modules.push({
    id: moduleId,
    title: moduleTitle,
    items: [],
  });
}
