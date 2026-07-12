import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../core/config.js';
import { loadCourse, findQuizzes, loadQuiz } from '../core/course-model.js';
import { parseLesson, findLessons } from '../core/markdown.js';
import { processMediaFiles, copyDirectory } from '../core/media.js';
import { buildManifestFromCourse } from '../core/manifest.js';
import { validateQuizFile } from '../core/quiz-validator.js';
import { processScenarioModules } from '../core/build-scenario.js';
import { loadThemeTemplates } from '../core/build-templates.js';
import { renderLessons, renderQuizzes, renderIndexPage } from '../core/build-render.js';
import type { BuildError, BuildResult } from '../core/build-error.js';
import type { MediaFile } from '../core/media.js';
import type { Lesson, Quiz } from '../core/course-model.js';
import {
  wrapError,
  formatErrorsForHuman,
  formatBuildResultAsJson,
  formatSuccessMessage,
  calculateDirectorySize,
} from '../core/build-error.js';

export const buildCommand = new Command('build')
  .description('Build the SCORM package from source content')
  .option('-o, --output <dir>', 'Output directory', 'build')
  .option('-c, --config <file>', 'Config file path', 'schorm.config.yml')
  .option('--json', 'Output errors in JSON format')
  .action(async (options) => {
    const errors: BuildError[] = [];
    const warnings: BuildError[] = [];
    const jsonMode = options.json === true;

    // Suppress console output in JSON mode
    const log = jsonMode ? () => {} : console.log;

    try {
      log('🏗️  Building SCORM package...\n');

      const outputDir = path.resolve(options.output);
      const configPath = path.resolve(options.config);
      const courseYmlPath = path.resolve('course.yml');

      // Step 1: Load configuration
      log('📋 Loading configuration...');
      let config;
      try {
        config = loadConfig(configPath);
        log(`   Theme: ${config.theme}`);
        log(`   SCORM Version: ${config.scorm_version}\n`);
      } catch (error) {
        errors.push(
          wrapError(error, 'E-CONFIG-LOAD', 'Failed to load configuration file', {
            file: options.config,
            originatingStep: 'config',
          })
        );
        // Cannot continue without config
        throw new Error('Configuration load failed');
      }

      // Step 2: Load course model
      log('📚 Loading course model...');
      let course;
      try {
        course = loadCourse(courseYmlPath);
        log(`   Course: ${course.title}`);
        log(`   Modules: ${course.modules.length}\n`);
      } catch (error) {
        errors.push(
          wrapError(error, 'E-COURSE-LOAD', 'Failed to load course.yml', {
            file: 'course.yml',
            originatingStep: 'course',
          })
        );
        // Cannot continue without course
        throw new Error('Course load failed');
      }

      // Step 3: Create/clear build directory
      log('📁 Setting up build directory...');
      try {
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
        }
        fs.mkdirSync(outputDir, { recursive: true });
        log(`   Output: ${outputDir}\n`);
      } catch (error) {
        errors.push(
          wrapError(error, 'E-BUILD-DIR-SETUP', 'Failed to set up build directory', {
            file: outputDir,
            originatingStep: 'setup',
          })
        );
        throw new Error('Build directory setup failed');
      }

      // Step 4: Process scenario modules (builds scene graphs, attaches
      // generated sequencing, parses scenes into lessons)
      const scenarioLessons = await processScenarioModules(course, errors, warnings, log);

      // Step 5: Parse lessons
      log('📝 Parsing lessons...');
      const contentDir = path.resolve('content');
      const lessonFiles = findLessons(contentDir);
      const lessons: Lesson[] = [];

      // Create a set of scenario lesson IDs to avoid duplicates
      const scenarioLessonIds = new Set(scenarioLessons.map((l) => l.id));

      for (const file of lessonFiles) {
        try {
          const lesson = parseLesson(file, course);
          // Skip lessons that are already part of a scenario module
          if (scenarioLessonIds.has(lesson.id)) {
            log(`   ⊘ ${lesson.id}: ${lesson.title} (already processed in scenario)`);
            continue;
          }
          lessons.push(lesson);
          log(`   ✓ ${lesson.id}: ${lesson.title}`);
        } catch (error) {
          const relativePath = path.relative(process.cwd(), file);
          errors.push(
            wrapError(error, 'E-LESSON-PARSE', 'Failed to parse lesson', {
              file: relativePath,
              originatingStep: 'markdown',
            })
          );
        }
      }

      // Only fail if there are no lessons at all (including scenario lessons)
      // and some lesson files exist but all failed to parse
      const totalLessons = lessons.length + scenarioLessons.length;
      if (totalLessons === 0 && lessonFiles.length > 0 && scenarioLessons.length === 0) {
        // All lessons failed to parse
        throw new Error('All lessons failed to parse');
      }

      log(`   Total lessons: ${lessons.length}\n`);

      // Step 6: Parse and validate quizzes
      log('📝 Parsing and validating quizzes...');
      const quizzesDir = path.resolve('quizzes');
      const quizFiles = findQuizzes(quizzesDir);
      const quizzes: Quiz[] = [];

      for (const file of quizFiles) {
        const relativePath = path.relative(process.cwd(), file);

        // First, validate the quiz against the schema
        const validationResult = validateQuizFile(file);

        if (validationResult.status === 'error') {
          // Add validation errors to the build errors
          for (const quizError of validationResult.errors) {
            errors.push({
              code: `E-QUIZ-${quizError.code}`,
              message: quizError.message,
              severity: 'error',
              file: relativePath,
              scoId: quizError.questionId,
              originatingStep: 'quiz-validation',
            });
          }
          log(`   ✗ ${relativePath} (validation failed)`);
          continue;
        }

        // Quiz passed validation, now load it
        try {
          const quiz = loadQuiz(file);
          quizzes.push(quiz);
          log(`   ✓ ${quiz.id}: ${quiz.title}`);
        } catch (error) {
          errors.push(
            wrapError(error, 'E-QUIZ-PARSE', 'Failed to parse quiz', {
              file: relativePath,
              originatingStep: 'quiz',
            })
          );
        }
      }

      log(`   Total quizzes: ${quizzes.length}\n`);

      // Check if there were quiz validation errors
      if (errors.some((e) => e.originatingStep === 'quiz-validation')) {
        throw new Error('Quiz validation failed');
      }

      // Step 7: Set up template engine and load theme layouts
      log('🎨 Setting up templates...');
      const themeDir = path.resolve(config.theme);
      const templates = loadThemeTemplates(
        themeDir,
        quizzes.length > 0,
        scenarioLessons.length > 0,
        errors,
        log
      );

      // Step 8: Render lessons, quizzes, and the index page
      renderLessons(templates, course, scenarioLessons, lessons, outputDir, errors, log);
      renderQuizzes(templates, course, quizzes, outputDir, errors, log);
      renderIndexPage(templates, course, lessons, outputDir, errors, log);

      // Step 9: Copy theme assets
      log('🎨 Copying theme assets...');
      const assetsDir = path.join(themeDir, 'assets');
      const outputAssetsDir = path.join(outputDir, 'assets');
      try {
        if (fs.existsSync(assetsDir)) {
          copyDirectory(assetsDir, outputAssetsDir);
          const assetFiles = fs.readdirSync(assetsDir);
          for (const file of assetFiles) {
            log(`   ✓ assets/${file}`);
          }
        }
      } catch (error) {
        errors.push(
          wrapError(error, 'E-ASSETS-COPY', 'Failed to copy theme assets', {
            file: assetsDir,
            originatingStep: 'assets',
          })
        );
      }
      log();

      // Step 10: Copy media files
      log('📷 Processing media files...');
      const mediaDir = path.resolve('media');
      let mediaFiles: MediaFile[] = [];
      try {
        mediaFiles = processMediaFiles(mediaDir, outputDir);
        if (mediaFiles.length > 0) {
          log(`   Copied ${mediaFiles.length} media file(s)`);
        } else {
          log('   No media files found');
        }
      } catch (error) {
        errors.push(
          wrapError(error, 'E-MEDIA-PROCESS', 'Failed to process media files', {
            file: mediaDir,
            originatingStep: 'media',
          })
        );
      }
      log();

      // Step 11: Generate manifest
      log('📜 Generating SCORM manifest...');
      try {
        // Combine scenario lessons with regular lessons for manifest
        const allLessons = [...scenarioLessons, ...lessons];
        const manifest = buildManifestFromCourse(course, allLessons, mediaFiles, quizzes);
        const manifestPath = path.join(outputDir, 'imsmanifest.xml');
        fs.writeFileSync(manifestPath, manifest, 'utf-8');
        log(`   ✓ imsmanifest.xml\n`);
      } catch (error) {
        errors.push(
          wrapError(error, 'E-MANIFEST-GENERATE', 'Failed to generate SCORM manifest', {
            file: 'imsmanifest.xml',
            originatingStep: 'manifest',
          })
        );
      }

      // Check for errors
      if (errors.length > 0) {
        const result: BuildResult = {
          ok: false,
          errors,
          warnings,
        };

        if (jsonMode) {
          console.log(formatBuildResultAsJson(result));
        } else {
          console.error(formatErrorsForHuman(errors, warnings));
        }

        process.exit(1);
      }

      // Success!
      const outputSize = calculateDirectorySize(outputDir);
      const result: BuildResult = {
        ok: true,
        errors: [],
        warnings,
        summary: {
          modules: course.modules.length,
          lessons: lessons.length,
          media: mediaFiles.length,
          outputDir,
          outputSize,
        },
      };

      if (jsonMode) {
        console.log(formatBuildResultAsJson(result));
      } else {
        log(formatSuccessMessage(result.summary));
        log('\nNext steps:');
        log('  schorm preview    # Preview in browser');
        log('  schorm validate   # Validate SCORM package');
        log('  schorm package    # Create ZIP file');
      }
    } catch (error) {
      // Top-level error handler for unexpected errors
      if (errors.length === 0) {
        // Only add a generic error if we haven't collected any specific errors
        errors.push(
          wrapError(error, 'E-BUILD-FAILED', 'Build failed with unexpected error', {
            originatingStep: 'build',
          })
        );
      }

      const result: BuildResult = {
        ok: false,
        errors,
        warnings,
      };

      if (jsonMode) {
        console.log(formatBuildResultAsJson(result));
      } else {
        console.error(formatErrorsForHuman(errors, warnings));
      }

      process.exit(1);
    }
  });
