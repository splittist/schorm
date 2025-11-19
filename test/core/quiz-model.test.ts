import { describe, it, expect } from 'vitest';
import type {
  Quiz,
  Question,
  SingleChoiceQuestion,
  MultipleResponseQuestion,
  TrueFalseQuestion,
  FillBlankQuestion,
  MatchingQuestion,
  Option,
  ScoringConfig,
  FillBlankSpec,
  MatchingPremise,
  MatchingResponse,
  MatchingPair,
  GlobalFeedback,
} from '../../src/core/quiz-model.js';

describe('Quiz Model Type Definitions', () => {
  describe('SingleChoiceQuestion', () => {
    it('should accept a valid single-choice question', () => {
      const question: SingleChoiceQuestion = {
        id: 'q1',
        type: 'single-choice',
        prompt: 'What is the capital of France?',
        options: [
          { id: 'a', text: 'Paris' },
          { id: 'b', text: 'London' },
          { id: 'c', text: 'Berlin' },
        ],
        correct: 'a',
      };

      expect(question.type).toBe('single-choice');
      expect(question.options).toHaveLength(3);
      expect(question.correct).toBe('a');
    });

    it('should accept optional fields', () => {
      const question: SingleChoiceQuestion = {
        id: 'q1',
        type: 'single-choice',
        prompt: 'What is 2 + 2?',
        options: [
          { id: 'a', text: '3' },
          { id: 'b', text: '4', feedback: 'Correct!' },
        ],
        correct: 'b',
        points: 5,
        shuffle_options: true,
        feedback: {
          correct: 'Well done!',
          incorrect: 'Try again.',
        },
        tags: ['math', 'basic'],
      };

      expect(question.points).toBe(5);
      expect(question.shuffle_options).toBe(true);
      expect(question.feedback?.correct).toBe('Well done!');
      expect(question.tags).toContain('math');
    });
  });

  describe('MultipleResponseQuestion', () => {
    it('should accept a valid multiple-response question', () => {
      const question: MultipleResponseQuestion = {
        id: 'q2',
        type: 'multiple-response',
        prompt: 'Which of these are prime numbers?',
        options: [
          { id: 'a', text: '2' },
          { id: 'b', text: '3' },
          { id: 'c', text: '4' },
          { id: 'd', text: '5' },
        ],
        correct: ['a', 'b', 'd'],
      };

      expect(question.type).toBe('multiple-response');
      expect(question.correct).toHaveLength(3);
      expect(question.correct).toContain('a');
      expect(question.correct).toContain('b');
      expect(question.correct).toContain('d');
    });

    it('should accept scoring configuration', () => {
      const scoring: ScoringConfig = {
        mode: 'partial',
        partial: {
          perCorrect: 0.5,
          penaltyPerIncorrect: -0.25,
          minScore: 0,
        },
      };

      const question: MultipleResponseQuestion = {
        id: 'q2',
        type: 'multiple-response',
        prompt: 'Select all that apply',
        options: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
        ],
        correct: ['a'],
        scoring,
      };

      expect(question.scoring?.mode).toBe('partial');
      expect(question.scoring?.partial?.perCorrect).toBe(0.5);
    });
  });

  describe('TrueFalseQuestion', () => {
    it('should accept a valid true/false question', () => {
      const question: TrueFalseQuestion = {
        id: 'q3',
        type: 'true-false',
        prompt: 'The Earth is flat.',
        correct: false,
      };

      expect(question.type).toBe('true-false');
      expect(question.correct).toBe(false);
    });

    it('should accept feedback for true/false', () => {
      const question: TrueFalseQuestion = {
        id: 'q3',
        type: 'true-false',
        prompt: 'TypeScript is a superset of JavaScript.',
        correct: true,
        feedback: {
          correct: 'Correct! TypeScript adds static typing to JavaScript.',
          incorrect: 'Not quite. TypeScript extends JavaScript with types.',
        },
      };

      expect(question.correct).toBe(true);
      expect(question.feedback?.correct).toContain('TypeScript');
    });
  });

  describe('FillBlankQuestion', () => {
    it('should accept a valid fill-blank question with one blank', () => {
      const question: FillBlankQuestion = {
        id: 'q4',
        type: 'fill-blank',
        prompt: 'Complete the sentence:',
        text: 'The capital of France is [[blank1]].',
        blanks: [
          {
            id: 'blank1',
            correct_answers: ['Paris', 'paris'],
            case_sensitive: false,
          },
        ],
      };

      expect(question.type).toBe('fill-blank');
      expect(question.blanks).toHaveLength(1);
      expect(question.blanks[0].correct_answers).toContain('Paris');
    });

    it('should accept multiple blanks', () => {
      const question: FillBlankQuestion = {
        id: 'q4',
        type: 'fill-blank',
        prompt: 'Fill in the blanks:',
        text: 'JavaScript was created by [[creator]] in [[year]].',
        blanks: [
          {
            id: 'creator',
            correct_answers: ['Brendan Eich'],
            case_sensitive: true,
          },
          {
            id: 'year',
            correct_answers: ['1995'],
            trim_whitespace: true,
          },
        ],
      };

      expect(question.blanks).toHaveLength(2);
      expect(question.blanks[0].case_sensitive).toBe(true);
      expect(question.blanks[1].trim_whitespace).toBe(true);
    });

    it('should accept per-blank feedback', () => {
      const blankSpec: FillBlankSpec = {
        id: 'blank1',
        correct_answers: ['answer'],
        feedback: {
          correct: 'Great!',
          incorrect: 'Try again.',
        },
      };

      expect(blankSpec.feedback?.correct).toBe('Great!');
    });
  });

  describe('MatchingQuestion', () => {
    it('should accept a valid matching question', () => {
      const question: MatchingQuestion = {
        id: 'q5',
        type: 'matching',
        prompt: 'Match the country to its capital:',
        premises: [
          { id: 'p1', text: 'France' },
          { id: 'p2', text: 'Germany' },
          { id: 'p3', text: 'Italy' },
        ],
        responses: [
          { id: 'r1', text: 'Paris' },
          { id: 'r2', text: 'Berlin' },
          { id: 'r3', text: 'Rome' },
        ],
        correct_pairs: [
          { premise: 'p1', response: 'r1' },
          { premise: 'p2', response: 'r2' },
          { premise: 'p3', response: 'r3' },
        ],
      };

      expect(question.type).toBe('matching');
      expect(question.premises).toHaveLength(3);
      expect(question.responses).toHaveLength(3);
      expect(question.correct_pairs).toHaveLength(3);
    });

    it('should support asymmetric matching (more responses than premises)', () => {
      const question: MatchingQuestion = {
        id: 'q5',
        type: 'matching',
        prompt: 'Match terms to definitions:',
        premises: [
          { id: 'p1', text: 'HTML' },
          { id: 'p2', text: 'CSS' },
        ],
        responses: [
          { id: 'r1', text: 'Markup language' },
          { id: 'r2', text: 'Styling language' },
          { id: 'r3', text: 'Programming language' },
        ],
        correct_pairs: [
          { premise: 'p1', response: 'r1' },
          { premise: 'p2', response: 'r2' },
        ],
      };

      expect(question.premises.length).toBeLessThan(question.responses.length);
      expect(question.correct_pairs).toHaveLength(2);
    });
  });

  describe('Quiz', () => {
    it('should accept a valid quiz with mixed question types', () => {
      const quiz: Quiz = {
        id: 'quiz-1',
        module: 'm1',
        title: 'JavaScript Fundamentals Quiz',
        questions: [
          {
            id: 'q1',
            type: 'single-choice',
            prompt: 'What is JavaScript?',
            options: [
              { id: 'a', text: 'A programming language' },
              { id: 'b', text: 'A coffee brand' },
            ],
            correct: 'a',
          },
          {
            id: 'q2',
            type: 'true-false',
            prompt: 'JavaScript is the same as Java.',
            correct: false,
          },
          {
            id: 'q3',
            type: 'fill-blank',
            prompt: 'Complete:',
            text: 'JavaScript runs in the [[where]].',
            blanks: [
              {
                id: 'where',
                correct_answers: ['browser', 'Browser'],
              },
            ],
          },
        ],
      };

      expect(quiz.questions).toHaveLength(3);
      expect(quiz.questions[0].type).toBe('single-choice');
      expect(quiz.questions[1].type).toBe('true-false');
      expect(quiz.questions[2].type).toBe('fill-blank');
    });

    it('should have required fields', () => {
      const quiz: Quiz = {
        id: 'quiz-1',
        module: 'm1',
        title: 'Test Quiz',
        questions: [
          {
            id: 'q1',
            type: 'true-false',
            prompt: 'True or false?',
            correct: true,
          },
        ],
      };

      expect(quiz.id).toBe('quiz-1');
      expect(quiz.module).toBe('m1');
      expect(quiz.title).toBe('Test Quiz');
      expect(quiz.questions.length).toBeGreaterThan(0);
    });
  });

  describe('Type Discriminated Union', () => {
    it('should allow type narrowing based on question type', () => {
      const questions: Question[] = [
        {
          id: 'q1',
          type: 'single-choice',
          prompt: 'Question 1',
          options: [
            { id: 'a', text: 'A' },
            { id: 'b', text: 'B' },
          ],
          correct: 'a',
        },
        {
          id: 'q2',
          type: 'true-false',
          prompt: 'Question 2',
          correct: true,
        },
      ];

      questions.forEach((q) => {
        if (q.type === 'single-choice') {
          // TypeScript should know this is SingleChoiceQuestion
          expect(q.options).toBeDefined();
          expect(typeof q.correct).toBe('string');
        } else if (q.type === 'true-false') {
          // TypeScript should know this is TrueFalseQuestion
          expect(typeof q.correct).toBe('boolean');
        }
      });
    });
  });

  describe('GlobalFeedback', () => {
    it('should accept optional feedback fields', () => {
      const feedback1: GlobalFeedback = {
        correct: 'Correct!',
      };

      const feedback2: GlobalFeedback = {
        incorrect: 'Try again.',
      };

      const feedback3: GlobalFeedback = {
        correct: 'Well done!',
        incorrect: 'Not quite.',
      };

      expect(feedback1.correct).toBe('Correct!');
      expect(feedback2.incorrect).toBe('Try again.');
      expect(feedback3.correct).toBe('Well done!');
      expect(feedback3.incorrect).toBe('Not quite.');
    });
  });

  describe('Option', () => {
    it('should have required fields', () => {
      const option: Option = {
        id: 'opt1',
        text: 'Option text',
      };

      expect(option.id).toBe('opt1');
      expect(option.text).toBe('Option text');
    });

    it('should accept optional feedback', () => {
      const option: Option = {
        id: 'opt1',
        text: 'Option text',
        feedback: 'This is the correct answer!',
      };

      expect(option.feedback).toBe('This is the correct answer!');
    });
  });
});
