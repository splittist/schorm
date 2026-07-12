/**
 * Build step: render lessons, quizzes, and the index landing page to HTML
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadTemplate } from './templates.js';
import { wrapError } from './build-error.js';
import type { BuildError } from './build-error.js';
import type { Course, Lesson, Quiz } from './course-model.js';
import type { BuildLog } from './build-scenario.js';
import type { ThemeTemplates } from './build-templates.js';

/**
 * Render scenario and regular lessons into the output directory.
 * Regular lessons get their <schorm-media> placeholders replaced with the
 * rendered media-block partial. Render failures are pushed to `errors`.
 */
export function renderLessons(
  templates: ThemeTemplates,
  course: Course,
  scenarioLessons: Lesson[],
  lessons: Lesson[],
  outputDir: string,
  errors: BuildError[],
  log: BuildLog
): void {
  log('🖼️  Rendering lessons...');

  // Render scenario lessons first
  for (const lesson of scenarioLessons) {
    try {
      const html = templates.engine.render(templates.scenarioTemplate!, {
        courseTitle: course.title,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          content: lesson.content,
          metadata: lesson.metadata,
          isEnding: lesson.isEnding,
          masteryScore: lesson.masteryScore,
        },
      });

      const outputPath = path.join(outputDir, `${lesson.id}.html`);
      fs.writeFileSync(outputPath, html, 'utf-8');
      log(`   ✓ ${lesson.id}.html (scenario)`);
    } catch (error) {
      errors.push(
        wrapError(error, 'E-TEMPLATE-RENDER', 'Failed to render scenario template', {
          scoId: lesson.id,
          moduleId: lesson.module,
          originatingStep: 'template',
        })
      );
    }
  }

  // Render regular lessons
  for (const lesson of lessons) {
    try {
      let html = templates.engine.render(templates.lessonTemplate, {
        courseTitle: course.title,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          content: lesson.content,
          metadata: lesson.metadata,
        },
      });

      // Replace media placeholders with rendered media blocks
      if (lesson.media && lesson.media.length > 0) {
        for (const mediaItem of lesson.media) {
          const placeholderPattern = new RegExp(
            `<schorm-media[^>]*data-schorm-id="${mediaItem.id}"[^>]*></schorm-media>`,
            'g'
          );
          const mediaHtml = templates.engine.render(
            '{{> media-block media=this}}',
            mediaItem as unknown as Record<string, unknown>
          );
          html = html.replace(placeholderPattern, mediaHtml);
        }
      }

      const outputPath = path.join(outputDir, `${lesson.id}.html`);
      fs.writeFileSync(outputPath, html, 'utf-8');
      log(`   ✓ ${lesson.id}.html`);
    } catch (error) {
      errors.push(
        wrapError(error, 'E-TEMPLATE-RENDER', 'Failed to render lesson template', {
          scoId: lesson.id,
          moduleId: lesson.module,
          originatingStep: 'template',
        })
      );
    }
  }
  log();
}

/**
 * Render quiz pages into the output directory
 */
export function renderQuizzes(
  templates: ThemeTemplates,
  course: Course,
  quizzes: Quiz[],
  outputDir: string,
  errors: BuildError[],
  log: BuildLog
): void {
  if (quizzes.length === 0) {
    return;
  }

  log('🖼️  Rendering quizzes...');
  for (const quiz of quizzes) {
    try {
      if (!templates.quizTemplate) {
        throw new Error('Quiz template not loaded');
      }
      const html = templates.engine.render(templates.quizTemplate, {
        courseTitle: course.title,
        quiz: quiz,
      });

      const outputPath = path.join(outputDir, `${quiz.id}.html`);
      fs.writeFileSync(outputPath, html, 'utf-8');
      log(`   ✓ ${quiz.id}.html`);
    } catch (error) {
      errors.push(
        wrapError(error, 'E-TEMPLATE-RENDER', 'Failed to render quiz template', {
          scoId: quiz.id,
          moduleId: quiz.module,
          originatingStep: 'template',
        })
      );
    }
  }
  log();
}

/**
 * Render the index.html landing page listing modules and their lessons
 */
export function renderIndexPage(
  templates: ThemeTemplates,
  course: Course,
  lessons: Lesson[],
  outputDir: string,
  errors: BuildError[],
  log: BuildLog
): void {
  log('🏠 Generating index page...');
  try {
    const indexTemplate = loadTemplate(path.join(templates.layoutsDir, 'index.html'));

    // Build modules data with their items (lessons)
    const modulesWithItems = course.modules.map((module) => {
      const items = module.items
        .map((itemId) => lessons.find((l) => l.id === itemId))
        .filter((item) => item !== undefined)
        .map((lesson) => ({
          id: lesson!.id,
          title: lesson!.title,
        }));

      return {
        id: module.id,
        title: module.title,
        items,
      };
    });

    const indexHtml = templates.engine.render(indexTemplate, {
      courseTitle: course.title,
      courseDescription: course.metadata?.description,
      modules: modulesWithItems,
    });

    const indexPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(indexPath, indexHtml, 'utf-8');
    log(`   ✓ index.html\n`);
  } catch (error) {
    errors.push(
      wrapError(error, 'E-TEMPLATE-RENDER', 'Failed to render index page', {
        file: 'index.html',
        originatingStep: 'template',
      })
    );
  }
}
