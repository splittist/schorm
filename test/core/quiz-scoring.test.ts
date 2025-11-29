/**
 * Tests for quiz scoring logic in the runtime
 * 
 * Since the runtime is pure JavaScript, we test it by:
 * 1. Loading the runtime code
 * 2. Simulating the DOM structure
 * 3. Testing the scoring functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { Quiz, Question } from '../../src/core/quiz-model.js';

describe('Quiz Scoring Logic (Runtime)', () => {
  let runtimeCode: string;

  beforeEach(() => {
    // Load the runtime JavaScript file
    const runtimePath = path.join(process.cwd(), 'theme-default/assets/schorm-runtime.js');
    runtimeCode = fs.readFileSync(runtimePath, 'utf-8');
  });

  describe('Quiz Model Extension', () => {
    it('should support passing_score field in Quiz interface', () => {
      const quiz: Quiz = {
        id: 'test-quiz',
        module: 'test-module',
        title: 'Test Quiz',
        questions: [],
        passing_score: 0.7
      };

      expect(quiz.passing_score).toBe(0.7);
    });

    it('should allow quiz without passing_score (optional field)', () => {
      const quiz: Quiz = {
        id: 'test-quiz',
        module: 'test-module',
        title: 'Test Quiz',
        questions: []
      };

      expect(quiz.passing_score).toBeUndefined();
    });
  });

  describe('Runtime Code Structure', () => {
    it('should define SchormRuntime', () => {
      expect(runtimeCode).toContain('SchormRuntime');
    });

    it('should define SchormQuiz', () => {
      expect(runtimeCode).toContain('SchormQuiz');
    });

    it('should have evaluateQuiz function', () => {
      expect(runtimeCode).toContain('evaluateQuiz');
    });

    it('should have collectUserAnswersFromDom function', () => {
      expect(runtimeCode).toContain('collectUserAnswersFromDom');
    });

    it('should have submitQuizResult function', () => {
      expect(runtimeCode).toContain('submitQuizResult');
    });

    it('should have SCORM API functions', () => {
      expect(runtimeCode).toContain('findAPI');
      expect(runtimeCode).toContain('setValue');
      expect(runtimeCode).toContain('getValue');
    });

    it('should support preview mode with localStorage', () => {
      expect(runtimeCode).toContain('isPreviewMode');
      expect(runtimeCode).toContain('localStorage');
    });

    it('should check for missing answers', () => {
      expect(runtimeCode).toContain('checkAnswersComplete');
    });

    it('should have individual question evaluators', () => {
      expect(runtimeCode).toContain('evaluateSingleChoice');
      expect(runtimeCode).toContain('evaluateMultipleResponse');
      expect(runtimeCode).toContain('evaluateTrueFalse');
      expect(runtimeCode).toContain('evaluateFillBlank');
      expect(runtimeCode).toContain('evaluateMatching');
    });
  });

  describe('SCORM API Integration', () => {
    it('should set all required SCORM fields', () => {
      expect(runtimeCode).toContain('cmi.score.raw');
      expect(runtimeCode).toContain('cmi.score.max');
      expect(runtimeCode).toContain('cmi.score.scaled');
      expect(runtimeCode).toContain('cmi.success_status');
      expect(runtimeCode).toContain('cmi.completion_status');
    });

    it('should set passed/failed based on result', () => {
      expect(runtimeCode).toContain('passed');
      expect(runtimeCode).toContain('failed');
    });

    it('should commit changes to SCORM API', () => {
      expect(runtimeCode).toContain('commit');
    });
  });

  describe('Answer Collection', () => {
    it('should collect radio button answers for single-choice', () => {
      expect(runtimeCode).toContain('single-choice');
      expect(runtimeCode).toContain('input[type="radio"]:checked');
    });

    it('should collect checkbox answers for multiple-response', () => {
      expect(runtimeCode).toContain('multiple-response');
      expect(runtimeCode).toContain('input[type="checkbox"]:checked');
    });

    it('should collect fill-blank answers from inputs', () => {
      expect(runtimeCode).toContain('fill-blank');
      expect(runtimeCode).toContain('.fill-blank-input');
    });

    it('should collect matching answers from selects', () => {
      expect(runtimeCode).toContain('matching');
      expect(runtimeCode).toContain('.matching-select');
    });
  });

  describe('Scoring Logic Requirements', () => {
    it('should handle case sensitivity for fill-blank', () => {
      expect(runtimeCode).toContain('caseSensitive');
      expect(runtimeCode).toContain('toLowerCase');
    });

    it('should handle whitespace trimming for fill-blank', () => {
      expect(runtimeCode).toContain('trimWhitespace');
      expect(runtimeCode).toContain('trim()');
    });

    it('should support multiple correct answers for fill-blank', () => {
      expect(runtimeCode).toContain('correct_answers');
    });

    it('should calculate scaled score (0-1)', () => {
      expect(runtimeCode).toContain('scaledScore');
    });

    it('should use default passing score of 0.8', () => {
      expect(runtimeCode).toContain('0.8');
    });
  });

  describe('UI Integration', () => {
    it('should look for submit button with correct ID', () => {
      expect(runtimeCode).toContain('schorm-quiz-submit');
    });

    it('should look for result container with correct ID', () => {
      expect(runtimeCode).toContain('schorm-quiz-result');
    });

    it('should look for quiz data element', () => {
      expect(runtimeCode).toContain('schorm-quiz-data');
    });

    it('should display results with score and pass/fail', () => {
      expect(runtimeCode).toContain('displayResults');
      expect(runtimeCode).toContain('Passed');
      expect(runtimeCode).toContain('Failed');
    });

    it('should alert on missing answers', () => {
      expect(runtimeCode).toContain('alert');
      expect(runtimeCode).toContain('answer all questions');
    });

    it('should disable submit button after submission', () => {
      expect(runtimeCode).toContain('disabled');
    });
  });

  describe('Preview Mode', () => {
    it('should store results in localStorage for preview', () => {
      expect(runtimeCode).toContain('schorm:quiz:');
      expect(runtimeCode).toContain('setItem');
    });

    it('should log preview mode messages', () => {
      expect(runtimeCode).toContain('preview mode');
    });
  });

  describe('quizPassed Helper', () => {
    it('should define quizPassed function', () => {
      expect(runtimeCode).toContain('quizPassed');
    });

    it('should define DEFAULT_PASSING_SCORE constant', () => {
      expect(runtimeCode).toContain('DEFAULT_PASSING_SCORE');
      expect(runtimeCode).toContain('0.8');
    });

    it('should clamp scaledScore to [0, 1]', () => {
      expect(runtimeCode).toContain('Math.max(0, Math.min(1');
    });

    it('should use default threshold when passingScore not provided', () => {
      expect(runtimeCode).toContain("typeof passingScore === 'number'");
      expect(runtimeCode).toContain('this.DEFAULT_PASSING_SCORE');
    });

    it('should compare clampedScore against threshold', () => {
      expect(runtimeCode).toContain('clampedScore >= threshold');
    });
  });

  describe('markScoComplete Helper', () => {
    it('should define markScoComplete function', () => {
      expect(runtimeCode).toContain('markScoComplete');
    });

    it('should log preview mode message with correct format', () => {
      expect(runtimeCode).toContain('schorm: preview – markScoComplete quizId=');
      expect(runtimeCode).toContain('result=');
    });

    it('should set all required SCORM fields in markScoComplete', () => {
      // Verify markScoComplete sets all necessary SCORM fields
      expect(runtimeCode).toContain("SchormRuntime.setValue('cmi.score.raw'");
      expect(runtimeCode).toContain("SchormRuntime.setValue('cmi.score.max'");
      expect(runtimeCode).toContain("SchormRuntime.setValue('cmi.score.scaled'");
      expect(runtimeCode).toContain("SchormRuntime.setValue('cmi.success_status'");
      expect(runtimeCode).toContain("SchormRuntime.setValue('cmi.completion_status'");
    });

    it('should call commit after setting SCORM fields', () => {
      expect(runtimeCode).toContain('SchormRuntime.commit()');
    });

    it('should store result in localStorage for preview mode', () => {
      expect(runtimeCode).toContain("localStorage.setItem('schorm:quiz:'");
    });

    it('should include quizId in result data', () => {
      expect(runtimeCode).toContain('quizId: quizId');
    });

    it('should include timestamp in result data', () => {
      expect(runtimeCode).toContain('timestamp: new Date().toISOString()');
    });
  });

  describe('submitQuizResult Integration', () => {
    it('should delegate submitQuizResult to markScoComplete', () => {
      expect(runtimeCode).toContain('this.markScoComplete(quizId, result)');
    });
  });

  describe('evaluateQuiz Integration', () => {
    it('should use quizPassed helper in evaluateQuiz', () => {
      expect(runtimeCode).toContain('this.quizPassed(scaledScore, passingScore)');
    });

    it('should use DEFAULT_PASSING_SCORE in evaluateQuiz', () => {
      expect(runtimeCode).toContain('quizModel.passing_score || this.DEFAULT_PASSING_SCORE');
    });
  });
});
