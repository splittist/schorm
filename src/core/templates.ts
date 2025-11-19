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
