# Example Quiz YAML Files

This directory contains example quiz files demonstrating each question type supported by the quiz schema.

## Question Types

### 1. Single-Choice (single-choice-example.yml)
Multiple-choice question with one correct answer.

### 2. Multiple-Response (multiple-response-example.yml)
Checkbox-style question with multiple correct answers.

### 3. True/False (true-false-example.yml)
Simple boolean question.

### 4. Fill-in-the-Blank (fill-blank-example.yml)
Questions with text containing blank markers `[[blankId]]`.

### 5. Matching (matching-example.yml)
Match premises to responses.

### 6. Mixed Quiz (comprehensive-quiz.yml)
A complete quiz with all question types combined.

## Schema Validation

All quiz YAML files validate against the JSON Schema at `schemas/quiz-schema.json`
(print it with `schorm schema quiz`). The examples carry a
`# yaml-language-server: $schema=...` modeline so editors with the YAML
language server validate them as you type, and the test suite validates them
in CI.

Quizzes may also set a top-level `passing_score` (0–1, default 0.8) — the
score required to pass, reported to the LMS.

## YAML Field Names

All field names are snake_case (`shuffle_options`, `correct_answers`,
`passing_score`) in the YAML files, the JSON schema, and the TypeScript model
alike. No case mapping is needed anywhere.
