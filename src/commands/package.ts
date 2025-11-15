import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { loadCourse } from '../core/course-model.js';

export const packageCommand = new Command('package')
  .description('Package the built SCORM content into a ZIP file')
  .option('--out <directory>', 'Output directory for ZIP file', 'dist')
  .option('--name <filename>', 'Custom ZIP filename (without .zip extension)')
  .option('--no-validate', 'Skip validation checks')
  .action(async (options) => {
    try {
      console.log('📦 Packaging SCORM content...\n');

      const buildDir = path.resolve('build');
      const outputDir = path.resolve(options.out);

      // Step 1: Check that build/ directory exists
      if (!fs.existsSync(buildDir)) {
        throw new Error('Build directory not found. Please run "schorm build" first.');
      }

      // Step 2: Validate minimal preconditions
      if (options.validate !== false) {
        console.log('🔍 Validating build directory...');

        // Check for imsmanifest.xml
        const manifestPath = path.join(buildDir, 'imsmanifest.xml');
        if (!fs.existsSync(manifestPath)) {
          throw new Error(
            'imsmanifest.xml not found in build directory. Please run "schorm build" first.'
          );
        }
        console.log('   ✓ imsmanifest.xml found');

        // Check for at least one HTML file
        const files = fs.readdirSync(buildDir);
        const htmlFiles = files.filter((f) => f.endsWith('.html'));
        if (htmlFiles.length === 0) {
          throw new Error(
            'No HTML files found in build directory. Please run "schorm build" first.'
          );
        }
        console.log(`   ✓ Found ${htmlFiles.length} HTML file(s)\n`);
      }

      // Step 3: Determine output filename
      let zipFilename: string;
      if (options.name) {
        zipFilename = options.name.endsWith('.zip') ? options.name : `${options.name}.zip`;
      } else {
        // Try to read course.yml to get course ID
        const courseYmlPath = path.resolve('course.yml');
        let courseId = 'course';
        if (fs.existsSync(courseYmlPath)) {
          try {
            const course = loadCourse(courseYmlPath);
            courseId = course.id;
          } catch (error) {
            console.log('   ⚠ Warning: Could not read course.yml, using default filename');
          }
        }
        zipFilename = `${courseId}-scorm2004.zip`;
      }

      // Step 4: Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, zipFilename);

      // Step 5: Create ZIP file
      console.log('🗜️  Creating ZIP file...');
      console.log(`   Output: ${outputPath}`);

      await createZipFile(buildDir, outputPath);

      console.log('\n✅ Package created successfully!');
      console.log(`\nZIP file: ${outputPath}`);
      console.log('\nNext steps:');
      console.log('  • Upload to SCORM Cloud or your LMS');
      console.log('  • Test the package in your LMS environment');
    } catch (error) {
      console.error('❌ Package failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Create a ZIP file from the build directory
 */
async function createZipFile(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`   ✓ ZIP created (${sizeInMB} MB)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add imsmanifest.xml at the root
    const manifestPath = path.join(sourceDir, 'imsmanifest.xml');
    if (fs.existsSync(manifestPath)) {
      archive.file(manifestPath, { name: 'imsmanifest.xml' });
    }

    // Add all HTML files at the root
    const files = fs.readdirSync(sourceDir);
    const htmlFiles = files.filter((f) => f.endsWith('.html'));
    for (const htmlFile of htmlFiles) {
      archive.file(path.join(sourceDir, htmlFile), { name: htmlFile });
    }

    // Add assets directory if it exists
    const assetsDir = path.join(sourceDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      archive.directory(assetsDir, 'assets');
    }

    // Add media directory if it exists
    const mediaDir = path.join(sourceDir, 'media');
    if (fs.existsSync(mediaDir)) {
      archive.directory(mediaDir, 'media');
    }

    archive.finalize();
  });
}
