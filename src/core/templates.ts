/**
 * Handlebars template processing
 */

import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str.toUpperCase();
    });

    // Register 'eq' helper for equality comparison
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => {
      return a === b;
    });

    // Register 'contains' helper to check if array contains value
    this.handlebars.registerHelper('contains', (array: unknown, value: unknown) => {
      if (!Array.isArray(array)) {
        return false;
      }
      return array.includes(value);
    });

    // Register 'jsonStringify' helper to convert objects to JSON strings
    this.handlebars.registerHelper('jsonStringify', (obj: unknown) => {
      try {
        return JSON.stringify(obj);
      } catch {
        return '[]';
      }
    });

    // Register 'parseFillBlanks' helper to convert [[blankX]] markers to input fields
    this.handlebars.registerHelper('parseFillBlanks', (text: string, blanks: unknown) => {
      if (!text || typeof text !== 'string') {
        return text;
      }

      // Convert blanks to a map for quick lookup
      const blanksArray = Array.isArray(blanks) ? blanks : [];
      const blanksMap = new Map();
      for (const blank of blanksArray) {
        if (blank && typeof blank === 'object' && 'id' in blank) {
          blanksMap.set(blank.id, blank);
        }
      }

      // Replace [[blankX]] with input fields
      let result = text;
      const pattern = /\[\[([^\]]+)\]\]/g;
      let match;
      const replacements: Array<{ original: string; replacement: string }> = [];

      while ((match = pattern.exec(text)) !== null) {
        const blankId = match[1];
        const blank = blanksMap.get(blankId);

        if (blank) {
          const correctAnswers = Array.isArray(blank.correct_answers)
            ? blank.correct_answers
            : [];
          const caseSensitive = blank.case_sensitive === true;
          const trimWhitespace = blank.trim_whitespace !== false; // default true

          const inputHtml = `<input type="text" 
            class="fill-blank-input" 
            data-blank-id="${blankId}" 
            data-correct-answers="${correctAnswers.join('|||')}" 
            data-case-sensitive="${caseSensitive}" 
            data-trim-whitespace="${trimWhitespace}" 
            aria-label="Fill in the blank for ${blankId}">`;

          replacements.push({
            original: match[0],
            replacement: inputHtml,
          });
        }
      }

      // Apply all replacements
      for (const { original, replacement } of replacements) {
        result = result.replace(original, replacement);
      }

      return new this.handlebars.SafeString(result);
    });
  }

  compile(template: string): HandlebarsTemplateDelegate {
    return this.handlebars.compile(template);
  }

  render(template: string, context: Record<string, unknown>): string {
    const compiled = this.compile(template);
    return compiled(context);
  }

  registerPartial(name: string, partial: string): void {
    this.handlebars.registerPartial(name, partial);
  }

  loadPartials(partialsDir: string): void {
    if (!fs.existsSync(partialsDir)) {
      return;
    }

    const files = fs.readdirSync(partialsDir);
    for (const file of files) {
      if (file.endsWith('.html')) {
        const partialName = path.basename(file, '.html');
        const partialContent = fs.readFileSync(path.join(partialsDir, file), 'utf-8');
        this.registerPartial(partialName, partialContent);
      }
    }
  }
}

export function renderTemplate(template: string, context: Record<string, unknown>): string {
  const engine = new TemplateEngine();
  return engine.render(template, context);
}

export function loadTemplate(templatePath: string): string {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
}
