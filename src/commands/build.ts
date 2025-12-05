import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../core/config.js';
import { loadCourse, findQuizzes, loadQuiz } from '../core/course-model.js';
import { parseLesson, findLessons } from '../core/markdown.js';
import { TemplateEngine, loadTemplate } from '../core/templates.js';
import { processMediaFiles, copyDirectory } from '../core/media.js';
import { buildManifestFromCourse } from '../core/manifest.js';
import { validateQuizFile } from '../core/quiz-validator.js';
import { buildScenarioGraph, generateSequencingFromGraph, processScenarioLinks } from '../core/scenario-builder.js';
import type { BuildError, BuildResult } from '../core/build-error.js';
import type { MediaFile } from '../core/media.js';
import type { Lesson, Quiz } from '../core/course-model.js';
import {
  wrapError,
  formatErrorsForHuman,
  formatBuildResultAsJson,
  formatSuccessMessage,
  calculateDirectorySize
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

      // Step 3.5: Process scenario modules
      // Detect and build scenario graphs before parsing standard lessons
      const scenarioLessons: Lesson[] = [];
      const scenarioModules = course.modules.filter(m => m.sequencing?.mode === 'scenario');
      
      if (scenarioModules.length > 0) {
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
            
            // Generate sequencing data (will be used in manifest generation)
            const sequencingData = generateSequencingFromGraph(graph, module.id);
            
            // Store sequencing data on module for manifest generation
            // We'll use a temporary property that won't conflict with the schema
            (module as any)._generatedSequencing = sequencingData;
            
            // Parse each scene as a lesson
            for (const [nodeId, node] of graph.nodes) {
              const filePath = path.join(contentDir, node.file);
              const lesson = parseLesson(filePath, course);
              
              // Process choice links to buttons
              lesson.content = processScenarioLinks(lesson.content, node.choices);
              
              // Add scenario metadata
              (lesson as any).isScenario = true;
              (lesson as any).isEnding = node.isEnding;
              (lesson as any).masteryScore = node.masteryScore;
              (lesson as any).sceneChoices = node.choices;
              
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
      }

      // Step 4: Parse lessons
      log('📝 Parsing lessons...');
      const contentDir = path.resolve('content');
      const lessonFiles = findLessons(contentDir);
      const lessons: Lesson[] = [];

      // Create a set of scenario lesson IDs to avoid duplicates
      const scenarioLessonIds = new Set(scenarioLessons.map(l => l.id));

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

      // Step 4.5: Parse and validate quizzes
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
      if (errors.some(e => e.originatingStep === 'quiz-validation')) {
        throw new Error('Quiz validation failed');
      }

      // Step 5: Set up template engine
      log('🎨 Setting up templates...');
      const themeDir = path.resolve(config.theme);
      const layoutsDir = path.join(themeDir, 'layouts');
      const partialsDir = path.join(themeDir, 'partials');

      const templateEngine = new TemplateEngine();
      try {
        templateEngine.loadPartials(partialsDir);
        log(`   Theme directory: ${themeDir}\n`);
      } catch (error) {
        errors.push(
          wrapError(error, 'E-TEMPLATE-LOAD', 'Failed to load template partials', {
            file: partialsDir,
            originatingStep: 'template',
          })
        );
      }

      let lessonTemplate;
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

      let quizTemplate;
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
        if (quizzes.length > 0) {
          throw new Error('Quiz template load failed but quizzes exist');
        }
      }

      let scenarioTemplate;
      try {
        scenarioTemplate = loadTemplate(path.join(layoutsDir, 'scenario.html'));
      } catch (error) {
        // Scenario template is optional - only throw if there are scenario lessons
        if (scenarioLessons.length > 0) {
          errors.push(
            wrapError(error, 'E-TEMPLATE-LOAD', 'Failed to load scenario template', {
              file: path.join(layoutsDir, 'scenario.html'),
              originatingStep: 'template',
            })
          );
          throw new Error('Scenario template load failed but scenario modules exist');
        }
      }

      // Step 6: Render lessons to HTML
      log('🖼️  Rendering lessons...');
      
      // Render scenario lessons first
      for (const lesson of scenarioLessons) {
        try {
          const html = templateEngine.render(scenarioTemplate!, {
            courseTitle: course.title,
            lesson: {
              id: lesson.id,
              title: lesson.title,
              content: lesson.content,
              metadata: lesson.metadata,
              isEnding: (lesson as any).isEnding,
              masteryScore: (lesson as any).masteryScore,
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
          let html = templateEngine.render(lessonTemplate, {
            courseTitle: course.title,
            lesson: {
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
              const mediaHtml = templateEngine.render(
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

      // Step 6.5: Render quizzes to HTML
      if (quizzes.length > 0) {
        log('🖼️  Rendering quizzes...');
        for (const quiz of quizzes) {
          try {
            if (!quizTemplate) {
              throw new Error('Quiz template not loaded');
            }
            const html = templateEngine.render(quizTemplate, {
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

      // Step 6.5: Generate index.html landing page
      log('🏠 Generating index page...');
      try {
        const indexTemplate = loadTemplate(path.join(layoutsDir, 'index.html'));

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

        const indexHtml = templateEngine.render(indexTemplate, {
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

      // Step 7: Copy theme assets
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

      // Step 8: Copy media files
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

      // Step 9: Generate manifest
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
