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

    // Register 'gt' helper for greater than comparison
    this.handlebars.registerHelper('gt', (a: unknown, b: unknown) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a > b;
      }
      return false;
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

    // Register 'add1' helper to convert 0-based index to 1-based
    this.handlebars.registerHelper('add1', (index: unknown) => {
      if (typeof index === 'number') {
        return index + 1;
      }
      return 1;
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

    this.loadPartialsRecursive(partialsDir, '');
  }

  private loadPartialsRecursive(baseDir: string, prefix: string): void {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(baseDir, entry.name);
      if (entry.isDirectory()) {
        // Recursively load partials from subdirectories
        const newPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        this.loadPartialsRecursive(fullPath, newPrefix);
      } else if (entry.name.endsWith('.html') || entry.name.endsWith('.hbs')) {
        // Support both .html and .hbs extensions
        const ext = entry.name.endsWith('.html') ? '.html' : '.hbs';
        const baseName = path.basename(entry.name, ext);
        const partialName = prefix ? `${prefix}/${baseName}` : baseName;
        const partialContent = fs.readFileSync(fullPath, 'utf-8');
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
