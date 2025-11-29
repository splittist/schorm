/**
 * Quiz YAML validation module
 * Validates quiz structure and correctness references
 */

import * as fs from 'fs';
import * as yaml from 'yaml';
import type { QuestionType } from './quiz-model.js';

// ============================================================================
// Error Types
// ============================================================================

export interface QuizValidationError {
  code: string;
  message: string;
  questionId?: string;
  questionType?: QuestionType;
  path?: string;
}

export interface QuizValidationResult {
  status: 'ok' | 'error';
  file: string;
  errors: QuizValidationError[];
}

// ============================================================================
// Validation Error Codes
// ============================================================================

export const ErrorCodes = {
  // Quiz-level errors
  MISSING_ID: 'MISSING_ID',
  MISSING_MODULE: 'MISSING_MODULE',
  MISSING_TITLE: 'MISSING_TITLE',
  MISSING_QUESTIONS: 'MISSING_QUESTIONS',
  EMPTY_QUESTIONS: 'EMPTY_QUESTIONS',
  INVALID_PASSING_SCORE: 'INVALID_PASSING_SCORE',
  DUPLICATE_QUESTION_ID: 'DUPLICATE_QUESTION_ID',

  // Question-level errors
  MISSING_QUESTION_ID: 'MISSING_QUESTION_ID',
  MISSING_QUESTION_TYPE: 'MISSING_QUESTION_TYPE',
  UNKNOWN_QUESTION_TYPE: 'UNKNOWN_QUESTION_TYPE',
  MISSING_PROMPT: 'MISSING_PROMPT',

  // Single-choice errors
  MISSING_OPTIONS: 'MISSING_OPTIONS',
  INSUFFICIENT_OPTIONS: 'INSUFFICIENT_OPTIONS',
  MISSING_CORRECT: 'MISSING_CORRECT',
  INVALID_OPTION_REFERENCE: 'INVALID_OPTION_REFERENCE',
  DUPLICATE_OPTION_ID: 'DUPLICATE_OPTION_ID',

  // Multiple-response errors
  EMPTY_CORRECT_ARRAY: 'EMPTY_CORRECT_ARRAY',
  INVALID_CORRECT_TYPE: 'INVALID_CORRECT_TYPE',

  // True-false errors
  INVALID_BOOLEAN_CORRECT: 'INVALID_BOOLEAN_CORRECT',

  // Fill-blank errors
  MISSING_TEXT: 'MISSING_TEXT',
  MISSING_BLANKS: 'MISSING_BLANKS',
  EMPTY_BLANKS: 'EMPTY_BLANKS',
  MISSING_BLANK_IN_TEXT: 'MISSING_BLANK_IN_TEXT',
  EXTRA_BLANK_IN_ARRAY: 'EXTRA_BLANK_IN_ARRAY',
  DUPLICATE_BLANK_ID: 'DUPLICATE_BLANK_ID',
  MISSING_CORRECT_ANSWERS: 'MISSING_CORRECT_ANSWERS',
  EMPTY_CORRECT_ANSWERS: 'EMPTY_CORRECT_ANSWERS',

  // Matching errors
  MISSING_PREMISES: 'MISSING_PREMISES',
  MISSING_RESPONSES: 'MISSING_RESPONSES',
  MISSING_CORRECT_PAIRS: 'MISSING_CORRECT_PAIRS',
  EMPTY_PREMISES: 'EMPTY_PREMISES',
  EMPTY_RESPONSES: 'EMPTY_RESPONSES',
  EMPTY_CORRECT_PAIRS: 'EMPTY_CORRECT_PAIRS',
  DUPLICATE_PREMISE_ID: 'DUPLICATE_PREMISE_ID',
  DUPLICATE_RESPONSE_ID: 'DUPLICATE_RESPONSE_ID',
  INVALID_PREMISE_REFERENCE: 'INVALID_PREMISE_REFERENCE',
  INVALID_RESPONSE_REFERENCE: 'INVALID_RESPONSE_REFERENCE',
} as const;

// ============================================================================
// Valid Question Types
// ============================================================================

const VALID_QUESTION_TYPES: QuestionType[] = [
  'single-choice',
  'multiple-response',
  'true-false',
  'fill-blank',
  'matching',
];

// ============================================================================
// Main Validation Functions
// ============================================================================

/**
 * Validate a quiz YAML file
 */
export function validateQuizFile(filePath: string): QuizValidationResult {
  const errors: QuizValidationError[] = [];

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return {
      status: 'error',
      file: filePath,
      errors: [
        {
          code: 'FILE_NOT_FOUND',
          message: `Quiz file not found: ${filePath}`,
          path: filePath,
        },
      ],
    };
  }

  // Load and parse YAML
  let quizData: unknown;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    quizData = yaml.parse(content);
  } catch (error) {
    return {
      status: 'error',
      file: filePath,
      errors: [
        {
          code: 'YAML_PARSE_ERROR',
          message: `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
          path: filePath,
        },
      ],
    };
  }

  // Validate quiz structure and semantics
  validateQuiz(quizData, errors);

  return {
    status: errors.length === 0 ? 'ok' : 'error',
    file: filePath,
    errors,
  };
}

/**
 * Validate a quiz object (already parsed from YAML)
 */
export function validateQuiz(quizData: unknown, errors: QuizValidationError[]): void {
  // Check if quizData is an object
  if (!quizData || typeof quizData !== 'object') {
    errors.push({
      code: 'INVALID_QUIZ_FORMAT',
      message: 'Quiz must be an object',
      path: '',
    });
    return;
  }

  const quiz = quizData as Record<string, unknown>;

  // Validate required top-level fields
  validateRequiredField(quiz, 'id', 'string', '', errors, ErrorCodes.MISSING_ID);
  validateRequiredField(quiz, 'module', 'string', '', errors, ErrorCodes.MISSING_MODULE);
  validateRequiredField(quiz, 'title', 'string', '', errors, ErrorCodes.MISSING_TITLE);

  // Validate passing_score if present
  if (quiz.passing_score !== undefined) {
    if (typeof quiz.passing_score !== 'number') {
      errors.push({
        code: ErrorCodes.INVALID_PASSING_SCORE,
        message: `passing_score must be a number, got ${typeof quiz.passing_score}`,
        path: 'passing_score',
      });
    } else if (quiz.passing_score < 0 || quiz.passing_score > 1) {
      errors.push({
        code: ErrorCodes.INVALID_PASSING_SCORE,
        message: `passing_score must be between 0 and 1, got ${quiz.passing_score}`,
        path: 'passing_score',
      });
    }
  }

  // Validate questions array
  if (quiz.questions === undefined || quiz.questions === null) {
    errors.push({
      code: ErrorCodes.MISSING_QUESTIONS,
      message: 'Quiz must have a questions array',
      path: 'questions',
    });
    return;
  }

  if (!Array.isArray(quiz.questions)) {
    errors.push({
      code: ErrorCodes.MISSING_QUESTIONS,
      message: 'questions must be an array',
      path: 'questions',
    });
    return;
  }

  if (quiz.questions.length === 0) {
    errors.push({
      code: ErrorCodes.EMPTY_QUESTIONS,
      message: 'Quiz must have at least one question',
      path: 'questions',
    });
    return;
  }

  // Track question IDs for duplicate detection
  const questionIds = new Set<string>();

  // Validate each question
  for (let i = 0; i < quiz.questions.length; i++) {
    const question = quiz.questions[i];
    const questionPath = `questions[${i}]`;

    validateQuestion(question, questionPath, questionIds, errors);
  }
}

/**
 * Validate a single question
 */
function validateQuestion(
  question: unknown,
  basePath: string,
  questionIds: Set<string>,
  errors: QuizValidationError[]
): void {
  if (!question || typeof question !== 'object') {
    errors.push({
      code: 'INVALID_QUESTION_FORMAT',
      message: 'Question must be an object',
      path: basePath,
    });
    return;
  }

  const q = question as Record<string, unknown>;

  // Validate required base fields
  const hasId = validateRequiredField(
    q,
    'id',
    'string',
    basePath,
    errors,
    ErrorCodes.MISSING_QUESTION_ID
  );

  // Check for duplicate question IDs
  if (hasId && typeof q.id === 'string') {
    if (questionIds.has(q.id)) {
      errors.push({
        code: ErrorCodes.DUPLICATE_QUESTION_ID,
        message: `Duplicate question id "${q.id}"`,
        questionId: q.id,
        path: `${basePath}.id`,
      });
    } else {
      questionIds.add(q.id);
    }
  }

  const questionId = typeof q.id === 'string' ? q.id : undefined;

  // Validate type field
  if (q.type === undefined || q.type === null) {
    errors.push({
      code: ErrorCodes.MISSING_QUESTION_TYPE,
      message: 'Question must have a type',
      questionId,
      path: `${basePath}.type`,
    });
    return;
  }

  if (typeof q.type !== 'string') {
    errors.push({
      code: ErrorCodes.MISSING_QUESTION_TYPE,
      message: 'Question type must be a string',
      questionId,
      path: `${basePath}.type`,
    });
    return;
  }

  // Check if type is valid
  if (!VALID_QUESTION_TYPES.includes(q.type as QuestionType)) {
    errors.push({
      code: ErrorCodes.UNKNOWN_QUESTION_TYPE,
      message: `Unknown question type "${q.type}". Valid types are: ${VALID_QUESTION_TYPES.join(', ')}`,
      questionId,
      questionType: q.type as QuestionType,
      path: `${basePath}.type`,
    });
    return;
  }

  // Validate prompt
  validateRequiredField(q, 'prompt', 'string', basePath, errors, ErrorCodes.MISSING_PROMPT, questionId);

  // Validate type-specific fields
  const questionType = q.type as QuestionType;
  switch (questionType) {
    case 'single-choice':
      validateSingleChoiceQuestion(q, basePath, questionId, errors);
      break;
    case 'multiple-response':
      validateMultipleResponseQuestion(q, basePath, questionId, errors);
      break;
    case 'true-false':
      validateTrueFalseQuestion(q, basePath, questionId, errors);
      break;
    case 'fill-blank':
      validateFillBlankQuestion(q, basePath, questionId, errors);
      break;
    case 'matching':
      validateMatchingQuestion(q, basePath, questionId, errors);
      break;
  }
}

// ============================================================================
// Type-Specific Validation Functions
// ============================================================================

/**
 * Validate a single-choice question
 */
function validateSingleChoiceQuestion(
  q: Record<string, unknown>,
  basePath: string,
  questionId: string | undefined,
  errors: QuizValidationError[]
): void {
  // Validate options array
  if (!q.options || !Array.isArray(q.options)) {
    errors.push({
      code: ErrorCodes.MISSING_OPTIONS,
      message: 'Single-choice question must have an options array',
      questionId,
      questionType: 'single-choice',
      path: `${basePath}.options`,
    });
    return;
  }

  if (q.options.length < 2) {
    errors.push({
      code: ErrorCodes.INSUFFICIENT_OPTIONS,
      message: 'Single-choice question must have at least 2 options',
      questionId,
      questionType: 'single-choice',
      path: `${basePath}.options`,
    });
  }

  // Validate options and collect IDs
  const optionIds = validateOptions(q.options, basePath, questionId, 'single-choice', errors);

  // Validate correct field
  if (q.correct === undefined || q.correct === null) {
    errors.push({
      code: ErrorCodes.MISSING_CORRECT,
      message: 'Single-choice question must have a correct option id',
      questionId,
      questionType: 'single-choice',
      path: `${basePath}.correct`,
    });
    return;
  }

  if (typeof q.correct !== 'string') {
    errors.push({
      code: ErrorCodes.INVALID_CORRECT_TYPE,
      message: 'Single-choice correct must be a string (option id)',
      questionId,
      questionType: 'single-choice',
      path: `${basePath}.correct`,
    });
    return;
  }

  // Check that correct option exists
  if (!optionIds.has(q.correct)) {
    errors.push({
      code: ErrorCodes.INVALID_OPTION_REFERENCE,
      message: `correct option "${q.correct}" does not exist in options[]`,
      questionId,
      questionType: 'single-choice',
      path: `${basePath}.correct`,
    });
  }
}

/**
 * Validate a multiple-response question
 */
function validateMultipleResponseQuestion(
  q: Record<string, unknown>,
  basePath: string,
  questionId: string | undefined,
  errors: QuizValidationError[]
): void {
  // Validate options array
  if (!q.options || !Array.isArray(q.options)) {
    errors.push({
      code: ErrorCodes.MISSING_OPTIONS,
      message: 'Multiple-response question must have an options array',
      questionId,
      questionType: 'multiple-response',
      path: `${basePath}.options`,
    });
    return;
  }

  if (q.options.length < 2) {
    errors.push({
      code: ErrorCodes.INSUFFICIENT_OPTIONS,
      message: 'Multiple-response question must have at least 2 options',
      questionId,
      questionType: 'multiple-response',
      path: `${basePath}.options`,
    });
  }

  // Validate options and collect IDs
  const optionIds = validateOptions(q.options, basePath, questionId, 'multiple-response', errors);

  // Validate correct field
  if (q.correct === undefined || q.correct === null) {
    errors.push({
      code: ErrorCodes.MISSING_CORRECT,
      message: 'Multiple-response question must have a correct array of option ids',
      questionId,
      questionType: 'multiple-response',
      path: `${basePath}.correct`,
    });
    return;
  }

  if (!Array.isArray(q.correct)) {
    errors.push({
      code: ErrorCodes.INVALID_CORRECT_TYPE,
      message: 'Multiple-response correct must be an array of option ids',
      questionId,
      questionType: 'multiple-response',
      path: `${basePath}.correct`,
    });
    return;
  }

  if (q.correct.length === 0) {
    errors.push({
      code: ErrorCodes.EMPTY_CORRECT_ARRAY,
      message: 'Multiple-response correct array must not be empty',
      questionId,
      questionType: 'multiple-response',
      path: `${basePath}.correct`,
    });
    return;
  }

  // Check that all correct options exist
  for (let i = 0; i < q.correct.length; i++) {
    const correctId = q.correct[i];
    if (typeof correctId !== 'string') {
      errors.push({
        code: ErrorCodes.INVALID_CORRECT_TYPE,
        message: `correct[${i}] must be a string, got ${typeof correctId}`,
        questionId,
        questionType: 'multiple-response',
        path: `${basePath}.correct[${i}]`,
      });
      continue;
    }

    if (!optionIds.has(correctId)) {
      errors.push({
        code: ErrorCodes.INVALID_OPTION_REFERENCE,
        message: `correct option "${correctId}" does not exist in options[]`,
        questionId,
        questionType: 'multiple-response',
        path: `${basePath}.correct[${i}]`,
      });
    }
  }
}

/**
 * Validate a true-false question
 */
function validateTrueFalseQuestion(
  q: Record<string, unknown>,
  basePath: string,
  questionId: string | undefined,
  errors: QuizValidationError[]
): void {
  if (q.correct === undefined || q.correct === null) {
    errors.push({
      code: ErrorCodes.MISSING_CORRECT,
      message: 'True-false question must have a correct value (true or false)',
      questionId,
      questionType: 'true-false',
      path: `${basePath}.correct`,
    });
    return;
  }

  if (typeof q.correct !== 'boolean') {
    errors.push({
      code: ErrorCodes.INVALID_BOOLEAN_CORRECT,
      message: `True-false correct must be a boolean (true or false), got ${typeof q.correct}`,
      questionId,
      questionType: 'true-false',
      path: `${basePath}.correct`,
    });
  }
}

/**
 * Validate a fill-blank question
 */
function validateFillBlankQuestion(
  q: Record<string, unknown>,
  basePath: string,
  questionId: string | undefined,
  errors: QuizValidationError[]
): void {
  // Validate text field
  if (q.text === undefined || q.text === null) {
    errors.push({
      code: ErrorCodes.MISSING_TEXT,
      message: 'Fill-blank question must have a text field',
      questionId,
      questionType: 'fill-blank',
      path: `${basePath}.text`,
    });
  }

  if (q.text !== undefined && typeof q.text !== 'string') {
    errors.push({
      code: ErrorCodes.MISSING_TEXT,
      message: 'Fill-blank text must be a string',
      questionId,
      questionType: 'fill-blank',
      path: `${basePath}.text`,
    });
  }

  // Validate blanks array
  if (q.blanks === undefined || q.blanks === null) {
    errors.push({
      code: ErrorCodes.MISSING_BLANKS,
      message: 'Fill-blank question must have a blanks array',
      questionId,
      questionType: 'fill-blank',
      path: `${basePath}.blanks`,
    });
    return;
  }

  if (!Array.isArray(q.blanks)) {
    errors.push({
      code: ErrorCodes.MISSING_BLANKS,
      message: 'Fill-blank blanks must be an array',
      questionId,
      questionType: 'fill-blank',
      path: `${basePath}.blanks`,
    });
    return;
  }

  if (q.blanks.length === 0) {
    errors.push({
      code: ErrorCodes.EMPTY_BLANKS,
      message: 'Fill-blank blanks array must not be empty',
      questionId,
      questionType: 'fill-blank',
      path: `${basePath}.blanks`,
    });
    return;
  }

  // Extract blank IDs from text
  const textBlankIds = new Set<string>();
  if (typeof q.text === 'string') {
    const blankPattern = /\[\[(\w+)\]\]/g;
    let match;
    while ((match = blankPattern.exec(q.text)) !== null) {
      textBlankIds.add(match[1]);
    }
  }

  // Validate each blank and collect IDs
  const blankIds = new Set<string>();
  for (let i = 0; i < q.blanks.length; i++) {
    const blank = q.blanks[i];
    const blankPath = `${basePath}.blanks[${i}]`;

    if (!blank || typeof blank !== 'object') {
      errors.push({
        code: 'INVALID_BLANK_FORMAT',
        message: 'Each blank must be an object',
        questionId,
        questionType: 'fill-blank',
        path: blankPath,
      });
      continue;
    }

    const b = blank as Record<string, unknown>;

    // Validate blank id
    if (b.id === undefined || b.id === null || typeof b.id !== 'string' || b.id.trim() === '') {
      errors.push({
        code: ErrorCodes.MISSING_BLANK_IN_TEXT,
        message: 'Each blank must have an id',
        questionId,
        questionType: 'fill-blank',
        path: `${blankPath}.id`,
      });
      continue;
    }

    // Check for duplicate blank IDs
    if (blankIds.has(b.id)) {
      errors.push({
        code: ErrorCodes.DUPLICATE_BLANK_ID,
        message: `Duplicate blank id "${b.id}"`,
        questionId,
        questionType: 'fill-blank',
        path: `${blankPath}.id`,
      });
    } else {
      blankIds.add(b.id);
    }

    // Validate correct_answers
    if (b.correct_answers === undefined || b.correct_answers === null) {
      errors.push({
        code: ErrorCodes.MISSING_CORRECT_ANSWERS,
        message: `Blank "${b.id}" must have correct_answers`,
        questionId,
        questionType: 'fill-blank',
        path: `${blankPath}.correct_answers`,
      });
    } else if (!Array.isArray(b.correct_answers)) {
      errors.push({
        code: ErrorCodes.MISSING_CORRECT_ANSWERS,
        message: `Blank "${b.id}" correct_answers must be an array`,
        questionId,
        questionType: 'fill-blank',
        path: `${blankPath}.correct_answers`,
      });
    } else if (b.correct_answers.length === 0) {
      errors.push({
        code: ErrorCodes.EMPTY_CORRECT_ANSWERS,
        message: `Blank "${b.id}" correct_answers must not be empty`,
        questionId,
        questionType: 'fill-blank',
        path: `${blankPath}.correct_answers`,
      });
    }
  }

  // Check for blanks in array that don't exist in text
  for (const blankId of blankIds) {
    if (!textBlankIds.has(blankId)) {
      errors.push({
        code: ErrorCodes.EXTRA_BLANK_IN_ARRAY,
        message: `Blank "${blankId}" defined in blanks[] but not found in text as [[${blankId}]]`,
        questionId,
        questionType: 'fill-blank',
        path: `${basePath}.blanks`,
      });
    }
  }

  // Check for blanks in text that don't exist in array
  for (const textBlankId of textBlankIds) {
    if (!blankIds.has(textBlankId)) {
      errors.push({
        code: ErrorCodes.MISSING_BLANK_IN_TEXT,
        message: `Blank "[[${textBlankId}]]" found in text but not defined in blanks[]`,
        questionId,
        questionType: 'fill-blank',
        path: `${basePath}.text`,
      });
    }
  }
}

/**
 * Validate a matching question
 */
function validateMatchingQuestion(
  q: Record<string, unknown>,
  basePath: string,
  questionId: string | undefined,
  errors: QuizValidationError[]
): void {
  // Validate premises
  if (q.premises === undefined || q.premises === null) {
    errors.push({
      code: ErrorCodes.MISSING_PREMISES,
      message: 'Matching question must have a premises array',
      questionId,
      questionType: 'matching',
      path: `${basePath}.premises`,
    });
  } else if (!Array.isArray(q.premises)) {
    errors.push({
      code: ErrorCodes.MISSING_PREMISES,
      message: 'Matching premises must be an array',
      questionId,
      questionType: 'matching',
      path: `${basePath}.premises`,
    });
  } else if (q.premises.length === 0) {
    errors.push({
      code: ErrorCodes.EMPTY_PREMISES,
      message: 'Matching premises array must not be empty',
      questionId,
      questionType: 'matching',
      path: `${basePath}.premises`,
    });
  }

  // Validate responses
  if (q.responses === undefined || q.responses === null) {
    errors.push({
      code: ErrorCodes.MISSING_RESPONSES,
      message: 'Matching question must have a responses array',
      questionId,
      questionType: 'matching',
      path: `${basePath}.responses`,
    });
  } else if (!Array.isArray(q.responses)) {
    errors.push({
      code: ErrorCodes.MISSING_RESPONSES,
      message: 'Matching responses must be an array',
      questionId,
      questionType: 'matching',
      path: `${basePath}.responses`,
    });
  } else if (q.responses.length === 0) {
    errors.push({
      code: ErrorCodes.EMPTY_RESPONSES,
      message: 'Matching responses array must not be empty',
      questionId,
      questionType: 'matching',
      path: `${basePath}.responses`,
    });
  }

  // Validate correct_pairs
  if (q.correct_pairs === undefined || q.correct_pairs === null) {
    errors.push({
      code: ErrorCodes.MISSING_CORRECT_PAIRS,
      message: 'Matching question must have a correct_pairs array',
      questionId,
      questionType: 'matching',
      path: `${basePath}.correct_pairs`,
    });
  } else if (!Array.isArray(q.correct_pairs)) {
    errors.push({
      code: ErrorCodes.MISSING_CORRECT_PAIRS,
      message: 'Matching correct_pairs must be an array',
      questionId,
      questionType: 'matching',
      path: `${basePath}.correct_pairs`,
    });
  } else if (q.correct_pairs.length === 0) {
    errors.push({
      code: ErrorCodes.EMPTY_CORRECT_PAIRS,
      message: 'Matching correct_pairs array must not be empty',
      questionId,
      questionType: 'matching',
      path: `${basePath}.correct_pairs`,
    });
  }

  // Collect and validate premise IDs
  const premiseIds = new Set<string>();
  if (Array.isArray(q.premises)) {
    for (let i = 0; i < q.premises.length; i++) {
      const premise = q.premises[i];
      const premisePath = `${basePath}.premises[${i}]`;

      if (!premise || typeof premise !== 'object') {
        continue;
      }

      const p = premise as Record<string, unknown>;
      if (typeof p.id === 'string' && p.id.trim() !== '') {
        if (premiseIds.has(p.id)) {
          errors.push({
            code: ErrorCodes.DUPLICATE_PREMISE_ID,
            message: `Duplicate premise id "${p.id}"`,
            questionId,
            questionType: 'matching',
            path: `${premisePath}.id`,
          });
        } else {
          premiseIds.add(p.id);
        }
      }
    }
  }

  // Collect and validate response IDs
  const responseIds = new Set<string>();
  if (Array.isArray(q.responses)) {
    for (let i = 0; i < q.responses.length; i++) {
      const response = q.responses[i];
      const responsePath = `${basePath}.responses[${i}]`;

      if (!response || typeof response !== 'object') {
        continue;
      }

      const r = response as Record<string, unknown>;
      if (typeof r.id === 'string' && r.id.trim() !== '') {
        if (responseIds.has(r.id)) {
          errors.push({
            code: ErrorCodes.DUPLICATE_RESPONSE_ID,
            message: `Duplicate response id "${r.id}"`,
            questionId,
            questionType: 'matching',
            path: `${responsePath}.id`,
          });
        } else {
          responseIds.add(r.id);
        }
      }
    }
  }

  // Validate correct_pairs references
  if (Array.isArray(q.correct_pairs)) {
    for (let i = 0; i < q.correct_pairs.length; i++) {
      const pair = q.correct_pairs[i];
      const pairPath = `${basePath}.correct_pairs[${i}]`;

      if (!pair || typeof pair !== 'object') {
        continue;
      }

      const cp = pair as Record<string, unknown>;

      // Check premise reference
      if (typeof cp.premise === 'string' && !premiseIds.has(cp.premise)) {
        errors.push({
          code: ErrorCodes.INVALID_PREMISE_REFERENCE,
          message: `correct_pairs[${i}].premise "${cp.premise}" does not exist in premises[]`,
          questionId,
          questionType: 'matching',
          path: `${pairPath}.premise`,
        });
      }

      // Check response reference
      if (typeof cp.response === 'string' && !responseIds.has(cp.response)) {
        errors.push({
          code: ErrorCodes.INVALID_RESPONSE_REFERENCE,
          message: `correct_pairs[${i}].response "${cp.response}" does not exist in responses[]`,
          questionId,
          questionType: 'matching',
          path: `${pairPath}.response`,
        });
      }
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate options array and return set of option IDs
 */
function validateOptions(
  options: unknown[],
  basePath: string,
  questionId: string | undefined,
  questionType: QuestionType,
  errors: QuizValidationError[]
): Set<string> {
  const optionIds = new Set<string>();

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const optionPath = `${basePath}.options[${i}]`;

    if (!option || typeof option !== 'object') {
      errors.push({
        code: 'INVALID_OPTION_FORMAT',
        message: 'Each option must be an object with id and text',
        questionId,
        questionType,
        path: optionPath,
      });
      continue;
    }

    const opt = option as Record<string, unknown>;

    // Validate option id
    if (opt.id === undefined || opt.id === null || typeof opt.id !== 'string' || opt.id.trim() === '') {
      errors.push({
        code: 'MISSING_OPTION_ID',
        message: 'Each option must have an id',
        questionId,
        questionType,
        path: `${optionPath}.id`,
      });
      continue;
    }

    // Check for duplicate option IDs
    if (optionIds.has(opt.id)) {
      errors.push({
        code: ErrorCodes.DUPLICATE_OPTION_ID,
        message: `Duplicate option id "${opt.id}"`,
        questionId,
        questionType,
        path: `${optionPath}.id`,
      });
    } else {
      optionIds.add(opt.id);
    }
  }

  return optionIds;
}

/**
 * Validate a required field exists and has correct type
 */
function validateRequiredField(
  obj: Record<string, unknown>,
  field: string,
  expectedType: string,
  basePath: string,
  errors: QuizValidationError[],
  errorCode: string,
  questionId?: string
): boolean {
  const path = basePath ? `${basePath}.${field}` : field;

  if (obj[field] === undefined || obj[field] === null) {
    errors.push({
      code: errorCode,
      message: `Missing required field "${field}"`,
      questionId,
      path,
    });
    return false;
  }

  if (expectedType === 'string' && (typeof obj[field] !== 'string' || (obj[field] as string).trim() === '')) {
    errors.push({
      code: errorCode,
      message: `Field "${field}" must be a non-empty string`,
      questionId,
      path,
    });
    return false;
  }

  return true;
}
