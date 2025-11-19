# Quiz Scoring Implementation Summary

This document summarizes the quiz scoring functionality implemented in schorm v0.3.

## Overview

The quiz scoring system enables browser-side evaluation of quiz responses with full SCORM 2004 integration. It supports five question types and automatically tracks scores, pass/fail status, and completion.

## Components Implemented

### 1. Quiz Model Extension (`src/core/quiz-model.ts`)

Added optional `passing_score` field to Quiz interface:
```typescript
export interface Quiz {
  id: string;
  module: string;
  title: string;
  questions: Question[];
  passing_score?: number; // 0-1 scale, default 0.8
}
```

### 2. Runtime JavaScript (`theme-default/assets/schorm-runtime.js`)

Completely rewritten runtime with the following components:

#### SCORM API Integration
- `findAPI()` - Recursively searches window hierarchy for SCORM API
- `init()` - Initializes SCORM session or enters preview mode
- `setValue()` - Sets SCORM data model elements
- `getValue()` - Retrieves SCORM data
- `commit()` - Commits changes to LMS
- Preview mode detection and localStorage fallback

#### Quiz Scoring Functions
- `collectUserAnswersFromDom()` - Extracts user responses from HTML form
- `evaluateQuiz()` - Scores all questions and computes totals
- `evaluateQuestion()` - Routes to appropriate question-type evaluator
- `evaluateSingleChoice()` - Scores single-choice questions
- `evaluateMultipleResponse()` - Scores multiple-response questions (exact match)
- `evaluateTrueFalse()` - Scores true/false questions
- `evaluateFillBlank()` - Scores fill-blank with partial credit
- `evaluateMatching()` - Scores matching questions (all-or-nothing)
- `checkFillBlankAnswer()` - Handles case sensitivity and whitespace trimming

#### SCORM Integration
- `submitQuizResult()` - Submits scores to SCORM API or localStorage
  - Sets `cmi.score.raw`, `cmi.score.max`, `cmi.score.scaled`
  - Sets `cmi.success_status` (passed/failed)
  - Sets `cmi.completion_status` (completed)
  - Calls `Commit("")`

#### UI Integration
- `checkAnswersComplete()` - Validates all required answers are provided
- `displayResults()` - Shows score and pass/fail status
- `initQuizSubmit()` - Wires up submit button click handler

### 3. Quiz Template Updates (`theme-default/layouts/quiz.html`)

- Embeds quiz model as JSON in `<script type="application/json" id="schorm-quiz-data">`
- Removes `data-correct` attributes from inputs (prevents answer leakage)
- Changes submit button to `type="button"` with `id="schorm-quiz-submit"`
- Updates result container to `id="schorm-quiz-result"`
- Simplifies markup (removed old grading attributes)

### 4. Test Coverage

#### Unit Tests (`test/core/quiz-scoring.test.ts`)
- Validates Quiz model supports `passing_score`
- Verifies runtime code structure and functions
- Checks SCORM API integration points
- Validates answer collection logic
- Tests case sensitivity and whitespace handling
- Confirms UI element IDs and preview mode

#### Integration Tests (`test/commands/quiz-scoring-integration.test.ts`)
- Tests quiz data embedding in HTML
- Verifies submit button and result container
- Confirms no answer leakage in generated HTML
- Tests all question types in comprehensive quiz
- Validates runtime JS inclusion in build output
- Tests optional `passing_score` handling

## Scoring Rules (v0.3)

### Single-Choice & True/False
- Full points if correct, 0 otherwise

### Multiple-Response
- Exact match required (user's selections must match `correct[]` exactly)
- No partial credit in v0.3

### Fill-Blank
- Each blank scored independently
- Case sensitivity configurable per blank
- Whitespace trimming configurable (default: true)
- Multiple acceptable answers supported
- Partial credit: (correct blanks / total blanks) × points

### Matching
- All-or-nothing scoring
- All premise→response pairs must be correct
- No partial credit in v0.3

## SCORM Data Model Elements

The following SCORM 2004 data elements are set:

- `cmi.score.raw` - Total points earned
- `cmi.score.max` - Maximum possible points
- `cmi.score.scaled` - Score as decimal 0-1
- `cmi.success_status` - "passed" or "failed"
- `cmi.completion_status` - "completed"

## Preview Mode

When no SCORM API is detected:
- Sets `isPreviewMode = true`
- Stores results in `localStorage` under key `schorm:quiz:<quizId>`
- Logs all SCORM calls to console
- Displays results normally in UI

## Usage Example

### Quiz YAML
```yaml
id: sample-quiz
module: m1
title: Sample Quiz
passing_score: 0.75  # Optional, defaults to 0.8

questions:
  - id: q1
    type: single-choice
    prompt: What is 2 + 2?
    points: 1
    options:
      - id: a
        text: "3"
      - id: b
        text: "4"
    correct: b
```

### Generated HTML
The template automatically:
1. Embeds quiz JSON in script tag
2. Renders form with appropriate inputs
3. Includes submit button
4. Includes result container
5. Loads runtime JS

### User Flow
1. User answers questions
2. Clicks "Submit Quiz"
3. Runtime validates all questions answered
4. Runtime evaluates responses
5. Runtime submits to SCORM (or localStorage)
6. UI displays score and pass/fail status
7. Submit button is disabled

## Error Handling

- Missing answers: Alert shown, no SCORM submission
- Invalid quiz data: Console error logged
- SCORM API errors: Logged, falls back to preview mode
- localStorage errors: Logged to console

## Browser Compatibility

Uses standard ES5 JavaScript for maximum compatibility:
- No arrow functions
- No const/let (uses var)
- No template literals
- Compatible with IE11+ and all modern browsers

## Testing

Run tests:
```bash
npm test -- test/core/quiz-scoring.test.ts
npm test -- test/commands/quiz-scoring-integration.test.ts
```

Build and test manually:
```bash
schorm init my-quiz
# Create quiz YAML in quizzes/
schorm build
schorm preview
# Open quiz in browser and test submission
```

## Future Enhancements (Out of Scope for v0.3)

- Partial credit for multiple-response beyond exact match
- Partial credit for matching questions
- Per-question feedback display
- Quiz review mode
- Attempt tracking and retries
- Persisting per-question breakdown in `cmi.suspend_data`
- Drag-and-drop and hotspot question types
