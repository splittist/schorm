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
   * - 'scenario': Auto-generated branching from markdown content graph
   */
  mode?: 'linear' | 'free' | 'scenario';

  /**
   * Quiz gate configuration - require passing a quiz before accessing later items
   * When specified with mode 'linear', items after the gate quiz are disabled
   * until the quiz is passed
   */
  gate?: {
    /**
     * The quiz ID that must be passed to unlock subsequent items
     */
    quiz: string;
  };

  /**
   * Optional branching navigation graph
   * Branches declare named entry points, while choices define conditional routes between items
   */
  branches?: BranchDefinition[];

  /**
   * Choice sets that route learners to other items or to an end state
   */
  choices?: BranchChoice[];

  /**
   * Scenario configuration for auto-generated branching
   * Only used when mode is 'scenario'
   */
  scenario?: {
    /**
     * Starting markdown file (e.g., 'the-incident.md')
     */
    start: string;
    /**
     * Optional content directory override (defaults to 'content/')
     */
    contentDir?: string;
  };
}

type BranchScalar = string | number | boolean;

export interface BranchCondition {
  /** Variable name that should be inspected for routing */
  variable: string;
  /**
   * Equals comparison for the variable
   */
  equals?: BranchScalar;
  /**
   * Not-equals comparison for the variable
   */
  notEquals?: BranchScalar;
  /**
   * Inclusive set comparison
   */
  in?: BranchScalar[];
  /**
   * Exclusive set comparison
   */
  notIn?: BranchScalar[];
}

export interface BranchRoute {
  /** Target lesson/quiz ID for the route. Required unless end is true */
  to?: string;
  /** Optional condition(s) that must be satisfied for this route */
  condition?: BranchCondition;
  conditions?: BranchCondition[];
  /**
   * Mark this route as an end state. When true, no target item is required and navigation stops.
   */
  end?: boolean;
  /** Optional human-readable label */
  label?: string;
}

export interface BranchChoice {
  /** Unique identifier for the choice set */
  id: string;
  /** Item ID from which this choice set is evaluated */
  from: string;
  /** Available routes from this item */
  routes: BranchRoute[];
  /** Description for documentation or UI hints */
  description?: string;
}

export interface BranchDefinition {
  /** Unique identifier for the branch */
  id: string;
  /** Starting item for the branch */
  start: string;
  /** Choice sets relevant to this branch (if omitted, all choices apply) */
  choices?: string[];
  /** Optional summary to help authors */
  description?: string;
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
    if (sequencing.mode !== 'linear' && sequencing.mode !== 'free' && sequencing.mode !== 'scenario') {
      throw new Error(
        `Module "${module.id}": sequencing.mode must be "linear", "free", or "scenario", got "${sequencing.mode}"`
      );
    }
  }

  // Validate scenario mode configuration
  if (sequencing.mode === 'scenario') {
    if (!sequencing.scenario?.start) {
      throw new Error(
        `Module "${module.id}": scenario mode requires sequencing.scenario.start to be specified`
      );
    }
    if (typeof sequencing.scenario.start !== 'string' || !sequencing.scenario.start.trim()) {
      throw new Error(
        `Module "${module.id}": sequencing.scenario.start must be a non-empty string`
      );
    }
    if (module.items.length > 0) {
      console.warn(
        `Module "${module.id}": items[] will be ignored in scenario mode (auto-generated from markdown graph)`
      );
    }
    // In scenario mode, branches and choices are auto-generated
    if (sequencing.branches || sequencing.choices) {
      console.warn(
        `Module "${module.id}": branches and choices will be ignored in scenario mode (auto-generated from markdown)`
      );
    }
    return; // Skip further validation for scenario mode
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

  validateBranchingSequencing(module);
}

function validateBranchCondition(condition: BranchCondition, moduleId: string): void {
  if (!condition || typeof condition !== 'object') {
    throw new Error(`Module "${moduleId}": branch condition must be an object`);
  }

  if (typeof condition.variable !== 'string' || !condition.variable.trim()) {
    throw new Error(`Module "${moduleId}": branch condition.variable must be a non-empty string`);
  }

  const hasComparator =
    condition.equals !== undefined ||
    condition.notEquals !== undefined ||
    (Array.isArray(condition.in) && condition.in.length > 0) ||
    (Array.isArray(condition.notIn) && condition.notIn.length > 0);

  if (!hasComparator) {
    throw new Error(
      `Module "${moduleId}": branch condition for "${condition.variable}" must include a comparator (equals, notEquals, in, or notIn)`
    );
  }

  const validateScalarArray = (values: unknown, label: string): void => {
    if (values === undefined) {
      return;
    }
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Module "${moduleId}": branch condition.${label} must be a non-empty array`);
    }
    for (const value of values) {
      if (!['string', 'number', 'boolean'].includes(typeof value)) {
        throw new Error(
          `Module "${moduleId}": branch condition.${label} values must be string, number, or boolean`
        );
      }
    }
  };

  validateScalarArray(condition.in, 'in');
  validateScalarArray(condition.notIn, 'notIn');
}

function validateBranchingSequencing(module: Module): void {
  const sequencing = module.sequencing;
  if (!sequencing) {
    return;
  }

  const { branches, choices } = sequencing;
  if (!branches && !choices) {
    return;
  }

  const choiceMap = new Map<string, BranchChoice>();

  if (choices !== undefined) {
    if (!Array.isArray(choices)) {
      throw new Error(`Module "${module.id}": sequencing.choices must be an array`);
    }

    for (const choice of choices) {
      if (!choice || typeof choice !== 'object') {
        throw new Error(`Module "${module.id}": each choice must be an object`);
      }
      if (typeof choice.id !== 'string' || !choice.id.trim()) {
        throw new Error(`Module "${module.id}": sequencing.choices[].id must be a non-empty string`);
      }
      if (choiceMap.has(choice.id)) {
        throw new Error(`Module "${module.id}": duplicate choice id "${choice.id}"`);
      }
      if (typeof choice.from !== 'string' || !choice.from.trim()) {
        throw new Error(`Module "${module.id}": sequencing.choices[].from must be a non-empty string`);
      }
      if (!module.items.includes(choice.from)) {
        throw new Error(
          `Module "${module.id}": sequencing choice "${choice.id}" references unknown item "${choice.from}"`
        );
      }
      if (!Array.isArray(choice.routes) || choice.routes.length === 0) {
        throw new Error(
          `Module "${module.id}": sequencing choice "${choice.id}" must include at least one route`
        );
      }

      for (const route of choice.routes) {
        if (!route || typeof route !== 'object') {
          throw new Error(
            `Module "${module.id}": sequencing choice "${choice.id}" routes must be objects`
          );
        }

        const isEnd = route.end === true;

        if (!isEnd) {
          if (!route.to || typeof route.to !== 'string') {
            throw new Error(
              `Module "${module.id}": sequencing choice "${choice.id}" routes require a "to" target unless marked as end`
            );
          }
          if (!module.items.includes(route.to)) {
            throw new Error(
              `Module "${module.id}": sequencing choice "${choice.id}" route target "${route.to}" is not in module items`
            );
          }
        }

        if (isEnd && route?.to !== undefined && typeof route.to !== 'string') {
          throw new Error(
            `Module "${module.id}": sequencing choice "${choice.id}" end routes must use string targets when provided`
          );
        }

        const conditions = route?.conditions ?? (route?.condition ? [route.condition] : []);
        for (const condition of conditions) {
          validateBranchCondition(condition, module.id);
        }
      }

      choiceMap.set(choice.id, choice);
    }
  }

  if (branches !== undefined) {
    if (!Array.isArray(branches)) {
      throw new Error(`Module "${module.id}": sequencing.branches must be an array`);
    }

    const branchIds = new Set<string>();
    for (const branch of branches) {
      if (!branch || typeof branch !== 'object') {
        throw new Error(`Module "${module.id}": each branch must be an object`);
      }
      if (typeof branch.id !== 'string' || !branch.id.trim()) {
        throw new Error(`Module "${module.id}": sequencing.branches[].id must be a non-empty string`);
      }
      if (branchIds.has(branch.id)) {
        throw new Error(`Module "${module.id}": duplicate branch id "${branch.id}"`);
      }
      branchIds.add(branch.id);

      if (typeof branch.start !== 'string' || !branch.start.trim()) {
        throw new Error(`Module "${module.id}": sequencing.branches[].start must be a non-empty string`);
      }
      if (!module.items.includes(branch.start)) {
        throw new Error(
          `Module "${module.id}": branch "${branch.id}" start item "${branch.start}" is not in module items`
        );
      }

      if (branch.choices !== undefined) {
        if (!Array.isArray(branch.choices) || branch.choices.length === 0) {
          throw new Error(
            `Module "${module.id}": branch "${branch.id}" choices must be a non-empty array when provided`
          );
        }

        for (const choiceId of branch.choices) {
          if (typeof choiceId !== 'string' || !choiceId.trim()) {
            throw new Error(
              `Module "${module.id}": branch "${branch.id}" choice references must be non-empty strings`
            );
          }
          if (!choiceMap.has(choiceId)) {
            throw new Error(
              `Module "${module.id}": branch "${branch.id}" references unknown choice "${choiceId}"`
            );
          }
        }
      }
    }
  }

  // Detect cycles in routing graph to prevent non-compliant navigation loops
  const adjacency = new Map<string, string[]>();

  for (const choice of choiceMap.values()) {
    const fromNode = choice.from;
    const neighbors = adjacency.get(fromNode) ?? [];

    for (const route of choice.routes) {
      if (!route.end && route.to) {
        neighbors.push(route.to);
      }
    }

    if (neighbors.length > 0) {
      adjacency.set(fromNode, neighbors);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  const dfs = (node: string): boolean => {
    if (visiting.has(node)) {
      // Cycle found
      path.push(node);
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    visiting.delete(node);
    path.pop();
    visited.add(node);
    return false;
  };

  for (const node of adjacency.keys()) {
    if (dfs(node)) {
      const cycleStart = path[path.length - 1];
      const cyclePath: string[] = [];
      for (let i = path.length - 1; i >= 0; i--) {
        cyclePath.unshift(path[i]);
        if (path[i] === cycleStart && cyclePath.length > 1) {
          break;
        }
      }
      throw new Error(
        `Module "${module.id}": branching routes create a cycle (${cyclePath.join(' -> ')})`
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
