/**
 * Course data model and structure
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Import and re-export quiz types from quiz-model
import type { Quiz, Question } from './quiz-model.js';
export type { Quiz, Question };

export interface Course {
  id: string;
  title: string;
  version?: string;
  modules: Module[];
  metadata?: CourseMetadata;
}

/**
 * Module sequencing configuration
 * Supports linear progression and optional quiz-gated progression
 */
export interface ModuleSequencing {
  /**
   * Sequencing mode for the module
   * - 'linear': Items must be completed in order
   * - 'free': Items can be accessed in any order (default)
   */
  mode?: 'linear' | 'free';

  /**
   * Quiz gate configuration - require passing a quiz before accessing later items
   * Only applies when mode is 'linear' or 'gated'
   */
  gate?: {
    /**
     * The quiz ID that must be passed to unlock subsequent items
     */
    quiz: string;
  };
}

export interface Module {
  id: string;
  title: string;
  items: string[];
  /**
   * Optional sequencing configuration for this module
   */
  sequencing?: ModuleSequencing;
}

export interface MediaItem {
  id: string;
  type: 'audio' | 'video' | 'image';
  src: string;
  title?: string;
  poster?: string;
}

export interface Lesson {
  type: 'lesson';
  id: string;
  title: string;
  module: string;
  content: string;
  metadata: LessonMetadata;
  media?: MediaItem[];
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

/**
 * Frontmatter schema for lesson Markdown files
 */
export interface LessonFrontmatter {
  id: string;
  title: string;
  module: string;
  type?: string;
  order?: number;
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

  // Validate sequencing configuration for each module
  for (const module of course.modules) {
    validateModuleSequencing(module);
  }

  return course;
}

/**
 * Validate module sequencing configuration
 * Throws an error if the configuration is invalid
 */
export function validateModuleSequencing(module: Module): void {
  const sequencing = module.sequencing;
  if (!sequencing) {
    return; // No sequencing config is valid (defaults to free navigation)
  }

  // Validate mode
  if (sequencing.mode !== undefined) {
    if (sequencing.mode !== 'linear' && sequencing.mode !== 'free') {
      throw new Error(
        `Module "${module.id}": sequencing.mode must be "linear" or "free", got "${sequencing.mode}"`
      );
    }
  }

  // Validate gate configuration
  if (sequencing.gate) {
    if (typeof sequencing.gate !== 'object') {
      throw new Error(`Module "${module.id}": sequencing.gate must be an object`);
    }

    if (!sequencing.gate.quiz) {
      throw new Error(`Module "${module.id}": sequencing.gate.quiz is required when gate is specified`);
    }

    if (typeof sequencing.gate.quiz !== 'string') {
      throw new Error(`Module "${module.id}": sequencing.gate.quiz must be a string`);
    }

    // Validate that the gate quiz exists in the module's items
    if (!module.items.includes(sequencing.gate.quiz)) {
      throw new Error(
        `Module "${module.id}": sequencing.gate.quiz "${sequencing.gate.quiz}" is not in the module's items`
      );
    }
  }
}

/**
 * Save a course object to a YAML file
 */
export function saveCourse(coursePath: string, course: Course): void {
  const content = yaml.stringify(course);
  fs.writeFileSync(coursePath, content, 'utf-8');
}

/**
 * Generic ID validation - validates format for modules, lessons, and quizzes
 */
export function validateId(id: string, type: string = 'ID'): void {
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(id)) {
    throw new Error(
      `Invalid ${type} "${id}". IDs must contain only letters, numbers, hyphens, and underscores.`
    );
  }
}

/**
 * Validate module ID format
 */
export function validateModuleId(moduleId: string): void {
  validateId(moduleId, 'module ID');
}

/**
 * Add a new module to the course
 */
export function addModule(course: Course, moduleId: string, moduleTitle: string): void {
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

/**
 * Validate lesson ID format
 */
export function validateLessonId(lessonId: string): void {
  validateId(lessonId, 'lesson ID');
}

/**
 * Add a lesson to a module's items array
 */
export function addLessonToModule(course: Course, moduleId: string, lessonId: string): void {
  appendItemToModule(course, moduleId, lessonId);
}

/**
 * Validate quiz ID format
 */
export function validateQuizId(quizId: string): void {
  validateId(quizId, 'quiz ID');
}

/**
 * Add a quiz to a module's items array
 */
export function addQuizToModule(course: Course, moduleId: string, quizId: string): void {
  appendItemToModule(course, moduleId, quizId);
}

/**
 * Find and return a module, throwing an error if not found
 */
export function ensureModuleExists(course: Course, moduleId: string): Module {
  const module = course.modules.find((m) => m.id === moduleId);
  if (!module) {
    throw new Error(
      `Module "${moduleId}" not found in course.yml. Run "schorm new module ${moduleId}" first.`
    );
  }
  return module;
}

/**
 * Generic function to append an item to a module's items array
 */
export function appendItemToModule(course: Course, moduleId: string, itemId: string): void {
  const module = ensureModuleExists(course, moduleId);

  // Check if item ID already exists in the module
  if (module.items.includes(itemId)) {
    // Silently skip if already present (idempotent behavior)
    return;
  }

  // Add the item ID to the module's items
  module.items.push(itemId);
}

/**
 * Convert an ID to a human-readable title
 * Examples:
 *   "intro" -> "Intro"
 *   "getting-started" -> "Getting Started"
 *   "m1_overview" -> "M1 Overview"
 */
export function titleFromId(id: string): string {
  // Replace hyphens and underscores with spaces
  const words = id.replace(/[-_]/g, ' ');

  // Capitalize first letter of each word
  return words
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Validate lesson frontmatter against schema
 * Throws an error with a clear message if validation fails
 *
 * @param frontmatter - Raw frontmatter data from gray-matter
 * @param course - Course object to validate module reference
 * @param filePath - Path to the lesson file for error messages
 * @returns Validated and typed LessonFrontmatter
 */
export function validateLessonFrontmatter(
  frontmatter: any,
  course: Course,
  filePath: string
): LessonFrontmatter {
  // Validate 'id' field
  if (frontmatter.id === undefined || frontmatter.id === null) {
    throw new Error(`${filePath}: frontmatter missing required field "id"`);
  }
  if (typeof frontmatter.id !== 'string' || frontmatter.id.trim() === '') {
    throw new Error(`${filePath}: frontmatter "id" must be a non-empty string`);
  }

  // Validate ID format
  try {
    validateLessonId(frontmatter.id);
  } catch (error) {
    throw new Error(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Validate 'title' field
  if (frontmatter.title === undefined || frontmatter.title === null) {
    throw new Error(`${filePath}: frontmatter missing required field "title"`);
  }
  if (typeof frontmatter.title !== 'string' || frontmatter.title.trim() === '') {
    throw new Error(`${filePath}: frontmatter "title" must be a non-empty string`);
  }

  // Validate 'module' field
  if (frontmatter.module === undefined || frontmatter.module === null) {
    throw new Error(`${filePath}: frontmatter missing required field "module"`);
  }
  if (typeof frontmatter.module !== 'string' || frontmatter.module.trim() === '') {
    throw new Error(`${filePath}: frontmatter "module" must be a non-empty string`);
  }

  // Check that module exists in course
  const moduleExists = course.modules.some((m) => m.id === frontmatter.module);
  if (!moduleExists) {
    throw new Error(
      `${filePath}: frontmatter "module" refers to unknown module "${frontmatter.module}"`
    );
  }

  // Validate 'type' field if present
  if (frontmatter.type !== undefined) {
    if (typeof frontmatter.type !== 'string') {
      throw new Error(`${filePath}: frontmatter "type" must be a string`);
    }
    if (frontmatter.type !== 'lesson') {
      throw new Error(
        `${filePath}: frontmatter "type" must be "lesson" (got "${frontmatter.type}")`
      );
    }
  }

  // Validate 'order' field if present
  if (frontmatter.order !== undefined) {
    if (typeof frontmatter.order !== 'number') {
      throw new Error(`${filePath}: frontmatter "order" must be a number`);
    }
  }

  // Return validated frontmatter with proper typing
  return frontmatter as LessonFrontmatter;
}

/**
 * Load a quiz from a YAML file
 */
export function loadQuiz(quizPath: string): Quiz {
  if (!fs.existsSync(quizPath)) {
    throw new Error(`Quiz file not found: ${quizPath}`);
  }

  const content = fs.readFileSync(quizPath, 'utf-8');
  const quiz = yaml.parse(content) as Quiz;

  if (!quiz.id) {
    throw new Error(`${quizPath}: quiz missing required field "id"`);
  }
  if (!quiz.title) {
    throw new Error(`${quizPath}: quiz missing required field "title"`);
  }
  if (!quiz.questions || !Array.isArray(quiz.questions)) {
    throw new Error(`${quizPath}: quiz missing required field "questions" or it's not an array`);
  }

  return quiz;
}

/**
 * Find all quiz files in the quizzes directory
 */
export function findQuizzes(quizzesDir: string): string[] {
  const quizzes: string[] = [];

  if (!fs.existsSync(quizzesDir)) {
    return quizzes;
  }

  function scanDirectory(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
        quizzes.push(fullPath);
      }
    }
  }

  scanDirectory(quizzesDir);
  return quizzes;
}
