/**
 * Build step: load the theme's template engine, partials, and layouts
 */

import * as path from 'path';
import { TemplateEngine, loadTemplate } from './templates.js';
import { wrapError } from './build-error.js';
import type { BuildError } from './build-error.js';
import type { BuildLog } from './build-scenario.js';

export interface ThemeTemplates {
  engine: TemplateEngine;
  layoutsDir: string;
  lessonTemplate: string;
  quizTemplate?: string;
  scenarioTemplate?: string;
}

/**
 * Set up the template engine and load the theme layouts. The lesson layout
 * is required; quiz/scenario layouts are required only when the course has
 * quizzes/scenario lessons. Throws (after pushing to `errors`) when a
 * required layout is missing, matching the build's fail-fast contract.
 */
export function loadThemeTemplates(
  themeDir: string,
  hasQuizzes: boolean,
  hasScenarioLessons: boolean,
  errors: BuildError[],
  log: BuildLog
): ThemeTemplates {
  const layoutsDir = path.join(themeDir, 'layouts');
  const partialsDir = path.join(themeDir, 'partials');

  const engine = new TemplateEngine();
  try {
    engine.loadPartials(partialsDir);
    log(`   Theme directory: ${themeDir}\n`);
  } catch (error) {
    errors.push(
      wrapError(error, 'E-TEMPLATE-LOAD', 'Failed to load template partials', {
        file: partialsDir,
        originatingStep: 'template',
      })
    );
  }

  let lessonTemplate: string;
  try {
    lessonTemplate = loadTemplate(path.join(layoutsDir, 'lesson.html'));
  } catch (error) {
    errors.push(
      wrapError(error, 'E-TEMPLATE-LOAD', 'Failed to load lesson template', {
        file: path.join(layoutsDir, 'lesson.html'),
        originatingStep: 'template',
      })
    );
    throw new Error('Template load failed');
  }

  let quizTemplate: string | undefined;
  try {
    quizTemplate = loadTemplate(path.join(layoutsDir, 'quiz.html'));
  } catch (error) {
    errors.push(
      wrapError(error, 'E-TEMPLATE-LOAD', 'Failed to load quiz template', {
        file: path.join(layoutsDir, 'quiz.html'),
        originatingStep: 'template',
      })
    );
    // Quiz template is optional - only throw if there are quizzes
    if (hasQuizzes) {
      throw new Error('Quiz template load failed but quizzes exist');
    }
  }

  let scenarioTemplate: string | undefined;
  try {
    scenarioTemplate = loadTemplate(path.join(layoutsDir, 'scenario.html'));
  } catch (error) {
    // Scenario template is optional - only throw if there are scenario lessons
    if (hasScenarioLessons) {
      errors.push(
        wrapError(error, 'E-TEMPLATE-LOAD', 'Failed to load scenario template', {
          file: path.join(layoutsDir, 'scenario.html'),
          originatingStep: 'template',
        })
      );
      throw new Error('Scenario template load failed but scenario modules exist');
    }
  }

  return { engine, layoutsDir, lessonTemplate, quizTemplate, scenarioTemplate };
}
