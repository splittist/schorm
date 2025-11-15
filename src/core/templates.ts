/**
 * Handlebars template processing
 */

import Handlebars from 'handlebars';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // TODO: Register custom Handlebars helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str.toUpperCase();
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
}

export function renderTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  const engine = new TemplateEngine();
  return engine.render(template, context);
}
