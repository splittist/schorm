import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../../src/core/templates.js';

describe('Templates - parseFillBlanks Helper', () => {
  it('should replace single blank marker with input field', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'The capital of France is [[capital]].',
      blanks: [
        {
          id: 'capital',
          correct_answers: ['Paris', 'paris'],
          case_sensitive: false,
          trim_whitespace: true,
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    expect(result).toContain('<input type="text"');
    expect(result).toContain('class="fill-blank-input"');
    expect(result).toContain('data-blank-id="capital"');
    expect(result).toContain('data-correct-answers="Paris|||paris"');
    expect(result).toContain('data-case-sensitive="false"');
    expect(result).toContain('data-trim-whitespace="true"');
    expect(result).not.toContain('[[capital]]');
  });

  it('should replace multiple blank markers with input fields', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'JavaScript was created by [[creator]] in [[year]].',
      blanks: [
        {
          id: 'creator',
          correct_answers: ['Brendan Eich'],
          case_sensitive: true,
          trim_whitespace: true,
        },
        {
          id: 'year',
          correct_answers: ['1995'],
          case_sensitive: false,
          trim_whitespace: true,
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    expect(result).toContain('data-blank-id="creator"');
    expect(result).toContain('data-blank-id="year"');
    expect(result).toContain('data-correct-answers="Brendan Eich"');
    expect(result).toContain('data-correct-answers="1995"');
    expect(result).not.toContain('[[creator]]');
    expect(result).not.toContain('[[year]]');
  });

  it('should handle blanks with multiple correct answers', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'The answer is [[ans]].',
      blanks: [
        {
          id: 'ans',
          correct_answers: ['correct', 'right', 'yes'],
          case_sensitive: false,
          trim_whitespace: true,
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    expect(result).toContain('data-correct-answers="correct|||right|||yes"');
  });

  it('should handle case_sensitive true', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'Enter [[code]].',
      blanks: [
        {
          id: 'code',
          correct_answers: ['ABC'],
          case_sensitive: true,
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    expect(result).toContain('data-case-sensitive="true"');
  });

  it('should default trim_whitespace to true when not specified', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'Enter [[val]].',
      blanks: [
        {
          id: 'val',
          correct_answers: ['value'],
          // trim_whitespace not specified
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    // Should default to true
    expect(result).toContain('data-trim-whitespace="true"');
  });

  it('should handle trim_whitespace false', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'Enter [[val]].',
      blanks: [
        {
          id: 'val',
          correct_answers: ['value'],
          trim_whitespace: false,
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    expect(result).toContain('data-trim-whitespace="false"');
  });

  it('should handle blanks without matching markers in text', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'This has [[blank1]] only.',
      blanks: [
        {
          id: 'blank1',
          correct_answers: ['answer1'],
        },
        {
          id: 'blank2', // This marker doesn't exist in text
          correct_answers: ['answer2'],
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    // Should only replace blank1
    expect(result).toContain('data-blank-id="blank1"');
    expect(result).not.toContain('data-blank-id="blank2"');
    expect(result).not.toContain('[[blank1]]');
  });

  it('should preserve text structure and punctuation', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'The answer is [[ans]], right?',
      blanks: [
        {
          id: 'ans',
          correct_answers: ['yes'],
        },
      ],
    };
    
    const result = engine.render(template, context);
    
    expect(result).toContain('The answer is');
    expect(result).toContain(', right?');
  });

  it('should return original text if text is not a string', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: null,
      blanks: [],
    };
    
    const result = engine.render(template, context);
    
    expect(result).toBe('');
  });

  it('should handle empty blanks array', () => {
    const engine = new TemplateEngine();
    const template = '{{parseFillBlanks text blanks}}';
    
    const context = {
      text: 'Text with [[blank]] that has no definition.',
      blanks: [],
    };
    
    const result = engine.render(template, context);
    
    // Original markers should remain since no blanks are defined
    expect(result).toContain('[[blank]]');
  });
});
