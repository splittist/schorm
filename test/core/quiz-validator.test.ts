import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  validateQuizFile,
  validateQuiz,
  ErrorCodes,
  type QuizValidationError,
  type QuizValidationResult,
} from '../../src/core/quiz-validator.js';

const TEST_DIR = path.join(__dirname, '..', '..', 'test-output', 'quiz-validation');

describe('Quiz Validator', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  // Helper function to write quiz YAML and validate
  function writeAndValidateQuiz(quiz: object): QuizValidationResult {
    const quizPath = path.join(TEST_DIR, 'test-quiz.yml');
    fs.writeFileSync(quizPath, yaml.stringify(quiz), 'utf-8');
    return validateQuizFile(quizPath);
  }

  describe('Valid Quiz', () => {
    it('should pass validation for a valid single-choice quiz', () => {
      const quiz = {
        id: 'valid-quiz',
        module: 'm1',
        title: 'Valid Quiz',
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'What is 2+2?',
            options: [
              { id: 'a', text: '3' },
              { id: 'b', text: '4' },
              { id: 'c', text: '5' },
            ],
            correct: 'b',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('ok');
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for a valid multiple-response quiz', () => {
      const quiz = {
        id: 'mr-quiz',
        module: 'm1',
        title: 'Multiple Response Quiz',
        questions: [
          {
            id: 'q1',
            type: 'multiple-response',
            prompt: 'Which are prime numbers?',
            options: [
              { id: 'a', text: '2' },
              { id: 'b', text: '3' },
              { id: 'c', text: '4' },
            ],
            correct: ['a', 'b'],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('ok');
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for a valid true-false quiz', () => {
      const quiz = {
        id: 'tf-quiz',
        module: 'm1',
        title: 'True/False Quiz',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'The sky is blue.',
            correct: true,
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('ok');
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for a valid fill-blank quiz', () => {
      const quiz = {
        id: 'fb-quiz',
        module: 'm1',
        title: 'Fill-in-the-Blank Quiz',
        questions: [
          {
            id: 'q1',
            type: 'fill-blank',
            prompt: 'Complete the sentence:',
            text: 'The capital of France is [[capital]].',
            blanks: [
              {
                id: 'capital',
                correct_answers: ['Paris', 'paris'],
              },
            ],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('ok');
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for a valid matching quiz', () => {
      const quiz = {
        id: 'matching-quiz',
        module: 'm1',
        title: 'Matching Quiz',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match countries to capitals:',
            premises: [
              { id: 'p1', text: 'France' },
              { id: 'p2', text: 'Germany' },
            ],
            responses: [
              { id: 'r1', text: 'Paris' },
              { id: 'r2', text: 'Berlin' },
            ],
            correct_pairs: [
              { premise: 'p1', response: 'r1' },
              { premise: 'p2', response: 'r2' },
            ],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('ok');
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation with passing_score in valid range', () => {
      const quiz = {
        id: 'passing-score-quiz',
        module: 'm1',
        title: 'Quiz with Passing Score',
        passing_score: 0.8,
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True or false?',
            correct: true,
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('ok');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Quiz-level Validation Errors', () => {
    it('should fail when id is missing', () => {
      const quiz = {
        module: 'm1',
        title: 'Missing ID Quiz',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True?',
            correct: true,
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_ID)).toBe(true);
    });

    it('should fail when module is missing', () => {
      const quiz = {
        id: 'no-module-quiz',
        title: 'Missing Module Quiz',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True?',
            correct: true,
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_MODULE)).toBe(true);
    });

    it('should fail when title is missing', () => {
      const quiz = {
        id: 'no-title-quiz',
        module: 'm1',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True?',
            correct: true,
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_TITLE)).toBe(true);
    });

    it('should fail when questions is missing', () => {
      const quiz = {
        id: 'no-questions-quiz',
        module: 'm1',
        title: 'No Questions Quiz',
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_QUESTIONS)).toBe(true);
    });

    it('should fail when questions array is empty', () => {
      const quiz = {
        id: 'empty-questions-quiz',
        module: 'm1',
        title: 'Empty Questions Quiz',
        questions: [],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.EMPTY_QUESTIONS)).toBe(true);
    });

    it('should fail when passing_score is out of range', () => {
      const quiz1 = {
        id: 'low-passing-score',
        module: 'm1',
        title: 'Quiz',
        passing_score: -0.1,
        questions: [
          { id: 'q1', type: 'true-false', prompt: 'True?', correct: true },
        ],
      };

      const quiz2 = {
        id: 'high-passing-score',
        module: 'm1',
        title: 'Quiz',
        passing_score: 1.5,
        questions: [
          { id: 'q1', type: 'true-false', prompt: 'True?', correct: true },
        ],
      };

      const result1 = writeAndValidateQuiz(quiz1);
      expect(result1.status).toBe('error');
      expect(result1.errors.some((e) => e.code === ErrorCodes.INVALID_PASSING_SCORE)).toBe(true);

      const result2 = writeAndValidateQuiz(quiz2);
      expect(result2.status).toBe('error');
      expect(result2.errors.some((e) => e.code === ErrorCodes.INVALID_PASSING_SCORE)).toBe(true);
    });

    it('should fail when there are duplicate question IDs', () => {
      const quiz = {
        id: 'dup-q-id',
        module: 'm1',
        title: 'Duplicate Question IDs',
        questions: [
          { id: 'q1', type: 'true-false', prompt: 'Question 1', correct: true },
          { id: 'q1', type: 'true-false', prompt: 'Question 2', correct: false },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.DUPLICATE_QUESTION_ID)).toBe(true);
    });
  });

  describe('Question-level Validation Errors', () => {
    it('should fail when question type is unknown', () => {
      const quiz = {
        id: 'unknown-type',
        module: 'm1',
        title: 'Unknown Type Quiz',
        questions: [
          {
            id: 'q1',
            type: 'unknown-type',
            prompt: 'What?',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.UNKNOWN_QUESTION_TYPE)).toBe(true);
    });

    it('should fail when question id is missing', () => {
      const quiz = {
        id: 'missing-q-id',
        module: 'm1',
        title: 'Missing Q ID',
        questions: [
          {
            type: 'true-false',
            prompt: 'True?',
            correct: true,
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_QUESTION_ID)).toBe(true);
    });

    it('should fail when question prompt is missing', () => {
      const quiz = {
        id: 'missing-prompt',
        module: 'm1',
        title: 'Missing Prompt',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            correct: true,
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_PROMPT)).toBe(true);
    });
  });

  describe('Single-choice Question Validation', () => {
    it('should fail when options is missing', () => {
      const quiz = {
        id: 'sc-no-options',
        module: 'm1',
        title: 'Single Choice No Options',
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'What?',
            correct: 'a',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_OPTIONS)).toBe(true);
    });

    it('should fail when options has less than 2 items', () => {
      const quiz = {
        id: 'sc-one-option',
        module: 'm1',
        title: 'Single Choice One Option',
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'What?',
            options: [{ id: 'a', text: 'Only option' }],
            correct: 'a',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.INSUFFICIENT_OPTIONS)).toBe(true);
    });

    it('should fail when correct option id does not exist', () => {
      const quiz = {
        id: 'sc-bad-correct',
        module: 'm1',
        title: 'Bad Correct Option',
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'What?',
            options: [
              { id: 'a', text: 'Option A' },
              { id: 'b', text: 'Option B' },
            ],
            correct: 'z',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.INVALID_OPTION_REFERENCE)).toBe(true);
      expect(result.errors[0].message).toContain('z');
    });

    it('should fail when there are duplicate option IDs', () => {
      const quiz = {
        id: 'sc-dup-option',
        module: 'm1',
        title: 'Duplicate Options',
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'What?',
            options: [
              { id: 'a', text: 'Option 1' },
              { id: 'a', text: 'Option 2' },
            ],
            correct: 'a',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.DUPLICATE_OPTION_ID)).toBe(true);
    });
  });

  describe('Multiple-response Question Validation', () => {
    it('should fail when correct is not an array', () => {
      const quiz = {
        id: 'mr-string-correct',
        module: 'm1',
        title: 'String Correct',
        questions: [
          {
            id: 'q1',
            type: 'multiple-response',
            prompt: 'Select all?',
            options: [
              { id: 'a', text: 'Option A' },
              { id: 'b', text: 'Option B' },
            ],
            correct: 'a',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.INVALID_CORRECT_TYPE)).toBe(true);
    });

    it('should fail when correct array is empty', () => {
      const quiz = {
        id: 'mr-empty-correct',
        module: 'm1',
        title: 'Empty Correct',
        questions: [
          {
            id: 'q1',
            type: 'multiple-response',
            prompt: 'Select all?',
            options: [
              { id: 'a', text: 'Option A' },
              { id: 'b', text: 'Option B' },
            ],
            correct: [],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.EMPTY_CORRECT_ARRAY)).toBe(true);
    });

    it('should fail when correct contains non-existent option IDs', () => {
      const quiz = {
        id: 'mr-bad-correct',
        module: 'm1',
        title: 'Bad Correct IDs',
        questions: [
          {
            id: 'q1',
            type: 'multiple-response',
            prompt: 'Select all?',
            options: [
              { id: 'a', text: 'Option A' },
              { id: 'b', text: 'Option B' },
            ],
            correct: ['a', 'z'],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.INVALID_OPTION_REFERENCE)).toBe(true);
    });
  });

  describe('True-false Question Validation', () => {
    it('should fail when correct is not a boolean', () => {
      const quiz = {
        id: 'tf-string-correct',
        module: 'm1',
        title: 'String Correct',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True or false?',
            correct: 'true',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.INVALID_BOOLEAN_CORRECT)).toBe(true);
    });

    it('should fail when correct is missing', () => {
      const quiz = {
        id: 'tf-no-correct',
        module: 'm1',
        title: 'No Correct',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True or false?',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_CORRECT)).toBe(true);
    });
  });

  describe('Fill-blank Question Validation', () => {
    it('should fail when text is missing', () => {
      const quiz = {
        id: 'fb-no-text',
        module: 'm1',
        title: 'No Text',
        questions: [
          {
            id: 'q1',
            type: 'fill-blank',
            prompt: 'Fill in:',
            blanks: [{ id: 'b1', correct_answers: ['answer'] }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_TEXT)).toBe(true);
    });

    it('should fail when blanks array is missing', () => {
      const quiz = {
        id: 'fb-no-blanks',
        module: 'm1',
        title: 'No Blanks',
        questions: [
          {
            id: 'q1',
            type: 'fill-blank',
            prompt: 'Fill in:',
            text: 'The answer is [[b1]].',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_BLANKS)).toBe(true);
    });

    it('should fail when blank in text is not defined in blanks array', () => {
      const quiz = {
        id: 'fb-missing-blank-def',
        module: 'm1',
        title: 'Missing Blank Def',
        questions: [
          {
            id: 'q1',
            type: 'fill-blank',
            prompt: 'Fill in:',
            text: 'The answer is [[b1]] and [[b2]].',
            blanks: [{ id: 'b1', correct_answers: ['answer'] }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_BLANK_IN_TEXT)).toBe(true);
      expect(result.errors.some((e) => e.message.includes('b2'))).toBe(true);
    });

    it('should fail when blank is defined but not in text', () => {
      const quiz = {
        id: 'fb-extra-blank',
        module: 'm1',
        title: 'Extra Blank',
        questions: [
          {
            id: 'q1',
            type: 'fill-blank',
            prompt: 'Fill in:',
            text: 'The answer is [[b1]].',
            blanks: [
              { id: 'b1', correct_answers: ['answer1'] },
              { id: 'b2', correct_answers: ['answer2'] },
            ],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.EXTRA_BLANK_IN_ARRAY)).toBe(true);
    });

    it('should fail when correct_answers is missing or empty', () => {
      const quiz = {
        id: 'fb-no-answers',
        module: 'm1',
        title: 'No Answers',
        questions: [
          {
            id: 'q1',
            type: 'fill-blank',
            prompt: 'Fill in:',
            text: 'The answer is [[b1]].',
            blanks: [{ id: 'b1', correct_answers: [] }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.EMPTY_CORRECT_ANSWERS)).toBe(true);
    });

    it('should fail when there are duplicate blank IDs', () => {
      const quiz = {
        id: 'fb-dup-blank',
        module: 'm1',
        title: 'Duplicate Blanks',
        questions: [
          {
            id: 'q1',
            type: 'fill-blank',
            prompt: 'Fill in:',
            text: 'The answer is [[b1]] and [[b1]].',
            blanks: [
              { id: 'b1', correct_answers: ['answer1'] },
              { id: 'b1', correct_answers: ['answer2'] },
            ],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.DUPLICATE_BLANK_ID)).toBe(true);
    });
  });

  describe('Matching Question Validation', () => {
    it('should fail when premises is missing', () => {
      const quiz = {
        id: 'match-no-premises',
        module: 'm1',
        title: 'No Premises',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match:',
            responses: [{ id: 'r1', text: 'Response 1' }],
            correct_pairs: [{ premise: 'p1', response: 'r1' }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_PREMISES)).toBe(true);
    });

    it('should fail when responses is missing', () => {
      const quiz = {
        id: 'match-no-responses',
        module: 'm1',
        title: 'No Responses',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match:',
            premises: [{ id: 'p1', text: 'Premise 1' }],
            correct_pairs: [{ premise: 'p1', response: 'r1' }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_RESPONSES)).toBe(true);
    });

    it('should fail when correct_pairs is missing', () => {
      const quiz = {
        id: 'match-no-pairs',
        module: 'm1',
        title: 'No Pairs',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match:',
            premises: [{ id: 'p1', text: 'Premise 1' }],
            responses: [{ id: 'r1', text: 'Response 1' }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.MISSING_CORRECT_PAIRS)).toBe(true);
    });

    it('should fail when correct_pairs references non-existent premise', () => {
      const quiz = {
        id: 'match-bad-premise',
        module: 'm1',
        title: 'Bad Premise Ref',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match:',
            premises: [{ id: 'p1', text: 'Premise 1' }],
            responses: [{ id: 'r1', text: 'Response 1' }],
            correct_pairs: [{ premise: 'p999', response: 'r1' }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.INVALID_PREMISE_REFERENCE)).toBe(true);
    });

    it('should fail when correct_pairs references non-existent response', () => {
      const quiz = {
        id: 'match-bad-response',
        module: 'm1',
        title: 'Bad Response Ref',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match:',
            premises: [{ id: 'p1', text: 'Premise 1' }],
            responses: [{ id: 'r1', text: 'Response 1' }],
            correct_pairs: [{ premise: 'p1', response: 'r999' }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.INVALID_RESPONSE_REFERENCE)).toBe(true);
    });

    it('should fail when there are duplicate premise IDs', () => {
      const quiz = {
        id: 'match-dup-premise',
        module: 'm1',
        title: 'Dup Premise',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match:',
            premises: [
              { id: 'p1', text: 'Premise 1' },
              { id: 'p1', text: 'Premise 2' },
            ],
            responses: [{ id: 'r1', text: 'Response 1' }],
            correct_pairs: [{ premise: 'p1', response: 'r1' }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.DUPLICATE_PREMISE_ID)).toBe(true);
    });

    it('should fail when there are duplicate response IDs', () => {
      const quiz = {
        id: 'match-dup-response',
        module: 'm1',
        title: 'Dup Response',
        questions: [
          {
            id: 'q1',
            type: 'matching',
            prompt: 'Match:',
            premises: [{ id: 'p1', text: 'Premise 1' }],
            responses: [
              { id: 'r1', text: 'Response 1' },
              { id: 'r1', text: 'Response 2' },
            ],
            correct_pairs: [{ premise: 'p1', response: 'r1' }],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.some((e) => e.code === ErrorCodes.DUPLICATE_RESPONSE_ID)).toBe(true);
    });
  });

  describe('Error Accumulation', () => {
    it('should accumulate all errors in a quiz with multiple issues', () => {
      const quiz = {
        id: 'multi-error-quiz',
        module: 'm1',
        title: 'Multi Error Quiz',
        passing_score: 2.0, // Error: out of range
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'Question 1',
            options: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
            ],
            correct: 'z', // Error: invalid reference
          },
          {
            id: 'q1', // Error: duplicate ID
            type: 'unknown-type', // Error: unknown type
            prompt: 'Question 2',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('File Not Found', () => {
    it('should return error when file does not exist', () => {
      const result = validateQuizFile('/nonexistent/quiz.yml');
      expect(result.status).toBe('error');
      expect(result.errors[0].code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('YAML Parse Error', () => {
    it('should return error when YAML is invalid', () => {
      const quizPath = path.join(TEST_DIR, 'invalid.yml');
      fs.writeFileSync(quizPath, 'invalid: yaml: content: [', 'utf-8');

      const result = validateQuizFile(quizPath);
      expect(result.status).toBe('error');
      expect(result.errors[0].code).toBe('YAML_PARSE_ERROR');
    });
  });

  describe('LLM-friendly Error Format', () => {
    it('should include questionId in error messages', () => {
      const quiz = {
        id: 'llm-test',
        module: 'm1',
        title: 'LLM Test',
        questions: [
          {
            id: 'special-q-123',
            type: 'single-choice',
            prompt: 'What?',
            options: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
            ],
            correct: 'z',
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      const error = result.errors.find((e) => e.code === ErrorCodes.INVALID_OPTION_REFERENCE);
      expect(error).toBeDefined();
      expect(error?.questionId).toBe('special-q-123');
      expect(error?.questionType).toBe('single-choice');
      expect(error?.path).toContain('correct');
    });

    it('should include path in error messages for precise location', () => {
      const quiz = {
        id: 'path-test',
        module: 'm1',
        title: 'Path Test',
        questions: [
          { id: 'q1', type: 'true-false', prompt: 'True?', correct: true },
          {
            id: 'q2',
            type: 'multiple-response',
            prompt: 'Select:',
            options: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
            ],
            correct: ['a', 'invalid'],
          },
        ],
      };

      const result = writeAndValidateQuiz(quiz);
      expect(result.status).toBe('error');
      const error = result.errors.find((e) => e.code === ErrorCodes.INVALID_OPTION_REFERENCE);
      expect(error).toBeDefined();
      expect(error?.path).toBe('questions[1].correct[1]');
    });
  });

  describe('validateQuiz function (direct object validation)', () => {
    it('should validate quiz object directly without file', () => {
      const errors: QuizValidationError[] = [];
      const quiz = {
        id: 'direct-quiz',
        module: 'm1',
        title: 'Direct Quiz',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True?',
            correct: true,
          },
        ],
      };

      validateQuiz(quiz, errors);
      expect(errors).toHaveLength(0);
    });

    it('should collect errors in provided array', () => {
      const errors: QuizValidationError[] = [];
      const quiz = {
        // Missing id
        module: 'm1',
        title: 'No ID',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True?',
            correct: true,
          },
        ],
      };

      validateQuiz(quiz, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ErrorCodes.MISSING_ID)).toBe(true);
    });
  });
});
