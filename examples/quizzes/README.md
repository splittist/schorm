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

All quiz YAML files should validate against the JSON Schema located at:
`schemas/quiz-schema.json`

## YAML Field Names

Note: The JSON schema uses snake_case for certain fields (e.g., `shuffle_options`, `correct_answers`) to match YAML conventions, while the TypeScript model uses camelCase (e.g., `shuffleOptions`, `correctAnswers`). Your loader should map between these conventions.
