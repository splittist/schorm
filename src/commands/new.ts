import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadCourse,
  saveCourse,
  addModule,
} from '../core/course-model.js';

/**
 * Capitalize the first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create a new module
 */
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
    } else {
      console.log('schorm new command');
      console.log('Type:', type);
      console.log('ID:', id);
      console.log('Title:', title || 'Untitled');
      console.log('TODO: Implement content scaffolding for lessons and quizzes');
    }
  });
