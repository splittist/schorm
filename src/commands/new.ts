import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadCourse,
  saveCourse,
  addModule,
  validateLessonId,
  addLessonToModule,
  validateQuizId,
  addQuizToModule,
  titleFromId,
} from '../core/course-model.js';

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
    const lessonTitle = title || titleFromId(lessonId);

    // Determine file path: content/<module-id>/<lesson-id>.md
    const fileName = `${lessonId}.md`;
    const moduleContentDir = path.resolve(process.cwd(), 'content', moduleId);
    const filePath = path.join(moduleContentDir, fileName);

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.error(`Error: Lesson file already exists: ${filePath}`);
      process.exit(1);
    }

    // Create the lesson file content
    const lessonContent = `---
id: ${lessonId}
title: "${lessonTitle}"
module: ${moduleId}
---

# ${lessonTitle}

Your lesson content goes here.
`;

    // Ensure content/<module-id> directory exists
    if (!fs.existsSync(moduleContentDir)) {
      fs.mkdirSync(moduleContentDir, { recursive: true });
    }

    // Write the lesson file
    fs.writeFileSync(filePath, lessonContent, 'utf-8');

    // Add lesson to module's items array
    addLessonToModule(course, moduleId, lessonId);

    // Save the updated course
    saveCourse(coursePath, course);

    console.log(`✓ Created lesson "${lessonId}" with title "${lessonTitle}"`);
    console.log(`  - Created content/${moduleId}/${fileName}`);
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
    const title = moduleTitle || titleFromId(moduleId);

    // Add the module (this will validate and check for duplicates)
    addModule(course, moduleId, title);

    // Save the updated course
    saveCourse(coursePath, course);

    // Create content, quiz, and media directories for the module
    const contentDir = path.resolve(process.cwd(), 'content', moduleId);
    const quizzesDir = path.resolve(process.cwd(), 'quizzes', moduleId);
    const mediaDir = path.resolve(process.cwd(), 'media', moduleId);

    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    if (!fs.existsSync(quizzesDir)) {
      fs.mkdirSync(quizzesDir, { recursive: true });
    }

    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    console.log(`✓ Created module "${moduleId}" with title "${title}"`);
    console.log(`  - Added to course.yml`);
    console.log(`  - Created content/${moduleId}/`);
    console.log(`  - Created quizzes/${moduleId}/`);
    console.log(`  - Created media/${moduleId}/`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error creating module:', error);
    }
    process.exit(1);
  }
}

/**
 * Create a new quiz
 */
function createQuiz(quizPath: string, title?: string): void {
  const coursePath = path.resolve(process.cwd(), 'course.yml');

  // Check if course.yml exists
  if (!fs.existsSync(coursePath)) {
    console.error('Error: course.yml not found.');
    console.error('Please run "schorm init" first to create a new project.');
    process.exit(1);
  }

  // Parse module-id/quiz-id format
  const parts = quizPath.split('/');
  if (parts.length !== 2) {
    console.error('Error: Invalid quiz path format.');
    console.error('Usage: schorm new quiz <module-id>/<quiz-id> [title]');
    console.error('Example: schorm new quiz m1/checkpoint "Checkpoint Quiz"');
    process.exit(1);
  }

  const [moduleId, quizId] = parts;

  try {
    // Validate quiz ID format
    validateQuizId(quizId);

    // Load existing course
    const course = loadCourse(coursePath);

    // Default title to capitalized quiz ID if not provided
    const quizTitle = title || titleFromId(quizId);

    // Determine file path: quizzes/<module-id>/<quiz-id>.yml
    const fileName = `${quizId}.yml`;
    const moduleQuizzesDir = path.resolve(process.cwd(), 'quizzes', moduleId);
    const filePath = path.join(moduleQuizzesDir, fileName);

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.error(`Error: Quiz file already exists: ${filePath}`);
      process.exit(1);
    }

    // Create the quiz file content
    const quizContent = `id: ${quizId}
module: ${moduleId}
title: "${quizTitle}"
questions:
  - id: q1
    type: single-choice
    prompt: "Your question text here"
    points: 1
    options:
      - id: a
        text: "Option A"
        feedback: "Correct!"
      - id: b
        text: "Option B"
      - id: c
        text: "Option C"
      - id: d
        text: "Option D"
    correct: a
    shuffle_options: true
`;

    // Ensure quizzes/<module-id> directory exists
    if (!fs.existsSync(moduleQuizzesDir)) {
      fs.mkdirSync(moduleQuizzesDir, { recursive: true });
    }

    // Write the quiz file
    fs.writeFileSync(filePath, quizContent, 'utf-8');

    // Add quiz to module's items array
    addQuizToModule(course, moduleId, quizId);

    // Save the updated course
    saveCourse(coursePath, course);

    console.log(`✓ Created quiz "${quizId}" with title "${quizTitle}"`);
    console.log(`  - Created quizzes/${moduleId}/${fileName}`);
    console.log(`  - Added to module "${moduleId}" in course.yml`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error creating quiz:', error);
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
    } else if (type === 'quiz') {
      createQuiz(id, title);
    } else {
      console.error(`Error: Unknown content type "${type}"`);
      console.error('Valid types: module, lesson, quiz');
      process.exit(1);
    }
  });
