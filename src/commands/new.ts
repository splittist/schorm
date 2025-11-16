import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadCourse,
  saveCourse,
  addModule,
  validateLessonId,
  addLessonToModule,
} from '../core/course-model.js';

/**
 * Capitalize the first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create a new lesson
 */
function createLesson(lessonPath: string, title?: string): void {
  const coursePath = path.resolve(process.cwd(), 'course.yml');

  // Check if course.yml exists
  if (!fs.existsSync(coursePath)) {
    console.error('Error: course.yml not found.');
    console.error('Please run "schorm init" first to create a new project.');
    process.exit(1);
  }

  // Parse module-id/lesson-id format
  const parts = lessonPath.split('/');
  if (parts.length !== 2) {
    console.error('Error: Invalid lesson path format.');
    console.error('Usage: schorm new lesson <module-id>/<lesson-id> [title]');
    console.error('Example: schorm new lesson m1/intro "Introduction"');
    process.exit(1);
  }

  const [moduleId, lessonId] = parts;

  try {
    // Validate lesson ID format
    validateLessonId(lessonId);

    // Load existing course
    const course = loadCourse(coursePath);

    // Default title to capitalized lesson ID if not provided
    const lessonTitle = title || capitalize(lessonId);

    // Determine file path: content/<module-id>-<lesson-id>.md
    const fileName = `${moduleId}-${lessonId}.md`;
    const filePath = path.resolve(process.cwd(), 'content', fileName);

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.error(`Error: Lesson file already exists: ${filePath}`);
      process.exit(1);
    }

    // Create the lesson file content
    const lessonContent = `---
id: ${moduleId}-${lessonId}
title: "${lessonTitle}"
module: ${moduleId}
---

# ${lessonTitle}

Your lesson content goes here.
`;

    // Ensure content directory exists
    const contentDir = path.resolve(process.cwd(), 'content');
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    // Write the lesson file
    fs.writeFileSync(filePath, lessonContent, 'utf-8');

    // Add lesson to module's items array
    addLessonToModule(course, moduleId, `${moduleId}-${lessonId}`);

    // Save the updated course
    saveCourse(coursePath, course);

    console.log(`✓ Created lesson "${moduleId}-${lessonId}" with title "${lessonTitle}"`);
    console.log(`  - Created ${fileName}`);
    console.log(`  - Added to module "${moduleId}" in course.yml`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error creating lesson:', error);
    }
    process.exit(1);
  }
}
function createModule(moduleId: string, moduleTitle?: string): void {
  const coursePath = path.resolve(process.cwd(), 'course.yml');

  // Check if course.yml exists
  if (!fs.existsSync(coursePath)) {
    console.error('Error: course.yml not found.');
    console.error('Please run "schorm init" first to create a new project.');
    process.exit(1);
  }

  try {
    // Load existing course
    const course = loadCourse(coursePath);

    // Default title to capitalized module ID if not provided
    const title = moduleTitle || capitalize(moduleId);

    // Add the module (this will validate and check for duplicates)
    addModule(course, moduleId, title);

    // Save the updated course
    saveCourse(coursePath, course);

    // Create content and quiz directories for the module
    const contentDir = path.resolve(process.cwd(), 'content', moduleId);
    const quizzesDir = path.resolve(process.cwd(), 'quizzes', moduleId);

    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    if (!fs.existsSync(quizzesDir)) {
      fs.mkdirSync(quizzesDir, { recursive: true });
    }

    console.log(`✓ Created module "${moduleId}" with title "${title}"`);
    console.log(`  - Added to course.yml`);
    console.log(`  - Created content/${moduleId}/`);
    console.log(`  - Created quizzes/${moduleId}/`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error creating module:', error);
    }
    process.exit(1);
  }
}

export const newCommand = new Command('new')
  .description('Scaffold new content (module, lesson, or quiz)')
  .argument('<type>', 'Content type (module, lesson, quiz)')
  .argument('<id>', 'Identifier for the content')
  .argument('[title]', 'Title of the content')
  .action((type, id, title) => {
    if (type === 'module') {
      createModule(id, title);
    } else if (type === 'lesson') {
      createLesson(id, title);
    } else {
      console.log('schorm new command');
      console.log('Type:', type);
      console.log('ID:', id);
      console.log('Title:', title || 'Untitled');
      console.log('TODO: Implement content scaffolding for quizzes');
    }
  });
