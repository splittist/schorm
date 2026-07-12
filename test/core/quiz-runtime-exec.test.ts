// @vitest-environment jsdom
/**
 * Executes the real runtime (theme-default/assets/schorm-runtime.js) against
 * a jsdom DOM and a recording SCORM API stub - unlike the string-pattern
 * tests, these verify actual behavior: partial-credit scoring math, answer
 * save/restore round-trips, the resume flow, and exit handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const runtimeCode = fs.readFileSync(
  path.join(process.cwd(), 'theme-default/assets/schorm-runtime.js'),
  'utf-8'
);

interface ApiStub {
  calls: Array<{ method: string; element?: string; value?: string }>;
  values: Record<string, string>;
  api: Record<string, (...args: string[]) => string>;
}

function makeApiStub(initialValues: Record<string, string> = {}): ApiStub {
  const stub: ApiStub = { calls: [], values: { ...initialValues }, api: {} };
  stub.api = {
    Initialize: () => 'true',
    Terminate: () => {
      stub.calls.push({ method: 'Terminate' });
      return 'true';
    },
    GetValue: (element: string) => {
      stub.calls.push({ method: 'GetValue', element });
      return stub.values[element] ?? '';
    },
    SetValue: (element: string, value: string) => {
      stub.calls.push({ method: 'SetValue', element, value });
      stub.values[element] = String(value);
      return 'true';
    },
    Commit: () => {
      stub.calls.push({ method: 'Commit' });
      return 'true';
    },
  };
  return stub;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function loadRuntime(apiStub: ApiStub): { SchormRuntime: any; SchormQuiz: any } {
  (window as any).API_1484_11 = apiStub.api;
  // jsdom does not implement scrollIntoView (used by displayResults)
  (window.Element.prototype as any).scrollIntoView = () => {};
  // The runtime IIFE reads window/document from scope and auto-initializes
  new Function('window', 'document', 'localStorage', runtimeCode)(
    window,
    document,
    window.localStorage
  );
  return {
    SchormRuntime: (window as any).SchormRuntime,
    SchormQuiz: (window as any).SchormQuiz,
  };
}

const QUIZ_DOM = `
  <form id="quiz-form">
    <div class="question" data-question-id="q1" data-question-type="single-choice">
      <input type="radio" name="question-q1" value="a">
      <input type="radio" name="question-q1" value="b">
    </div>
    <div class="question" data-question-id="q2" data-question-type="multiple-response">
      <input type="checkbox" name="question-q2" value="a">
      <input type="checkbox" name="question-q2" value="b">
      <input type="checkbox" name="question-q2" value="c">
    </div>
    <div class="question" data-question-id="q3" data-question-type="fill-blank">
      <input type="text" class="fill-blank-input" data-blank-id="x">
    </div>
    <div class="question" data-question-id="q4" data-question-type="matching">
      <select class="matching-select" data-premise-id="p1">
        <option value=""></option>
        <option value="r1">R1</option>
        <option value="r2">R2</option>
      </select>
    </div>
    <button type="button" id="schorm-quiz-submit">Submit</button>
  </form>
  <div id="schorm-quiz-result" style="display: none;"></div>
`;

const SAMPLE_QUIZ = {
  id: 'exec-quiz',
  module: 'm1',
  title: 'Exec Quiz',
  passing_score: 0.5,
  questions: [
    {
      id: 'q1',
      type: 'single-choice',
      prompt: 'Pick',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      correct: 'a',
    },
    {
      id: 'q2',
      type: 'multiple-response',
      prompt: 'Pick some',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
      ],
      correct: ['a', 'c'],
    },
    {
      id: 'q3',
      type: 'fill-blank',
      prompt: 'Fill',
      text: 'X is [[x]].',
      blanks: [{ id: 'x', correct_answers: ['1'] }],
    },
    {
      id: 'q4',
      type: 'matching',
      prompt: 'Match',
      premises: [{ id: 'p1', text: 'P1' }],
      responses: [
        { id: 'r1', text: 'R1' },
        { id: 'r2', text: 'R2' },
      ],
      correct_pairs: [{ premise: 'p1', response: 'r1' }],
    },
  ],
};

function quizPageDom(): string {
  return (
    `<script type="application/json" id="schorm-quiz-data">${JSON.stringify(SAMPLE_QUIZ)}</script>` +
    QUIZ_DOM
  );
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.localStorage.clear();
  delete (window as any).SchormRuntime;
  delete (window as any).SchormQuiz;
});

describe('partial-credit scoring', () => {
  const question = {
    id: 'mr',
    type: 'multiple-response',
    prompt: 'p',
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'd', text: 'D' },
    ],
    correct: ['a', 'b', 'c'],
  };

  it('stays all-or-nothing without a scoring config', () => {
    const { SchormQuiz } = loadRuntime(makeApiStub());
    const partial = SchormQuiz.evaluateMultipleResponse(question, ['a', 'b'], 3);
    expect(partial).toEqual({ correct: false, score: 0, maxScore: 3 });
  });

  it('awards proportional credit in partial mode without params', () => {
    const { SchormQuiz } = loadRuntime(makeApiStub());
    const q = { ...question, scoring: { mode: 'partial' } };
    const result = SchormQuiz.evaluateMultipleResponse(q, ['a', 'b'], 3);
    // 2 of 3 correct, perCorrect defaults to points/totalCorrect = 1
    expect(result.score).toBe(2);
    expect(result.correct).toBe(false);
  });

  it('honors explicit perCorrect/penaltyPerIncorrect and clamps at minScore', () => {
    const { SchormQuiz } = loadRuntime(makeApiStub());
    const q = {
      ...question,
      scoring: { mode: 'partial', partial: { perCorrect: 1, penaltyPerIncorrect: 0.5 } },
    };
    // 2 correct (a, b) + 1 incorrect (d): 2*1 - 1*0.5 = 1.5
    expect(SchormQuiz.evaluateMultipleResponse(q, ['a', 'b', 'd'], 3).score).toBe(1.5);
    // 0 correct + 1 incorrect would go negative: clamped to default minScore 0
    expect(SchormQuiz.evaluateMultipleResponse(q, ['d'], 3).score).toBe(0);
  });

  it('never exceeds the question points', () => {
    const { SchormQuiz } = loadRuntime(makeApiStub());
    const q = {
      ...question,
      scoring: { mode: 'partial', partial: { perCorrect: 5 } },
    };
    expect(SchormQuiz.evaluateMultipleResponse(q, ['a', 'b', 'c'], 3).score).toBe(3);
  });

  it('gives full credit and correct=true for a perfect partial-mode answer', () => {
    const { SchormQuiz } = loadRuntime(makeApiStub());
    const q = { ...question, scoring: { mode: 'partial' } };
    const result = SchormQuiz.evaluateMultipleResponse(q, ['a', 'b', 'c'], 3);
    expect(result).toEqual({ correct: true, score: 3, maxScore: 3 });
  });

  it('scores matching partially per pair, not penalizing unanswered premises', () => {
    const { SchormQuiz } = loadRuntime(makeApiStub());
    const q = {
      id: 'match',
      type: 'matching',
      prompt: 'p',
      premises: [
        { id: 'p1', text: '1' },
        { id: 'p2', text: '2' },
        { id: 'p3', text: '3' },
      ],
      responses: [
        { id: 'r1', text: 'a' },
        { id: 'r2', text: 'b' },
        { id: 'r3', text: 'c' },
      ],
      correct_pairs: [
        { premise: 'p1', response: 'r1' },
        { premise: 'p2', response: 'r2' },
        { premise: 'p3', response: 'r3' },
      ],
      scoring: { mode: 'partial', partial: { perCorrect: 1, penaltyPerIncorrect: 1 } },
    };
    // p1 right, p2 wrong (penalized), p3 unanswered (not penalized): 1 - 1 = 0...
    // then + nothing for p3 -> 0? No: 1 correct*1 - 1 incorrect*1 = 0
    expect(SchormQuiz.evaluateMatching(q, { p1: 'r1', p2: 'r3' }, 3).score).toBe(0);
    // p1+p2 right, p3 unanswered: 2*1 = 2, no penalty for the blank
    expect(SchormQuiz.evaluateMatching(q, { p1: 'r1', p2: 'r2', p3: '' }, 3).score).toBe(2);
  });
});

describe('answer save/restore round-trip', () => {
  it('restoreAnswers(collect()) reproduces the same answers', () => {
    document.body.innerHTML = QUIZ_DOM;
    const { SchormQuiz } = loadRuntime(makeApiStub());

    // Fill in every question type
    (document.querySelector('input[name="question-q1"][value="b"]') as HTMLInputElement).checked =
      true;
    (document.querySelector('input[name="question-q2"][value="a"]') as HTMLInputElement).checked =
      true;
    (document.querySelector('input[name="question-q2"][value="c"]') as HTMLInputElement).checked =
      true;
    (document.querySelector('.fill-blank-input') as HTMLInputElement).value = 'hello';
    (document.querySelector('.matching-select') as HTMLSelectElement).value = 'r2';

    const collected = SchormQuiz.collectUserAnswersFromDom();
    expect(collected).toEqual({
      q1: 'b',
      q2: ['a', 'c'],
      q3: { x: 'hello' },
      q4: { p1: 'r2' },
    });

    // Wipe the form, restore, and collect again
    document
      .querySelectorAll('input[type="radio"], input[type="checkbox"]')
      .forEach((el) => ((el as HTMLInputElement).checked = false));
    (document.querySelector('.fill-blank-input') as HTMLInputElement).value = '';
    (document.querySelector('.matching-select') as HTMLSelectElement).value = '';

    SchormQuiz.restoreAnswers(collected);
    expect(SchormQuiz.collectUserAnswersFromDom()).toEqual(collected);
  });
});

describe('suspend/resume flow', () => {
  it('saves answers to cmi.suspend_data when the form changes', () => {
    document.body.innerHTML = quizPageDom();
    const stub = makeApiStub();
    loadRuntime(stub);

    const radio = document.querySelector(
      'input[name="question-q1"][value="a"]'
    ) as HTMLInputElement;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));

    const write = stub.calls.find(
      (c) => c.method === 'SetValue' && c.element === 'cmi.suspend_data'
    );
    expect(write).toBeDefined();
    expect(JSON.parse(write!.value!)).toEqual({ answers: { q1: 'a', q2: [], q3: { x: '' }, q4: { p1: '' } } });
  });

  it('restores saved answers on load', () => {
    document.body.innerHTML = quizPageDom();
    const stub = makeApiStub({
      'cmi.entry': 'resume',
      'cmi.suspend_data': JSON.stringify({ answers: { q1: 'b', q2: ['a'], q3: { x: '42' } } }),
    });
    loadRuntime(stub);

    expect(
      (document.querySelector('input[name="question-q1"][value="b"]') as HTMLInputElement).checked
    ).toBe(true);
    expect(
      (document.querySelector('input[name="question-q2"][value="a"]') as HTMLInputElement).checked
    ).toBe(true);
    expect((document.querySelector('.fill-blank-input') as HTMLInputElement).value).toBe('42');
  });

  it('re-shows results and locks submission after a submitted attempt', () => {
    document.body.innerHTML = quizPageDom();
    const stub = makeApiStub({
      'cmi.entry': 'resume',
      'cmi.suspend_data': JSON.stringify({
        answers: { q1: 'a' },
        result: { totalScore: 4, maxScore: 4, scaledScore: 1, passed: true },
      }),
    });
    loadRuntime(stub);

    const submit = document.getElementById('schorm-quiz-submit') as HTMLButtonElement;
    const results = document.getElementById('schorm-quiz-result') as HTMLElement;
    expect(submit.disabled).toBe(true);
    expect(results.style.display).toBe('block');
    expect(results.textContent).toContain('Passed');
  });
});

describe('exit handling', () => {
  it('reports cmi.exit=suspend and terminates when leaving before completion', () => {
    document.body.innerHTML = quizPageDom();
    const stub = makeApiStub();
    loadRuntime(stub);

    window.dispatchEvent(new Event('pagehide'));

    const exitWrite = stub.calls.find(
      (c) => c.method === 'SetValue' && c.element === 'cmi.exit'
    );
    expect(exitWrite?.value).toBe('suspend');
    expect(stub.calls.some((c) => c.method === 'Terminate')).toBe(true);
  });

  it('reports a normal exit after completion, and only handles exit once', () => {
    document.body.innerHTML = '';
    const stub = makeApiStub();
    const { SchormRuntime } = loadRuntime(stub);

    SchormRuntime.markLessonViewed('lesson-1');
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('beforeunload'));

    const exitWrites = stub.calls.filter(
      (c) => c.method === 'SetValue' && c.element === 'cmi.exit'
    );
    expect(exitWrites).toHaveLength(1);
    expect(exitWrites[0].value).toBe('');
    expect(stub.calls.filter((c) => c.method === 'Terminate')).toHaveLength(1);
  });
});
