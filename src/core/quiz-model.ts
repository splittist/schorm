/**
 * Quiz data model and question type definitions
 */

// ============================================================================
// Quiz file structure
// ============================================================================

export interface Quiz {
  id: string;
  module: string;
  title: string;
  questions: Question[];
  // future: passingScore?, tags?, metadata?
}

// ============================================================================
// Question types
// ============================================================================

export type Question =
  | SingleChoiceQuestion
  | MultipleResponseQuestion
  | TrueFalseQuestion
  | FillBlankQuestion
  | MatchingQuestion;
// later: | DragDropQuestion | HotspotQuestion ...

export type QuestionType =
  | 'single-choice'
  | 'multiple-response'
  | 'true-false'
  | 'fill-blank'
  | 'matching';

// ============================================================================
// Shared question base and feedback
// ============================================================================

export interface QuestionBase {
  id: string;
  type: QuestionType;
  prompt: string; // markdown-capable
  points?: number; // default 1
  feedback?: GlobalFeedback;
  tags?: string[]; // future flexibility
}

export interface GlobalFeedback {
  correct?: string;
  incorrect?: string;
  // future: partial?, perBlank?, perPair?
}

// ============================================================================
// Options and scoring
// ============================================================================

export interface Option {
  id: string;
  text: string; // markdown-capable
  feedback?: string;
}

export interface ScoringConfig {
  mode?: 'all-or-nothing' | 'partial';
  partial?: {
    perCorrect?: number;
    penaltyPerIncorrect?: number;
    minScore?: number;
  };
}

// ============================================================================
// Single-choice (MCQ, one correct)
// ============================================================================

export interface SingleChoiceQuestion extends QuestionBase {
  type: 'single-choice';
  options: Option[];
  correct: string; // Option.id
  shuffle_options?: boolean;
  scoring?: ScoringConfig; // probably ignored, but allowed
}

// ============================================================================
// Multiple-response (checkbox-style)
// ============================================================================

export interface MultipleResponseQuestion extends QuestionBase {
  type: 'multiple-response';
  options: Option[];
  correct: string[]; // list of Option.id
  shuffle_options?: boolean;
  scoring?: ScoringConfig;
}

// ============================================================================
// True/False
// ============================================================================

export interface TrueFalseQuestion extends QuestionBase {
  type: 'true-false';
  correct: boolean;
}

// ============================================================================
// Fill-in-the-Blank
// ============================================================================

export interface FillBlankQuestion extends QuestionBase {
  type: 'fill-blank';
  text: string; // e.g. "The capital of France is [[blank1]]."
  blanks: FillBlankSpec[];
}

export interface FillBlankSpec {
  id: string; // must match marker in text
  correct_answers: string[]; // accepted answers
  case_sensitive?: boolean;
  trim_whitespace?: boolean;
  feedback?: GlobalFeedback; // per-blank feedback, optional
}

// ============================================================================
// Matching
// ============================================================================

export interface MatchingQuestion extends QuestionBase {
  type: 'matching';
  premises: MatchingPremise[];
  responses: MatchingResponse[];
  correct_pairs: MatchingPair[]; // mapping premise.id → response.id
  scoring?: ScoringConfig;
}

export interface MatchingPremise {
  id: string;
  text: string;
}

export interface MatchingResponse {
  id: string;
  text: string;
}

export interface MatchingPair {
  premise: string; // premise.id
  response: string; // response.id
}
