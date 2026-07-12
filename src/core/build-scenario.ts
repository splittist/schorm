/**
 * Build step: process scenario-mode modules into rendered-ready lessons
 * and auto-generated sequencing data
 */

import * as path from 'path';
import { parseLesson } from './markdown.js';
import {
  buildScenarioGraph,
  generateSequencingFromGraph,
  processScenarioLinks,
  detectCycles,
} from './scenario-builder.js';
import { createBuildError, wrapError } from './build-error.js';
import type { BuildError } from './build-error.js';
import type { Course, Lesson } from './course-model.js';

export type BuildLog = (message?: string) => void;

/**
 * Build the scene graph for every scenario-mode module: crawl the scene
 * files, surface navigation-loop warnings, attach the generated sequencing
 * to the module, and parse each scene into a Lesson tagged with its
 * scenario metadata. Failures are pushed to `errors` per module.
 */
export async function processScenarioModules(
  course: Course,
  errors: BuildError[],
  warnings: BuildError[],
  log: BuildLog
): Promise<Lesson[]> {
  const scenarioLessons: Lesson[] = [];
  const scenarioModules = course.modules.filter((m) => m.sequencing?.mode === 'scenario');

  if (scenarioModules.length === 0) {
    return scenarioLessons;
  }

  log('🎬 Processing scenario modules...');

  for (const module of scenarioModules) {
    try {
      const scenarioConfig = module.sequencing!.scenario!;
      // Use module subdirectory within content directory
      const baseContentDir = scenarioConfig.contentDir || 'content';
      const contentDir = path.resolve(baseContentDir, module.id);

      log(`   📖 Building scenario graph for module "${module.id}"...`);
      const graph = await buildScenarioGraph(contentDir, scenarioConfig.start);

      log(`      Found ${graph.nodes.size} scenes (${graph.endings.size} endings)`);

      // Navigation loops ("try again" scenes) are legitimate in
      // scenarios, but often unintentional - surface them as warnings
      for (const cycle of detectCycles(graph)) {
        warnings.push(
          createBuildError(
            'W-SCENARIO-CYCLE',
            `Scenario navigation loop in module "${module.id}": ${cycle}`,
            { moduleId: module.id, originatingStep: 'scenario', severity: 'warning' }
          )
        );
        log(`      ⚠ ${cycle}`);
      }

      // Attach the generated sequencing for manifest generation
      module.generatedSequencing = generateSequencingFromGraph(graph, module.id);

      // Parse each scene as a lesson
      for (const node of graph.nodes.values()) {
        const filePath = path.join(contentDir, node.file);
        const lesson = parseLesson(filePath, course);

        // Process choice links to buttons
        lesson.content = processScenarioLinks(lesson.content, node.choices);

        // Add scenario metadata consumed by the scenario layout
        lesson.isEnding = node.isEnding;
        lesson.masteryScore = node.masteryScore;

        scenarioLessons.push(lesson);
        log(`      ✓ ${lesson.id}: ${lesson.title}${node.isEnding ? ' (ending)' : ''}`);
      }

      // Update module items to reflect the auto-generated scenes
      module.items = Array.from(graph.nodes.keys());
    } catch (error) {
      errors.push(
        wrapError(error, 'E-SCENARIO-BUILD', 'Failed to build scenario graph', {
          moduleId: module.id,
          originatingStep: 'scenario',
        })
      );
    }
  }

  log();

  return scenarioLessons;
}
