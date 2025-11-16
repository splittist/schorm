/**
 * Project validation module
 * Validates structural consistency of schorm projects
 */

import * as fs from 'fs';
import * as path from 'path';
import { Course, loadCourse, findQuizzes, loadQuiz } from './course-model.js';
import { findLessons, parseLesson } from './markdown.js';
import type { Lesson, Quiz, MediaItem } from './course-model.js';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
  moduleId?: string;
  scoId?: string;
  itemId?: string;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface SCO {
  id: string;
  module?: string;
  type: 'lesson' | 'quiz';
  filePath: string;
  media?: MediaItem[];
}

/**
 * Main validation function
 */
export async function validateProject(projectRoot: string): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  try {
    // Load course.yml
    const courseYmlPath = path.join(projectRoot, 'course.yml');
    if (!fs.existsSync(courseYmlPath)) {
      errors.push({
        code: 'E-COURSE-NOT-FOUND',
        message: 'course.yml not found in project root',
        severity: 'error',
        file: 'course.yml',
      });
      return { ok: false, errors, warnings };
    }

    const course = loadCourse(courseYmlPath);

    // Discover all SCOs (lessons and quizzes)
    const scos = await discoverSCOs(projectRoot, course, errors);

    // Validate module structure and item references
    validateModulesAndItems(course, scos, errors, warnings);

    // Validate SCO IDs are unique
    validateScoIdsUnique(scos, errors);

    // Validate media files exist
    validateMediaFilesExist(projectRoot, scos, errors);

  } catch (error) {
    errors.push({
      code: 'E-VALIDATION-ERROR',
      message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error',
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Discover all SCOs in the project
 */
async function discoverSCOs(
  projectRoot: string,
  course: Course,
  errors: ValidationIssue[]
): Promise<SCO[]> {
  const scos: SCO[] = [];

  // Find and parse lessons
  const contentDir = path.join(projectRoot, 'content');
  if (fs.existsSync(contentDir)) {
    const lessonFiles = findLessons(contentDir);
    for (const lessonFile of lessonFiles) {
      try {
        const lesson = parseLesson(lessonFile, course);
        scos.push({
          id: lesson.id,
          module: lesson.module,
          type: 'lesson',
          filePath: path.relative(projectRoot, lessonFile),
          media: lesson.media,
        });
      } catch (error) {
        // Parsing errors are already handled by parseLesson validation
        errors.push({
          code: 'E-LESSON-PARSE-ERROR',
          message: `Failed to parse lesson: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          file: path.relative(projectRoot, lessonFile),
        });
      }
    }
  }

  // Find and load quizzes
  const quizzesDir = path.join(projectRoot, 'quizzes');
  if (fs.existsSync(quizzesDir)) {
    const quizFiles = findQuizzes(quizzesDir);
    for (const quizFile of quizFiles) {
      try {
        const quiz = loadQuiz(quizFile);
        scos.push({
          id: quiz.id,
          module: quiz.module,
          type: 'quiz',
          filePath: path.relative(projectRoot, quizFile),
        });
      } catch (error) {
        errors.push({
          code: 'E-QUIZ-PARSE-ERROR',
          message: `Failed to parse quiz: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          file: path.relative(projectRoot, quizFile),
        });
      }
    }
  }

  return scos;
}

/**
 * Validate module structure and item references
 */
function validateModulesAndItems(
  course: Course,
  scos: SCO[],
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  const scoMap = new Map(scos.map(sco => [sco.id, sco]));
  const referencedScoIds = new Set<string>();

  // Validate each module
  for (const module of course.modules) {
    // Check module ID is not empty
    if (!module.id || module.id.trim() === '') {
      errors.push({
        code: 'E-MODULE-EMPTY-ID',
        message: 'Module has empty or missing id',
        severity: 'error',
        file: 'course.yml',
      });
      continue;
    }

    // Track items in this module to detect duplicates
    const itemsInModule = new Set<string>();

    // Validate each item in the module
    for (const itemId of module.items) {
      // Check for duplicate items in module
      if (itemsInModule.has(itemId)) {
        errors.push({
          code: 'E-MODULE-DUP-ITEM',
          message: `Module "${module.id}" has duplicate item "${itemId}"`,
          severity: 'error',
          moduleId: module.id,
          itemId,
          file: 'course.yml',
        });
        continue;
      }
      itemsInModule.add(itemId);

      // Check if item exists as a SCO
      if (!scoMap.has(itemId)) {
        errors.push({
          code: 'E-MODULE-UNKNOWN-ITEM',
          message: `Module "${module.id}" references unknown item "${itemId}"`,
          severity: 'error',
          moduleId: module.id,
          itemId,
          file: 'course.yml',
        });
      } else {
        referencedScoIds.add(itemId);
      }
    }
  }

  // Validate SCO module references
  for (const sco of scos) {
    if (sco.module) {
      const moduleExists = course.modules.some(m => m.id === sco.module);
      if (!moduleExists) {
        errors.push({
          code: 'E-SCO-UNKNOWN-MODULE',
          message: `SCO "${sco.id}" in "${sco.filePath}" refers to unknown module "${sco.module}"`,
          severity: 'error',
          scoId: sco.id,
          moduleId: sco.module,
          file: sco.filePath,
        });
      }
    }
  }

  // Warn about unreferenced SCOs
  for (const sco of scos) {
    if (!referencedScoIds.has(sco.id)) {
      warnings.push({
        code: 'W-SCO-UNREFERENCED',
        message: `SCO "${sco.id}" in "${sco.filePath}" is not referenced by any module`,
        severity: 'warning',
        scoId: sco.id,
        file: sco.filePath,
      });
    }
  }
}

/**
 * Validate all SCO IDs are unique
 */
function validateScoIdsUnique(scos: SCO[], errors: ValidationIssue[]): void {
  const idMap = new Map<string, SCO[]>();

  // Group SCOs by ID
  for (const sco of scos) {
    if (!idMap.has(sco.id)) {
      idMap.set(sco.id, []);
    }
    idMap.get(sco.id)!.push(sco);
  }

  // Check for duplicates
  for (const [id, scoList] of idMap.entries()) {
    if (scoList.length > 1) {
      const fileList = scoList.map(s => `"${s.filePath}"`).join(' and ');
      errors.push({
        code: 'E-SCO-DUP-ID',
        message: `SCO id "${id}" is used by multiple files: ${fileList}`,
        severity: 'error',
        scoId: id,
        file: scoList[0].filePath,
      });
    }
  }
}

/**
 * Validate all referenced media files exist
 */
function validateMediaFilesExist(
  projectRoot: string,
  scos: SCO[],
  errors: ValidationIssue[]
): void {
  for (const sco of scos) {
    if (!sco.media || sco.media.length === 0) {
      continue;
    }

    for (const mediaItem of sco.media) {
      // Validate main media source
      if (mediaItem.src) {
        const mediaPath = resolveMediaPath(projectRoot, mediaItem.src);
        if (!fs.existsSync(mediaPath)) {
          errors.push({
            code: 'E-MEDIA-MISSING-SRC',
            message: `SCO "${sco.id}" references missing media file "${mediaItem.src}"`,
            severity: 'error',
            scoId: sco.id,
            file: sco.filePath,
            path: mediaItem.src,
          });
        }
      }

      // Validate poster if present (for videos)
      if (mediaItem.poster) {
        const posterPath = resolveMediaPath(projectRoot, mediaItem.poster);
        if (!fs.existsSync(posterPath)) {
          errors.push({
            code: 'E-MEDIA-MISSING-POSTER',
            message: `Video media "${mediaItem.id}" in SCO "${sco.id}" references missing poster "${mediaItem.poster}"`,
            severity: 'error',
            scoId: sco.id,
            file: sco.filePath,
            path: mediaItem.poster,
          });
        }
      }
    }
  }
}

/**
 * Resolve a media path relative to project root
 * Handles both absolute paths and relative paths (e.g., "../media/file.jpg")
 */
function resolveMediaPath(projectRoot: string, mediaPath: string): string {
  // If path starts with media/, it's already relative to project root
  if (mediaPath.startsWith('media/')) {
    return path.join(projectRoot, mediaPath);
  }
  
  // If path contains ../, resolve it from content directory
  if (mediaPath.includes('../')) {
    // Assume it's relative to a content file
    return path.join(projectRoot, 'content', mediaPath);
  }
  
  // Default: assume it's in media directory
  return path.join(projectRoot, 'media', mediaPath);
}
