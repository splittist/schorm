import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../core/config.js';
import { loadCourse } from '../core/course-model.js';
import { parseLesson, findLessons } from '../core/markdown.js';
import { TemplateEngine, loadTemplate } from '../core/templates.js';
import { processMediaFiles, copyDirectory } from '../core/media.js';
import { buildManifestFromCourse } from '../core/manifest.js';

export const buildCommand = new Command('build')
  .description('Build the SCORM package from source content')
  .option('-o, --output <dir>', 'Output directory', 'build')
  .option('-c, --config <file>', 'Config file path', 'schorm.config.yml')
  .action(async (options) => {
    try {
      console.log('🏗️  Building SCORM package...\n');

      const outputDir = path.resolve(options.output);
      const configPath = path.resolve(options.config);
      const courseYmlPath = path.resolve('course.yml');

      // Step 1: Load configuration
      console.log('📋 Loading configuration...');
      const config = loadConfig(configPath);
      console.log(`   Theme: ${config.theme}`);
      console.log(`   SCORM Version: ${config.scorm_version}\n`);

      // Step 2: Load course model
      console.log('📚 Loading course model...');
      const course = loadCourse(courseYmlPath);
      console.log(`   Course: ${course.title}`);
      console.log(`   Modules: ${course.modules.length}\n`);

      // Step 3: Create/clear build directory
      console.log('📁 Setting up build directory...');
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`   Output: ${outputDir}\n`);

      // Step 4: Parse lessons
      console.log('📝 Parsing lessons...');
      const contentDir = path.resolve('content');
      const lessonFiles = findLessons(contentDir);
      const lessons = lessonFiles.map((file) => {
        const lesson = parseLesson(file);
        console.log(`   ✓ ${lesson.id}: ${lesson.title}`);
        return lesson;
      });
      console.log(`   Total lessons: ${lessons.length}\n`);

      // Step 5: Set up template engine
      console.log('🎨 Setting up templates...');
      const themeDir = path.resolve(config.theme);
      const layoutsDir = path.join(themeDir, 'layouts');
      const partialsDir = path.join(themeDir, 'partials');

      const templateEngine = new TemplateEngine();
      templateEngine.loadPartials(partialsDir);

      const lessonTemplate = loadTemplate(path.join(layoutsDir, 'lesson.html'));
      console.log(`   Theme directory: ${themeDir}\n`);

      // Step 6: Render lessons to HTML
      console.log('🖼️  Rendering lessons...');
      for (const lesson of lessons) {
        const html = templateEngine.render(lessonTemplate, {
          courseTitle: course.title,
          lesson: {
            title: lesson.title,
            content: lesson.content,
            metadata: lesson.metadata,
          },
        });

        const outputPath = path.join(outputDir, `${lesson.id}.html`);
        fs.writeFileSync(outputPath, html, 'utf-8');
        console.log(`   ✓ ${lesson.id}.html`);
      }
      console.log();

      // Step 7: Copy theme assets
      console.log('🎨 Copying theme assets...');
      const assetsDir = path.join(themeDir, 'assets');
      const outputAssetsDir = path.join(outputDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        copyDirectory(assetsDir, outputAssetsDir);
        const assetFiles = fs.readdirSync(assetsDir);
        for (const file of assetFiles) {
          console.log(`   ✓ assets/${file}`);
        }
      }
      console.log();

      // Step 8: Copy media files
      console.log('📷 Processing media files...');
      const mediaDir = path.resolve('media');
      const mediaFiles = processMediaFiles(mediaDir, outputDir);
      if (mediaFiles.length > 0) {
        console.log(`   Copied ${mediaFiles.length} media file(s)`);
      } else {
        console.log('   No media files found');
      }
      console.log();

      // Step 9: Generate manifest
      console.log('📜 Generating SCORM manifest...');
      const manifest = buildManifestFromCourse(course, lessons, mediaFiles);
      const manifestPath = path.join(outputDir, 'imsmanifest.xml');
      fs.writeFileSync(manifestPath, manifest, 'utf-8');
      console.log(`   ✓ imsmanifest.xml\n`);

      // Success message
      console.log('✅ Build completed successfully!');
      console.log(`\nOutput directory: ${outputDir}`);
      console.log('\nNext steps:');
      console.log('  schorm preview    # Preview in browser');
      console.log('  schorm validate   # Validate SCORM package');
      console.log('  schorm package    # Create ZIP file');
    } catch (error) {
      console.error('❌ Build failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
